import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
    const user = locals.pb.authStore.model;

    if (!user) {
        throw redirect(302, '/login');
    }

    if (!user.superuser) {
        throw redirect(302, '/dashboard');
    }

    return { user };
};