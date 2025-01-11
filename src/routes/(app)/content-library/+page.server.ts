import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.pb.authStore.isValid) {
        throw redirect(302, '/login');
    }

    const user = locals.pb.authStore.model;
    
    try {
        // Fetch videos owned by the company
        const videos = await locals.pb.collection('room_videos_duplicate').getFullList({
            filter: `owner_company = "${user.id}"`,
            sort: '-created'
        });

        // Fetch videos shared with representatives of this company
        const sharedVideos = user.representative ? 
            await locals.pb.collection('room_videos_duplicate').getFullList({
                filter: `representatives ?~ "${user.id}"`
            }) : [];

        return {
            user,
            videos,
            sharedVideos
        };
    } catch (error) {
        console.error('Error loading content library:', error);
        return {
            user,
            videos: [],
            sharedVideos: []
        };
    }
}; 