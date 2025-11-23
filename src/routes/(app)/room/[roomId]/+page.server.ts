import { error, redirect } from '@sveltejs/kit';
import type { ServerLoad } from './$types';

export const load: ServerLoad = async ({ locals, params, url, cookies }: { locals: App.Locals, params: any, url: URL, cookies: any }) => {
    const roomIdParam = params.roomId;
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

    // Attempt to fetch the room details
    try {
        const roomRecord = await pb.collection('rooms').getFirstListItem(`id = "${roomIdParam}"`);

        // Check if the room is a scheduled meeting
        if (roomRecord.scheduled) {
            const scheduleTime = new Date(roomRecord.schedule_time);
            const currentTime = new Date();
            
            // Calculate time difference in minutes
            const timeDiffMinutes = (scheduleTime.getTime() - currentTime.getTime()) / (1000 * 60);
            
            // Use the room's join_before_minutes, with a minimum of 0
            const joinBeforeMinutes = Math.max(roomRecord.join_before_minutes || 0, 0);
            
            // Strict check: only allow joining within the specified join window
            if (timeDiffMinutes > joinBeforeMinutes) {
                // Too early for the meeting
                return {
                    error: true,
                    scheduledMeeting: true,
                    message: `This meeting is scheduled for ${scheduleTime.toLocaleString()}. Please return at that time.`,
                    scheduledTime: scheduleTime,
                    scheduledRoomId: roomIdParam,
                    join_before_minutes: joinBeforeMinutes,
                    redirectTo: '/'
                };
            }
        }

        // Fetch additional room details
        const expandedRoom = await pb.collection('rooms').getOne(roomIdParam, {
            expand: 'representative,host_content,representative_content'
        });

        // Get the company ID for filtering - use authenticated user's company or room owner's company
        let companyId = null;
        if (isNormalAuth && locals.pb.authStore.model) {
            companyId = locals.pb.authStore.model.id;
        } else if (expandedRoom.owner_company) {
            companyId = expandedRoom.owner_company;
        }

        // Fetch all representatives, filtered by company if available
        let representatives = [];
        if (expandedRoom.representative && expandedRoom.representative.length > 0) {
            let filter = `id IN ("${expandedRoom.representative.join('","')}")`;
            
            // Add company filter if we have a company ID
            if (companyId) {
                filter += ` && company = "${companyId}"`;
            }
            
            representatives = await pb.collection('representatives').getFullList({
                filter,
                sort: '-created',
                expand: 'location'
            });
        }

        return {
            ...expandedRoom,
            expand: expandedRoom.expand,
            representatives,
            authType: authType  // Add this to help with debugging
        };

    } catch (error) {
        console.error('Error loading room:', error);
        
        // Redirect to home page if room not found
        return {
            error: true,
            message: 'Room not found',
            redirectTo: '/'
        };
    }
};

