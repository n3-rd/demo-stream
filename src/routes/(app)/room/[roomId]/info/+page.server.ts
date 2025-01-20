import { error } from '@sveltejs/kit';
import { fail } from '@sveltejs/kit';

export const load = async ({ locals, params }) => {
    if (!locals.pb) {
        throw error(500, 'Database connection not available');
    }

    try {
        console.log('Fetching room:', params.roomId);
        
        // Fetch the room with expanded relations
        const room = await locals.pb.collection('rooms').getOne(params.roomId, {
            expand: 'host_content,representative_content,selected_video'
        });
        console.log('Room data:', room);

        if (!room) {
            throw error(404, 'Room not found');
        }

        // Fetch all content from content library
        const allContent = await locals.pb.collection('content_library').getList(1, 100, {
            fields: 'id,title,collectionId,thumbnail,type,file'
        });
        console.log('All content:', allContent.items);

        const data = {
            room: structuredClone(room),
            hostContent: structuredClone(allContent.items),
            representativeContent: structuredClone(allContent.items)
        };
        console.log('Returning data:', data);

        return data;
    } catch (err) {
        console.error('Error loading room data:', err);
        if (err.status === 404) {
            throw error(404, 'Room not found');
        }
        throw error(500, 'Failed to load room data');
    }
};

export const actions = {
    'update-room': async ({ request, locals, params }) => {
        if (!locals.pb) {
            return fail(500, { error: 'Database connection not available' });
        }

        const formData = await request.formData();
        const title = formData.get('title')?.toString();
        const selectedVideo = formData.get('selected_video')?.toString();
        const hostContent = formData.get('host_content[]')?.toString().split(',').filter(Boolean);
        const representativeContent = formData.get('representative_content[]')?.toString().split(',').filter(Boolean);
        const representatives = formData.get('representative[]')?.toString().split(',').filter(Boolean);

        if (!title) {
            return fail(400, { error: 'Title is required' });
        }

        try {
            const data = {
                title,
                selected_video: selectedVideo,
                host_content: hostContent,
                representative_content: representativeContent,
                representatives
            };

            await locals.pb.collection('rooms').update(params.roomId, data);
            return { type: 'success' };
        } catch (err) {
            console.error('Error updating room:', err);
            return fail(500, { error: 'Failed to update room' });
        }
    },

    'toggle-active': async ({ locals, params }) => {
        if (!locals.pb) {
            return fail(500, { error: 'Database connection not available' });
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
            return fail(500, { error: 'Failed to update room status' });
        }
    }
};