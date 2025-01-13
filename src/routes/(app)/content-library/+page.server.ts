import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.pb.authStore.isValid) {
        redirect(302, '/login');
    }

    const user = locals.pb.authStore.model;

    try {
        // Get all representatives for this company
        const representatives = await locals.pb.collection('representatives').getFullList({
            filter: `company = "${user.id}"`,
            sort: '-created'
        });



        // Get all content owned by this company
        const content = await locals.pb.collection('content_library').getFullList({
            filter: `owner_company = "${user.id}"`,
            sort: '-created',
            expand: 'shared_with'
        });

        return {
            user,
            content,
            representatives
        };
    } catch (err) {
        console.error('Error fetching content:', err);
        return {
            user,
            content: [],
            representatives: []
        };
    }
}; 