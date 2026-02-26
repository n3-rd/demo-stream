import type { RequestHandler } from '@sveltejs/kit';
import type { Locals } from '$types';

function sanitizeStreamName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9._-]/g, '_')
        .replace(/^_+|_+$/g, '');
}

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
    // Check for authentication - allow either normal PocketBase auth or viewroom auth
    const viewroomSession = cookies.get('viewroom_session');
    const viewroomUserCookie = cookies.get('viewroom_user');

    let viewroomUser: any = null;
    let authType = 'none';
    let userId: string | null = null;

    // Check if user is authenticated with PocketBase
    if ((locals as Locals).pb?.authStore.isValid) {
        authType = 'pocketbase';
        userId = (locals as Locals).pb.authStore.model.id;
        viewroomUser = {
            id: (locals as Locals).pb.authStore.model.id,
            login_name: (locals as Locals).pb.authStore.model.username || (locals as Locals).pb.authStore.model.email,
            company: (locals as Locals).pb.authStore.model.company_name || 'Company User',
            email: (locals as Locals).pb.authStore.model.email
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

    // Generate a shorter, cleaner room ID
    const shortId = Math.random().toString(36).substring(2, 10);
    const roomId = `room-${shortId}`;
    const sanitizedUserId = sanitizeStreamName(userId || '');

    try {
        const room = await (locals as Locals).pb.collection('rooms').create({
            room_id: roomId,
            title: videoName,
            video_url: videoUrl,
            host_content: [videoUrl],
            representative_content: [],
            representative: [],
            // Add the user as a host
            host: [sanitizedUserId]
        });

        return new Response(JSON.stringify({
            success: true,
            room
        }), { status: 200 });
    } catch (err) {
        console.error('Error creating room:', err);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to create room'
        }), { status: 500 });
    }
}; 