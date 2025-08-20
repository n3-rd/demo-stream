import { error, redirect } from '@sveltejs/kit';
import type { ServerLoad } from './$types';
import type { Locals } from './$types';

export const load: ServerLoad = async ({ locals, params, url, cookies }: { locals: Locals, params: any, url: URL, cookies: any }) => {
    const roomIdParam = params.roomId;  // Rename to make it clear this is the URL parameter
    const pb = locals.pb;

    // Check for authentication - allow either normal PocketBase auth or viewroom/representative auth
    const isNormalAuth = locals.pb.authStore.isValid;
    const viewroomSession = cookies.get('viewroom_session');
    const viewroomUserCookie = cookies.get('viewroom_user');
    const repSession = cookies.get('rep_session');
    const repUserCookie = cookies.get('rep_user');
    const incomingUid = url.searchParams.get('uid') || '';
    
    let viewroomUser: any = null;
    let representativeUser: any = null;
    let authType = 'none';
    
    if (isNormalAuth) {
        // User is logged in with normal PocketBase auth - allow access
        authType = 'pocketbase';
        viewroomUser = {
            id: locals.pb.authStore.model.id,
            first_name: locals.pb.authStore.model.first_name || locals.pb.authStore.model.username || 'User',
            last_name: locals.pb.authStore.model.last_name || '',
            company: locals.pb.authStore.model.company_name || 'Company User',
            email: locals.pb.authStore.model.email
        };
    } else if (viewroomSession && viewroomUserCookie) {
        // User has viewroom authentication
        try {
            viewroomUser = JSON.parse(viewroomUserCookie);
            authType = 'viewroom';
        } catch (e) {
            const suffix = incomingUid ? `&uid=${encodeURIComponent(incomingUid)}` : '';
            throw redirect(303, `/viewroom/login?room=${params.roomId}${suffix}`);
        }
    } else if (repSession && repUserCookie) {
        // Representative authenticated via rep cookies
        try {
            representativeUser = JSON.parse(repUserCookie);
            authType = 'representative';
        } catch (e) {
            // If rep cookie malformed, fall back to viewroom login
            const suffix = incomingUid ? `&uid=${encodeURIComponent(incomingUid)}` : '';
            throw redirect(303, `/viewroom/login?room=${params.roomId}${suffix}`);
        }
    } else if (url.searchParams.get('repid')) {
        // When repid is present, try to fetch representative details and set cookies
        try {
            const representativeId = url.searchParams.get('repid');
            const representative = await pb.collection('representatives').getOne(representativeId);
            
            // Prepare representative session data
            const repSession = JSON.stringify({ 
                id: representative.id, 
                email: representative.email, 
                name: representative.name || `${representative.first_name} ${representative.last_name}`.trim(),
                firstName: representative.first_name,
                lastName: representative.last_name,
                company: representative.company 
            });

            // Set session token and user data cookies
            cookies.set('rep_session', representativeId, {
                path: '/',
                httpOnly: true,
                sameSite: 'strict',
                maxAge: 60 * 60 * 8  // 8 hours
            });
            cookies.set('rep_user', repSession, {
                path: '/',
                httpOnly: false,
                sameSite: 'strict',
                maxAge: 60 * 60 * 8  // 8 hours
            });

            authType = 'representative';
        } catch (error) {
            console.error('Failed to set representative cookies:', error);
            // Fall back to anonymous access
            authType = 'anonymous';
        }
    } else {
        // Allow anonymous access (no redirect)
        authType = 'anonymous';
    }

    try {
        // Try to find the scheduled room by room_id
        const scheduledRooms = await pb.collection('scheduled_rooms').getList(1, 1, {
            filter: `room_id = "${roomIdParam}" && scheduled = true`
        });
        
        // If this is a scheduled room
        if (scheduledRooms.items.length > 0) {
            const scheduledRoom = scheduledRooms.items[0];
            const scheduleTime = new Date(scheduledRoom.schedule_time);
            const currentTime = new Date();
            
            // Calculate time difference in minutes
            const timeDiffMinutes = (scheduleTime.getTime() - currentTime.getTime()) / (1000 * 60);
            
            // Allow entry 5 minutes before scheduled time
            const joinBeforeMinutes = scheduledRoom.join_before_minutes || 5;
            
            if (timeDiffMinutes > joinBeforeMinutes) {
                // Too early for the meeting
                const formattedDate = scheduleTime.toLocaleString();
                return {
                    error: true,
                    message: `This meeting is scheduled for ${formattedDate}. Please return at that time.`,
                    scheduledTime: scheduleTime,
                    scheduledRoomId: roomIdParam, // Add the room ID for WebRTC
                    user: locals.user
                };
            }
            
            // Meeting is available, proceed with all meeting data
            return {
                scheduledRoom,
                viewroomUser,
                authType,
                isViewroomAuthenticated: true,
                // Other room data...
            };
        }
        
        // check if the room is active
        const roomRecord = await pb.collection('rooms').getFirstListItem(`id = "${params.roomId}"`);
        if (!roomRecord.is_active) {
            throw redirect(303, '/');
        }

        const representativeId = url.searchParams.get('repid');
        const user = locals.pb.authStore.model;

        // If there's a representative ID in the URL, handle representative access
        if (representativeId) {
            try {
                // Get the representative from the representatives collection with expanded fields
                const representative = await pb.collection('representatives').getOne(representativeId, {
                    expand: 'connected_content'
                });
                
                // Get the room with expanded relations
                const roomRecords = await pb.collection('rooms').getFullList({
                    filter: `id = "${params.roomId}"`,
                    expand: 'representative,host_content,representative_content,selected_video'
                });

                if (!roomRecords.length) {
                    console.log('Room not found line 38');
                    throw redirect(303, '/');
                }

                const locations = await pb.collection('locations').getFullList({
                    filter: `owner_company = "${locals.user?.id}"`,
                    sort: '-created'
                });

                const room = roomRecords[0];

                // Verify the representative has access to this room
                if (!room.representative || !room.representative.includes(representativeId)) {
                    console.log('Representative does not have access to this room line 46');
                    throw redirect(303, '/');
                }

                // Return data with representative info
                return {
                    user: null,
                    viewroomUser,
                    authType,
                    isViewroomAuthenticated: true,
                    representatives: room.expand?.representative || [],
                    users: [],
                    roomId: [room],
                    videoRepresentativesInfo: room.expand?.representative || [],
                    representativeName: representative.name,
                    isRepresentative: true,
                    locations
                };
            } catch (error) {
                console.error('Error handling representative access line 61:', error);
                throw redirect(303, '/');
            }
        } else if (representativeUser) {
            // Representative authenticated by cookie (no repid in URL)
            try {
                // Fetch representative to ensure it exists and for any expanded info
                const representative = await pb.collection('representatives').getOne(representativeUser.id, {
                    expand: 'connected_content'
                });

                // Get the room with expanded relations
                const roomRecords = await pb.collection('rooms').getFullList({
                    filter: `id = "${params.roomId}"`,
                    expand: 'representative,host_content,representative_content,selected_video'
                });

                if (!roomRecords.length) {
                    console.log('Room not found for representative cookie access');
                    throw redirect(303, '/');
                }

                const room = roomRecords[0];

                // Verify the representative has access to this room
                if (!room.representative || !room.representative.includes(representativeUser.id)) {
                    console.log('Representative (cookie) does not have access to this room');
                    throw redirect(303, '/');
                }

                return {
                    user: null,
                    viewroomUser,
                    authType,
                    isViewroomAuthenticated: true,
                    representatives: room.expand?.representative || [],
                    users: [],
                    roomId: [room],
                    videoRepresentativesInfo: room.expand?.representative || [],
                    representativeName: representative.name || representativeUser.name || 'Representative',
                    isRepresentative: true
                };
            } catch (error) {
                console.error('Error handling cookie-based representative access:', error);
                throw redirect(303, '/');
            }
        }

        // Regular room access
        const roomRecords = await pb.collection('rooms').getFullList({
            filter: `id = "${params.roomId}"`,
            expand: 'representative,host_content,representative_content,selected_video'
        });

        if (!roomRecords.length) {
            console.log('Room not found line 74');
            throw redirect(303, '/');
        }

        const room = roomRecords[0];
        const representatives = room.expand?.representative || [];
        const users = user ? await pb.collection('users').getFullList() : [];

        const hostUserId = url.searchParams.get('hostUserId');
        
        // If a host user is specified, add them to the room's host list
        if (hostUserId) {
            try {
                // Check if the user is already a host
                const isAlreadyHost = room.host && room.host.includes(hostUserId);
                
                if (!isAlreadyHost) {
                    // Update the room to add the host
                    await pb.collection('rooms').update(room.id, {
                        host: [...(room.host || []), hostUserId]
                    });
                    
                    // Refresh the room data
                    room.host = [...(room.host || []), hostUserId];
                }
            } catch (err) {
                console.error('Failed to add host to room:', err);
            }
        }

        console.log('Room data loaded:', {
            id: room.id,
            hasHostContent: !!room.host_content,
            hasRepContent: !!room.representative_content,
            expandedData: room.expand
        });

        return {
            user: user || null,
            viewroomUser,
            authType,
            isViewroomAuthenticated: true,
            representatives,
            users,
            roomId: [room],
            videoRepresentativesInfo: representatives,
            isRepresentative: false,
        };
    } catch (error) {
        console.error('Error checking scheduled room:', error);
        return {
            error: true,
            message: 'Error checking room schedule. Please try again.'
        };
    }
};

