import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, url }) => {
  
    const user = locals.pb.authStore.model || null;
    const videoId = url.searchParams.get('videoId');

    if (!videoId) {
        throw redirect(302, '/dashboard');
    }

    const video = await locals.pb.collection('room_videos_duplicate').getOne(videoId);

    return {
        user,
        video,
    }
}
