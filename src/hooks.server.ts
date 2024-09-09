import cookie from 'cookie';
import { v4 as uuid } from '@lukeed/uuid';
import type { Handle } from '@sveltejs/kit';
import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';
import PocketBase from 'pocketbase';

export const handle: Handle = async ({ event, resolve }) => {
    const request = event.request;
    const cookies = cookie.parse(request.headers.get('cookie') || '');

    // Initialize PocketBase and load auth store from cookies
    event.locals.pb = new PocketBase(PUBLIC_POCKETBASE_INSTANCE);
    event.locals.pb.authStore.loadFromCookie(request.headers.get('cookie') || '');

    // Set user if auth store is valid
    if (event.locals.pb.authStore.isValid) {
        event.locals.user = event.locals.pb.authStore.model;
    }

    // Set user ID if not present
    event.locals['userid'] = cookies.userid || uuid();

    // Handle _method query parameter
    if (event.url.searchParams.has('_method')) {
        event.request.method = event.url.searchParams.get('_method')!.toUpperCase();
    }

    const response = await resolve(event);

    // Set cookies for user ID and PocketBase auth store
    if (!cookies.userid) {
        response.headers.set('set-cookie', cookie.serialize('userid', event.locals.userid, {
            path: '/',
            httpOnly: true
        }));
    }

    // TODO: secure before deployment
    response.headers.append('set-cookie', event.locals.pb.authStore.exportToCookie({ secure: false }));

    return response;
};