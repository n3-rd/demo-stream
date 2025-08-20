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

            // Carefully parse and reconstruct the URL
            const roomUrl = new URL(`${url.origin}/room/${params.roomId}`);
            
            // Extract and clean up parameters
            const extractParam = (paramName: string) => {
                let param = url.searchParams.get(paramName);
                
                // If param is nested, extract the actual value
                if (param && param.includes('?')) {
                    const match = param.match(new RegExp(`${paramName}=([^&]+)`));
                    return match ? match[1] : null;
                }
                
                return param;
            };

            // Add cleaned parameters
            const repid = extractParam('repid') || representativeId;
            const uid = extractParam('uid');

            // Set parameters cleanly
            roomUrl.searchParams.set('repid', repid);
            if (uid) {
                roomUrl.searchParams.set('uid', uid);
            }

            // If representative exists and has access, but not logged in, require login
            return {
                representative: {
                    id: representative.id,
                    name: representative.name,
                    email: representative.email
                },
                roomUrl: roomUrl.pathname + roomUrl.search,
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
        error: 'No representative ID provided.',
        representative: null,
        roomUrl: `/room/${params.roomId}`
    };
};
