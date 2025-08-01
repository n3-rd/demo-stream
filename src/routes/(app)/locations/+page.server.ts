import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.pb.authStore.isValid) {
        throw redirect(303, '/login');
    }

    const user = locals.pb.authStore.model;

    try {
        const locations = await locals.pb.collection('locations').getFullList({
            filter: `owner_company = "${user.id}"`,
            sort: '-created'
        });

        return {
            locations
        };
    } catch (err) {
        console.error('Error fetching locations:', err);
        return {
            locations: []
        };
    }
}; 