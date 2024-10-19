import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const representativeId = url.searchParams.get('id');
    let representative = null;
    let roomUrl = `/room/${params.roomId}`;

    if (representativeId) {
        try {
            representative = await locals.pb.collection('users').getOne(representativeId);
            // Add the representative information to the URL
            roomUrl += `?representativeId=${representativeId}&representativeName=${encodeURIComponent(representative.name)}`;
        } catch (error) {
            console.error('Error fetching representative:', error);
        }
    }

    return {
        representative,
        roomUrl
    };
};
