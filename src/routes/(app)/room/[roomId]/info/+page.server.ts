import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    if (!locals.pb.authStore.isValid) {
        throw error(401, 'Unauthorized');
    }

    const { roomId } = params;
    const user = locals.pb.authStore.model;

    try {
        // Fetch the room with expanded relations
        const room = await locals.pb.collection('rooms').getOne(roomId, {
            expand: 'representative,host_content,representative_content'
        });

        // Fetch all host content
        const hostContent = await locals.pb.collection('content_library').getFullList({
            filter: `owner_company = "${user.id}" && library_type ?~ "host"`,
            sort: '-created'
        });

        // Fetch all representative content
        const representativeContent = await locals.pb.collection('content_library').getFullList({
            filter: `owner_company = "${user.id}" && library_type ?~ "representative"`,
            sort: '-created'
        });

        // Fetch all representatives
        const representatives = await locals.pb.collection('representatives').getFullList({
            filter: `company = "${user.id}" && is_active = true`,
            sort: '-created',
            expand: 'location'
        });

        // Fetch all locations
        const locations = await locals.pb.collection('locations').getFullList({
            filter: `owner_company = "${user.id}"`,
            sort: '-created'
        });

        return {
            room,
            hostContent,
            representativeContent,
            representatives,
            locations
        };
    } catch (err) {
        console.error('Error fetching room data:', err);
        throw error(404, 'Room not found');
    }
};

export const actions: Actions = {
    'update-room': async ({ request, params, locals }) => {
        if (!locals.pb.authStore.isValid) {
            throw error(401, 'Unauthorized');
        }

        const { roomId } = params;
        const formData = await request.formData();
        
        const title = formData.get('title')?.toString() || '';
        const selectedVideo = formData.get('selected_video')?.toString() || '';
        const ownerCompany = formData.get('owner_company')?.toString() || '';
        const isActive = formData.has('is_active') ? formData.get('is_active') === 'true' : undefined;
        
        // Parse arrays from comma-separated strings
        const hostContent = formData.get('host_content[]')?.toString().split(',').filter(Boolean) || [];
        const representativeContent = formData.get('representative_content[]')?.toString().split(',').filter(Boolean) || [];
        const representative = formData.get('representative[]')?.toString().split(',').filter(Boolean) || [];

        try {
            // First get the current room to ensure we have all required fields
            const currentRoom = await locals.pb.collection('rooms').getOne(roomId);
            
            // Prepare update data with all required fields
            const updateData: Record<string, any> = {
                title: title || currentRoom.title, // Use current title if not provided
                owner_company: ownerCompany || currentRoom.owner_company, // Use current owner_company if not provided
                selected_video: selectedVideo,
                host_content: hostContent,
                representative_content: representativeContent,
                representative
            };
            
            // Only include is_active if it was provided
            if (isActive !== undefined) {
                updateData.is_active = isActive;
            }

            await locals.pb.collection('rooms').update(roomId, updateData);

            return { success: true };
        } catch (err) {
            console.error('Error updating room:', err);
            return { success: false, error: 'Failed to update room', message: err.message };
        }
    },

    'toggle-active': async ({ locals, params }) => {
        if (!locals.pb) {
            return { error: 'Database connection not available' };
        }

        try {
            // First get the current room to check its status
            const room = await locals.pb.collection('rooms').getOne(params.roomId);
            
            // Toggle the is_active status
            await locals.pb.collection('rooms').update(params.roomId, {
                is_active: !room.is_active
            });

            return { type: 'success' };
        } catch (err) {
            console.error('Error toggling room status:', err);
            return { error: 'Failed to update room status' };
        }
    },

    'toggle-content-active': async ({ request, locals }) => {
        if (!locals.pb.authStore.isValid) {
            return { type: 'error', message: 'Unauthorized' };
        }

        const formData = await request.formData();
        const contentId = formData.get('contentId')?.toString();
        const active = formData.get('active') === 'true';

        if (!contentId) {
            return { type: 'error', message: 'Content ID is required' };
        }

        try {
            // Update the content's active status directly
            await locals.pb.collection('content_library').update(contentId, {
                active: active
            });

            return { 
                type: 'success', 
                message: `Content ${active ? 'activated' : 'deactivated'}`
            };
        } catch (error) {
            console.error('Error toggling content active status:', error);
            return { 
                type: 'error', 
                message: 'Failed to update content status' 
            };
        }
    }
};