import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.pb.authStore.isValid) {
        throw redirect(303, '/login');
    }

    const user = locals.pb.authStore.model;

    try {
        // Fetch all data separately to avoid auto-cancellation issues
        const rooms = await locals.pb.collection('rooms').getFullList({
            filter: `owner_company = "${user.id}"`,
            sort: '-created',
            expand: 'representative,host_content,representative_content'
        });

        const representatives = await locals.pb.collection('representatives').getFullList({
            filter: `company = "${user.id}" && is_active = true`,
            sort: '-created',
            expand: 'location'
        });

        const locations = await locals.pb.collection('locations').getFullList({
            filter: `owner_company = "${user.id}"`,
            sort: '-created'
        });

        const hostContent = await locals.pb.collection('content_library').getFullList({
            filter: `owner_company = "${user.id}" && library_type ?~ "host"`,
            sort: '-created'
        });

        const repContent = await locals.pb.collection('content_library').getFullList({
            filter: `owner_company = "${user.id}" && library_type ?~ "representative"`,
            sort: '-created'
        });

        return {
            rooms,
            representatives,
            locations,
            hostContent,
            repContent
        };
    } catch (err) {
        console.error('Error fetching data:', err);
        return {
            rooms: [],
            representatives: [],
            locations: [],
            hostContent: [],
            repContent: []
        };
    }
};
