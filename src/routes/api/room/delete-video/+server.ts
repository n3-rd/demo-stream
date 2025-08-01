import { json, type RequestHandler } from '@sveltejs/kit';

export const DELETE: RequestHandler = async ({ request, locals }) => {
    if (!locals.pb?.authStore.isValid) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized'
        }), { status: 401 });
    }

    if (!locals.pb.authStore.model?.superuser) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized: Only super users can delete videos',
            status: 403
        }), { status: 403 });
    }

    const formData = await request.formData();
    const videoId = formData.get('videoId') as string;

    try {
        await locals.pb.collection('room_videos').delete(videoId);
        return new Response(JSON.stringify({
            success: true,
            message: 'Video deleted successfully'
        }), { status: 200 });
    } catch (error) {
        console.error('Error deleting video:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to delete video',
            status: 500
        }), { status: 500 });
    }
}; 