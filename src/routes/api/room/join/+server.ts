import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
    console.log('Join room API called');

    // Check for authentication - allow either normal PocketBase auth or viewroom auth
    const isNormalAuth = locals.pb.authStore.isValid;
    const viewroomSession = cookies.get('viewroom_session');
    const viewroomUserCookie = cookies.get('viewroom_user');

    let viewroomUser: any = null;
    let authType = 'none';

    if (isNormalAuth) {
        // User is logged in with normal PocketBase auth - allow access
        authType = 'pocketbase';
        viewroomUser = {
            id: locals.pb.authStore.model.id,
            login_name: locals.pb.authStore.model.username || locals.pb.authStore.model.email,
            company: locals.pb.authStore.model.company_name || 'Company User',
            email: locals.pb.authStore.model.email
        };
    } else if (viewroomSession && viewroomUserCookie) {
        // User has viewroom authentication
        try {
            viewroomUser = JSON.parse(viewroomUserCookie);
            authType = 'viewroom';
        } catch (e) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Invalid viewroom session',
                status: 401
            }), { status: 401 });
        }
    } else {
        // No authentication at all
        return new Response(JSON.stringify({
            success: false,
            message: 'Authentication required',
            status: 401
        }), { status: 401 });
    }

    const formData = await request.formData();
    const roomId = formData.get('roomId') as string;

    try {
        // Find the room in PocketBase
        // Try searching by room_id first (for short URLs), then by primary id
        const room = await locals.pb.collection('rooms').getFirstListItem(`room_id = "${roomId}" || id = "${roomId}"`);

        if (room) {
            console.log('Room found:', room);
            return new Response(JSON.stringify({
                success: true,
                room: {
                    id: room.id,
                    room_id: room.room_id,
                    videoUrl: room.associated_video,
                    videoName: room.associated_video_name
                },
                viewroomUser
            }), { status: 200 });
        } else {
            console.error('Room not found');
            return new Response(JSON.stringify({
                success: false,
                message: 'Room not found',
                status: 404
            }), { status: 404 });
        }
    } catch (error) {
        console.error('Error joining room:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to join room',
            status: 500
        }), { status: 500 });
    }
}; 