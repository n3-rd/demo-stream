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

        // Fetch rooms for representatives in the current company
        const representativeIds = representatives.map(rep => rep.id);
        const rooms = await locals.pb.collection('rooms').getFullList({
            filter: representativeIds.map(id => `representative.id ?= "${id}"`).join(' || '),
            sort: '-created'
        });

        return {
            representatives,
            locations,
            rooms
        };
    } catch (err) {
        console.error('Error fetching data:', err);
        return {
            representatives: [],
            locations: [],
            rooms: []
        };
    }
};