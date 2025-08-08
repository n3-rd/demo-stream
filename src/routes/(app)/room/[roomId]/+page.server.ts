import { json, redirect, type RequestHandler } from '@sveltejs/kit';
import { PUBLIC_DAILY_API_KEY } from '$env/static/public';
import { Actions } from '@sveltejs/kit';
import type { PageServerLoad } from "./$types";
import { error } from '@sveltejs/kit';
import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';
import { pb as globalPb } from '$lib/pocketbase';
import { PUBLIC_APP_URL } from '$env/static/public';

const DAILY_API_KEY = PUBLIC_DAILY_API_KEY as string;
const sanitizeAssociatedVideo = (videoRef: string) => {
    // Remove '/video/' prefix if present
    let sanitizedVideo = videoRef.startsWith('/video/') ? videoRef.slice(7) : videoRef;

    // Remove the last '.mp4' if present
    if (sanitizedVideo.endsWith('.mp4')) {
        sanitizedVideo = sanitizedVideo.slice(0, -4);
    }

    return sanitizedVideo;
}

export const load: PageServerLoad = async ({ locals, params, url, cookies }) => {
    const roomIdParam = params.roomId;  // Rename to make it clear this is the URL parameter
    const pb = globalPb;

    // Check for authentication - allow either normal PocketBase auth or viewroom auth
    const isNormalAuth = locals.pb.authStore.isValid;
    const viewroomSession = cookies.get('viewroom_session');
    const viewroomUserCookie = cookies.get('viewroom_user');
    
    let viewroomUser = null;
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
            throw redirect(303, `/viewroom/login?room=${params.roomId}`);
        }
    } else {
        // No authentication at all - require viewroom login
        throw redirect(303, `/viewroom/login?room=${params.roomId}`);
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
        const roomRecord = await locals.pb.collection('rooms').getFirstListItem(`id = "${params.roomId}"`);
        if (!roomRecord.is_active) {
            throw redirect(303, '/');
        }

        const representativeId = url.searchParams.get('repid');
        const user = locals.pb.authStore.model;

        // If there's a representative ID in the URL, handle representative access
        if (representativeId) {
            try {
                // Get the representative from the representatives collection with expanded fields
                const representative = await locals.pb.collection('representatives').getOne(representativeId, {
                    expand: 'connected_content'
                });
                
                // Get the room with expanded relations
                const roomRecords = await locals.pb.collection('rooms').getFullList({
                    filter: `id = "${params.roomId}"`,
                    expand: 'representative,host_content,representative_content,selected_video'
                });

                if (!roomRecords.length) {
                    console.log('Room not found line 38');
                    throw redirect(303, '/');
                }

                const locations = await locals.pb.collection('locations').getFullList({
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
                    representativeName: representative.name + ' (representative)',
                    isRepresentative: true,
                    locations
                };
            } catch (error) {
                console.error('Error handling representative access line 61:', error);
                throw redirect(303, '/');
            }
        }

        // Regular room access
        const roomRecords = await locals.pb.collection('rooms').getFullList({
            filter: `id = "${params.roomId}"`,
            expand: 'representative,host_content,representative_content,selected_video'
        });

        if (!roomRecords.length) {
            console.log('Room not found line 74');
            throw redirect(303, '/');
        }

        const room = roomRecords[0];
        const representatives = room.expand?.representative || [];
        const users = user ? await locals.pb.collection('users').getFullList() : [];

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

export const actions: Actions = {
    'create-room': async ({ locals, fetch }) => {
        const user = locals.pb.authStore.model;
        const username = user.name;
        const exp = Math.round(Date.now() / 1000) + 60 * 60 * 24;
        const options = {
            properties: {
                exp,
                userName: username,
                enable_adaptive_simulcast: false,
            }
        };

        try {
            const res = await fetch('https://api.daily.co/v1/rooms', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${DAILY_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(options)
            });

            if (res.ok) {
                const room = await res.json();
                return json({
                    success: true,
                    room
                }, { status: 200 });
            } else {
                return json({
                    success: false
                }, { status: res.status });
            }
        } catch (error) {
            return json({
                success: false,
                message: 'something went wrong with the room submit!'
            }, { status: 500 });
        }
    },
    'send-email': async ({ request, locals, params }) => {
        // Get the room ID from params
        const roomId = params.roomId;
        
        // Get form data
        const formData = await request.formData();
        const name = formData.get('name');
        const receipient = formData.get('receipient');
        const url = formData.get('url');
        
        // Extract uid from URL if present
        let uid = '';
        try {
            const urlObj = new URL(url?.toString() || '');
            uid = urlObj.searchParams.get('uid') || '';
        } catch (error) {
            console.error('Error extracting uid from URL:', error);
        }
        
        // Create a proper room link with uid
        const baseUrl = PUBLIC_APP_URL || 'http://localhost:3001';
        const roomLink = `${baseUrl}/room/${roomId}${uid ? `?uid=${uid}` : ''}`;
        
        try {
            // Create email data with updated template
            const emailData = {
                to: receipient,
                subject: `Invitation to join a meeting`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">You've been invited to a meeting</h2>
                        <p>Hello ${name},</p>
                        <p>You have been invited to join a meeting.</p>
                        <p><strong>Room Link:</strong> <a href="${roomLink}">${roomLink}</a></p>
                        <p>Click the link above to join the meeting.</p>
                        <p>Best regards,<br>The Meeting Team</p>
                    </div>
                `
            };
            
            // Send the email using your email service
            // ... email sending code here ...
            
            return {
                status: 200,
                body: { success: true }
            };
        } catch (error) {
            console.error('Error sending email:', error);
            return {
                status: 500,
                body: { success: false, message: 'Failed to send email' }
            };
        }
    },
    'request-quote': async ({ request, locals }) => {
        const formData = await request.formData();
        const first_name = formData.get('first_name');
        const last_name = formData.get('last_name');
        const phone = formData.get('phone');
        const email = formData.get('email');
        const description = formData.get('description');

        const data = {
            first_name,
            last_name,
            phone,
            email,
            description
        };
        await locals.pb.collection('quotes').create(data).then((result) => {
            console.log('Quote request created:', result);
            return {
                status: 200,
                body: { message: 'Quote request created successfully' }
            };
        }).catch((err) => {
            console.error('Failed to create quote request:', err);
            return {
                status: 500,
                body: { error: 'Failed to create quote request' }
            };
        });
    }
};

