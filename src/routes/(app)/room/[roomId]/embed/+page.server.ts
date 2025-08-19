import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
    if (!locals.pb) {
        throw error(500, 'Database connection not available');
    }

    try {
        // Get the room with expanded relations, no authentication required
        const roomId = await locals.pb.collection('rooms').getFullList({
            filter: `id = "${params.roomId}"`,
            expand: 'representative,host_content,representative_content,selected_video'
        });

        if (!roomId.length) {
            throw error(404, 'Room not found');
        }

        const room = roomId[0];

        // Return data for all users
        return {
            room,
            viewroomUser: null,
            authType: 'none',
            isViewroomAuthenticated: false,
            isAnonymous: true
        };
    } catch (err) {
        console.error('Error loading room data:', err);
        throw error(500, 'Failed to load room data');
    }
};

export const actions = {
    joinRoom: async (event) => {
        const formData = await event.request.formData();
        const anonymousUserId = formData.get('anonymousUserId')?.toString() || '';
        const roomId = event.params.roomId;

        // Basic validation
        if (!anonymousUserId || anonymousUserId.length < 3) {
            return {
                status: 400,
                errors: {
                    anonymousUserId: 'User ID must be at least 3 characters long'
                }
            };
        }

        if (anonymousUserId.length > 50) {
            return {
                status: 400,
                errors: {
                    anonymousUserId: 'User ID must be less than 50 characters'
                }
            };
        }

        // Only allow letters, numbers, underscores, and hyphens
        if (!/^[a-zA-Z0-9_-]+$/.test(anonymousUserId)) {
            return {
                status: 400,
                errors: {
                    anonymousUserId: 'User ID can only contain letters, numbers, underscores, and hyphens'
                }
            };
        }

        // Sanitize the anonymous user ID
        const sanitizedUserId = anonymousUserId
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9-_]/g, '_');

        // Return data for client-side navigation
        return {
            type: 'success',
            roomId,
            anonymousUserId: sanitizedUserId
        };
    }
}; 