import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.pb.authStore.isValid) {
        throw error(401, 'Unauthorized');
    }

    const user = locals.pb.authStore.model;

    try {
        let content;
        if (user.representative) {
            // For representatives, fetch content shared with them
            content = await locals.pb.collection('content_library').getFullList({
                filter: `shared_with ?~ "${user.id}"`,
                sort: '-created',
                expand: 'owner_company'
            });
        } else {
            // For companies, fetch their own content
            content = await locals.pb.collection('content_library').getFullList({
                filter: `owner_company = "${user.id}"`,
                sort: '-created'
            });
        }

        return {
            user,
            content
        };
    } catch (err) {
        console.error('Error fetching content:', err);
        return {
            user,
            content: []
        };
    }
}; 