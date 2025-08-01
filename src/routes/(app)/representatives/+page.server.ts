import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.pb.authStore.isValid) {
        throw redirect(303, '/login');
    }

    const user = locals.pb.authStore.model;

    try {
        const representatives = await locals.pb.collection('representatives').getFullList({
            filter: `company = "${user.id}"`,
            sort: '-created',
            expand: 'location'
        });

        const locations = await locals.pb.collection('locations').getFullList({
            filter: `owner_company = "${user.id}"`,
            sort: '-created'
        });

        return {
            representatives,
            locations
        };
    } catch (err) {
        console.error('Error fetching data:', err);
        return {
            representatives: [],
            locations: []
        };
    }
};