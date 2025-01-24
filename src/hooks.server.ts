import cookie from 'cookie';
import { v4 as uuid } from '@lukeed/uuid';
import type { Handle } from '@sveltejs/kit';
import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';
import PocketBase from 'pocketbase';

// Define the User type
interface User {
    id: string;
    email: string;
    name?: string;
}

// Extend Locals type
declare global {
    namespace App {
        interface Locals {
            pb: PocketBase;
            user: User | null;
            userid: string;
        }
    }
}

export const handle: Handle = async ({ event, resolve }) => {
    const request = event.request;
    const cookies = cookie.parse(request.headers.get('cookie') || '');

    // Add CORS handling for API routes
    if (event.url.pathname.startsWith('/api')) {
        if (event.request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': '*',
                }
            });
        }
    }

    // Initialize PocketBase and load auth store from cookies
    event.locals.pb = new PocketBase(PUBLIC_POCKETBASE_INSTANCE);
    event.locals.pb.authStore.loadFromCookie(request.headers.get('cookie') || '');

    // Set user if auth store is valid
    event.locals.user = event.locals.pb.authStore.isValid ? event.locals.pb.authStore.model as User : null;

    // Set user ID if not present
    event.locals.userid = cookies.userid || uuid();

    // Handle _method query parameter by creating a new request
    let finalRequest = request;
    if (event.url.searchParams.has('_method')) {
        const method = event.url.searchParams.get('_method')!.toUpperCase();
        finalRequest = new Request(request.url, {
            method,
            headers: request.headers,
            body: request.body
        });
        event.request = finalRequest;
    }

    const response = await resolve(event);

    // Set cookies for user ID and PocketBase auth store
    if (!cookies.userid) {
        response.headers.set('set-cookie', cookie.serialize('userid', event.locals.userid, {
            path: '/',
            httpOnly: true,
            maxAge: 1800 // 30 minutes in seconds
        }));
    }

    // TODO: secure before deployment
    response.headers.append('set-cookie', event.locals.pb.authStore.exportToCookie({ secure: false, maxAge: 1800 }));

    // Add CORS headers to API responses
    if (event.url.pathname.startsWith('/api')) {
        response.headers.append('Access-Control-Allow-Origin', '*');
    }

    return response;
};