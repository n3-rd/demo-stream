import { type RequestHandler } from '@sveltejs/kit';
import { PUBLIC_DAILY_API_KEY, PUBLIC_DAILY_DOMAIN } from '$env/static/public';
import { Actions } from '@sveltejs/kit';

export const load = async ({ locals }) => {
    const isLoggedIn = locals.pb.authStore.isValid;
    const user = locals.pb.authStore.model;
    console.log('Load function called:', { isLoggedIn, user });
    return {
        isLoggedIn,
        user,
    };
};


