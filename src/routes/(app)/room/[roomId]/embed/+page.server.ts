import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
    if (!locals.pb) {
        throw error(500, 'Database connection not available');
    }

    try {
        // Get the room with expanded relations, no auth required
        const roomId = await locals.pb.collection('rooms').getFullList({
            filter: `id = "${params.roomId}"`,
            expand: 'representative,host_content,representative_content,selected_video'
        });

        if (!roomId.length) {
            throw error(404, 'Room not found');
        }

        const room = roomId[0];

        // Return minimal data needed for anonymous access
        return {
            room,
            isAnonymous: true
        };
    } catch (err) {
        console.error('Error loading room data:', err);
        throw error(500, 'Failed to load room data');
    }
}; 