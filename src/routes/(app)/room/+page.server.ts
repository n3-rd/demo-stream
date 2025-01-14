import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.pb.authStore.isValid) {
        throw error(401, 'Unauthorized');
    }

    try {
        const user = locals.pb.authStore.model;
        
        // Fetch rooms owned by the company
        const rooms = await locals.pb.collection('rooms').getFullList({
            filter: `owner_company = "${user.id}"`,
            expand: 'representative,host_content,representative_content',
            sort: '-created'
        });

        // Fetch representatives for the company
        const representatives = await locals.pb.collection('representatives').getFullList({
            filter: `company = "${user.id}" && is_active = true`
        });

        // Fetch content for host and representative libraries
        const hostContent = await locals.pb.collection('content_library').getFullList({
            filter: `owner_company = "${user.id}" && library_type ?~ "host"`
        });

        const repContent = await locals.pb.collection('content_library').getFullList({
            filter: `owner_company = "${user.id}" && library_type ?~ "representative"`
        });

        return {
            rooms,
            representatives,
            hostContent,
            repContent
        };
    } catch (err) {
        console.error('Error:', err);
        throw error(500, 'Failed to load rooms');
    }
};

export const actions: Actions = {
    'create-room': async ({ request, locals }) => {
        if (!locals.pb.authStore.isValid) {
            throw error(401, 'Unauthorized');
        }

        const formData = await request.formData();
        const title = formData.get('title')?.toString();
        const isActive = formData.has('is_active');
        
        // Get the arrays from the form data
        const hostContent = formData.get('host_content[]')?.toString().split(',').filter(Boolean) || [];
        const repContent = formData.get('representative_content[]')?.toString().split(',').filter(Boolean) || [];
        const representatives = formData.get('representative[]')?.toString().split(',').filter(Boolean) || [];

        console.log('Host content:', hostContent);
        console.log('Representative content:', repContent);
        console.log('Representatives:', representatives);

        if (!title) {
            return fail(400, { error: 'Title is required' });
        }

        try {
            const data = {
                title,
                is_active: isActive,
                host_content: hostContent,
                representative_content: repContent,
                representative: representatives,
                owner_company: locals.pb.authStore.model.id
            };

            console.log('Creating room with data:', data);
            
            const record = await locals.pb.collection('rooms').create(data);
            console.log('Created room:', record);

            return { success: true };
        } catch (err) {
            console.error('Error creating room:', err);
            return fail(500, { error: 'Failed to create room' });
        }
    }
};
