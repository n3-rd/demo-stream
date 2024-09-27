import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const load = async ({ locals }) => {
    const user = locals.pb.authStore.model;
    const representatives = await locals.pb.collection('users').getFullList({
        filter: 'representative = true',
    });

    if (!user) {
        throw redirect(302, '/login');
    }

    if (!user.superuser) {
        throw redirect(302, '/dashboard');
    }

    return { user, representatives };
};

export const actions: Actions = {
    createRoom: async ({ request, locals }) => {
        const formData = await request.formData();
        
        const title = formData.get('title') as string;
        const desc = formData.get('desc') as string;
        
        // Handle file uploads
        const video = formData.get('video') as File | null;
        const thumbnail = formData.get('thumbnail') as File | null;
        
        // Handle representatives
        const representativesString = formData.get('representatives') as string;
        const representatives = representativesString ? representativesString.split(',') : [];

        const data = new FormData();
        data.append('title', title);
        data.append('desc', desc);
        if (video) data.append('video', video);
        if (thumbnail) data.append('thumbnail', thumbnail);
        representatives.forEach(rep => data.append('representatives', rep));

        // Optional fields
        const name = formData.get('name');
        const phone = formData.get('phone');
        const email = formData.get('email');
        if (name) data.append('name', name as string);
        if (phone) data.append('phone', phone as string);
        if (email) data.append('email', email as string);

        try {
            const record = await locals.pb.collection('rooms').create(data);
            
            // Redirect to the newly created room or a success page
            return { success: true, roomId: record.id, status: 200 };
        } catch (err) {
            console.error('Error creating room:', err);
            return fail(400, { 
                error: true, 
                message: 'Failed to create room',
                data: Object.fromEntries(formData)  // Use formData instead of data for re-population
            });
        }
    }
};