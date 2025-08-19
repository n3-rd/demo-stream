import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const representativeId = url.searchParams.get('repid');
    console.log('representativeId:', representativeId);

    if (representativeId) {
        try {
            // Get the representative from the representatives collection
            const representative = await locals.pb.collection('representatives').getOne(representativeId);
            console.log('representative:', representative);
            
            // Get the room to verify it exists and check access
            const room = await locals.pb.collection('rooms').getOne(params.roomId);
            console.log('room:', room);

            // Verify the representative has access to this room
            if (!room.representative || !room.representative.includes(representativeId)) {
                console.log('Representative does not have access to this room');
                return {
                    error: 'You do not have permission to access this room.',
                    representative: null,
                    roomUrl: `/room/${params.roomId}`
                };
            }

            // If representative exists and has access, but not logged in, require login
            return {
                representative: {
                    id: representative.id,
                    name: representative.name,
                    email: representative.email
                },
                roomUrl: `/room/${params.roomId}?repid=${representativeId}&uid=${url.searchParams.get('uid') || ''}`,
                error: null
            };
        } catch (error) {
            console.error('Error handling representative access:', error);
            return {
                error: 'Invalid representative invitation.',
                representative: null,
                roomUrl: `/room/${params.roomId}`
            };
        }
    }

    // If no representative ID, show error page
    return {
        error: 'No representative invitation found.',
        representative: null,
        roomUrl: `/room/${params.roomId}`
    };
};
