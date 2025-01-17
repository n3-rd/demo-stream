import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const representativeId = url.searchParams.get('id');
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
                throw redirect(303, `/room/${params.roomId}/representative`);
            }
            else {
                // Redirect to the room with representative name appended
                throw redirect(303, `/room/${params.roomId}?representativeName=${encodeURIComponent(representative.name + ' (representative)')}`);
            }
            

        } catch (error) {
            console.error('Error handling representative access:', error);
            // throw redirect(303, `/room/${params.roomId}/representative`);
            console.log('Error handling representative access:', error);
        }
    }

    // If no representative ID, redirect to the regular room
    throw redirect(303, `/room/${params.roomId}/representative`);
};
