import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
    if (!locals.pb.authStore.isValid) {
        throw error(401, 'Unauthorized');
    }

    const user = locals.pb.authStore.model;

    try {
        // Fetch the video
        const video = await locals.pb.collection('content_library').getOne(params.id, {
            expand: 'owner_company'
        });

        // Check if user has access to the video
        if (video.owner_company !== user.id && !video.shared_with?.includes(user.id)) {
            throw error(403, 'You do not have access to this video');
        }

        // If user is the owner, fetch representatives for sharing
        let representatives = [];
        if (video.owner_company === user.id) {
            representatives = await locals.pb.collection('representatives').getFullList({
                filter: `company = "${user.id}"`,
                sort: '-created'
            });
        }

        return {
            video,
            representatives
        };
    } catch (err) {
        console.error('Error fetching video:', err);
        throw error(404, 'Video not found');
    }
};

export const actions: Actions = {
    shareVideo: async ({ request, locals, params }) => {
        if (!locals.pb.authStore.isValid) {
            throw error(401, 'Unauthorized');
        }

        const user = locals.pb.authStore.model;

        try {
            // Get the video first
            const video = await locals.pb.collection('content_library').getOne(params.id);

            // Check if user is the owner
            if (video.owner_company !== user.id) {
                throw error(403, 'Only the owner can share this video');
            }

            const data = await request.json();
            const { representatives } = data;

            // Update the video with new representatives
            await locals.pb.collection('content_library').update(params.id, {
                shared_with: representatives
            });

            return {
                type: 'success'
            };
        } catch (err) {
            console.error('Error sharing video:', err);
            return fail(400, {
                type: 'error',
                message: 'Failed to share video'
            });
        }
    }
}; 