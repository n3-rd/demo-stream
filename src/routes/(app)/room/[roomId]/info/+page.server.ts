import { error } from '@sveltejs/kit';

export const load = async ({ locals, params }) => {
    if (!locals.pb) {
        throw error(500, 'Database connection not available');
    }

    try {
        console.log('Fetching room:', params.roomId);
        
        // Fetch the room with its content
        const room = await locals.pb.collection('rooms').getOne(params.roomId);
        console.log('Room data:', room);

        if (!room) {
            throw error(404, 'Room not found');
        }

        // Fetch host content details
        const hostContent = await locals.pb.collection('content_library').getList(1, 50, {
            filter: room.host_content?.map(id => `id = "${id}"`).join(' || ') || 'id = ""',
            fields: 'id,title,collectionId,thumbnail,type,file'
        });
        console.log('Host content:', hostContent.items);

        // Fetch representative content details
        const representativeContent = await locals.pb.collection('content_library').getList(1, 50, {
            filter: room.representative_content?.map(id => `id = "${id}"`).join(' || ') || 'id = ""',
            fields: 'id,title,collectionId,thumbnail,type,file'
        });
        console.log('Representative content:', representativeContent.items);

        const data = {
            room: structuredClone(room),
            hostContent: structuredClone(hostContent.items),
            representativeContent: structuredClone(representativeContent.items)
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