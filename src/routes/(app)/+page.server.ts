import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.pb.authStore.model;
    const rooms = await locals.pb.collection('rooms').getFullList();

    if (!user) {
        throw redirect(302, '/login');
    }

    return { user, rooms };
};