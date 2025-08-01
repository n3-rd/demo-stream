import { json, type RequestHandler } from '@sveltejs/kit';

function sanitizeStreamName(name: string): string {
    if (!name) return '';
    // First decode any URL encoded characters
    const decodedName = decodeURIComponent(name);
    // Then replace any spaces or special characters with underscores
    return decodedName.replace(/[^a-zA-Z0-9-]/g, '_');
}

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
    // Check for authentication - allow either normal PocketBase auth or viewroom auth
    const viewroomSession = cookies.get('viewroom_session');
    const viewroomUserCookie = cookies.get('viewroom_user');
    
    let viewroomUser: any = null;
    let authType = 'none';
    let userId: string | null = null;
    
    // Check if user is authenticated with PocketBase
    if (locals.pb?.authStore.isValid) {
        authType = 'pocketbase';
        userId = locals.pb.authStore.model.id;
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
            userId = `viewroom_${viewroomUser.id}`;
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
    const videoUrl = formData.get('videoUrl') as string;
    const videoName = formData.get('videoName') as string;

    // Sanitize the userId/anonymousUserId before creating room ID
    const sanitizedUserId = sanitizeStreamName(userId || '');
    const roomId = `room-${Math.random().toString(36).substring(2, 7)}-${sanitizedUserId}`;

    try {
        const room = await locals.pb.collection('rooms').create({
            room_id: roomId,
            associated_video: videoUrl,
            associated_video_name: videoName,
            created_by: userId
        });

        console.log('room:', room);

        return new Response(JSON.stringify({
            success: true,
            room: {
                id: room.id,
                room_id: roomId,
                videoUrl: videoUrl,
                videoName: videoName
            },
            message: 'Room created successfully'
        }), { status: 200 });
    } catch (error) {
        console.error('Error creating room:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to create room',
            status: 500
        }), { status: 500 });
    }
}; 