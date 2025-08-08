import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.pb.authStore.isValid) {
        throw redirect(303, '/login');
    }

    const user = locals.pb.authStore.model;

    try {
        const aiAssistants = await locals.pb.collection('ai_assistants').getFullList({
            sort: '-created'
        });

        const viewrooms = await locals.pb.collection('rooms').getFullList({
            filter: `owner_company = "${user.id}"`,
            sort: '-created'
        });

        return {
            aiAssistants,
            viewrooms
        };
    } catch (err) {
        console.error('Error fetching data:', err);
        return {
            aiAssistants: [],
            viewrooms: []
        };
    }
};