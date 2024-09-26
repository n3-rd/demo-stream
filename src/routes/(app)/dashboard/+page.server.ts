import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.pb.authStore.model;

    if (!user) {
        throw redirect(302, '/login');
    }

    return { user };
};