import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ locals, params }) => {
    const { videoId } = params;

    if (!locals.pb.authStore.model?.superuser) {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        await locals.pb.collection('room_videos').delete(videoId);
        return json({ message: 'Video deleted successfully' });
    } catch (error) {
        console.error('Error deleting video:', error);
        return json({ error: 'Failed to delete video' }, { status: 500 });
    }
};