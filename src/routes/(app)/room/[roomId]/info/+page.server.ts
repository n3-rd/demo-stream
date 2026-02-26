import { error, redirect } from '@sveltejs/kit';

export const load = async ({ locals, params }) => {
    if (!locals.pb.authStore.isValid) {
        throw redirect(303, '/login');
    }

    const user = locals.pb.authStore.model;

    try {
        const room = await locals.pb.collection('rooms').getOne(params.roomId, {
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

        const representativeContent = await locals.pb.collection('content_library').getFullList({
            filter: `owner_company = "${user.id}" && library_type ?~ "representative"`,
            sort: '-created'
        });

        return {
            room,
            representatives,
            locations,
            hostContent,
            representativeContent
        };
    } catch (err) {
        console.error('Error fetching data:', err);
        throw error(500, 'Error fetching data');
    }
};