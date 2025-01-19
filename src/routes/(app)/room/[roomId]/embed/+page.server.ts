import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export async function load({ params, locals }) {
    try {
        // Fetch the room data
        const room = await locals.pb.collection('rooms').getOne(params.roomId, {
            expand: 'selected_video,host_content,representative_content,representative'
        });

        return {
            room
        };
    } catch (error) {
        console.error('Error loading room data:', error);
        return {
            room: null
        };
    }
}

export const actions = {
    'join-room': async ({ request }) => {
        const data = await request.formData();
        const anonymousUserId = data.get('anonymousUserId');

        if (!anonymousUserId || typeof anonymousUserId !== 'string' || anonymousUserId.length < 3) {
            return fail(400, { error: 'Invalid user ID' });
        }

        return {
            success: true
        };
    }
} satisfies Actions; 