import type { PageServerLoad } from './$types';
import { Actions, redirect } from '@sveltejs/kit';
import { PUBLIC_DAILY_API_KEY, PUBLIC_DAILY_DOMAIN } from '$env/static/public';


export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.pb.authStore.model;
    const roomVideos = await locals.pb.collection('room_videos_duplicate').getFullList();
    const users = await locals.pb.collection('users').getFullList();

    if (!user) {
        throw redirect(302, '/login');
    }

    return { user, users };
};