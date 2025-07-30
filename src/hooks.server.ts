import cookie from 'cookie';
import { v4 as uuid } from '@lukeed/uuid';
import type { Handle } from '@sveltejs/kit';
import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';
import PocketBase from 'pocketbase';
import { redirect } from '@sveltejs/kit';

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
            session?: string;
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

    // Get session from cookies or wherever you store it
    const session = event.cookies.get('session');

    // Add session to event.locals
    event.locals.session = session;

    // Protected routes pattern - adjust this based on your needs
    const protectedRoutes = /^\/(?:dashboard|admin)/;
    
    if (protectedRoutes.test(event.url.pathname)) {
        // If accessing protected route without session
        if (!session) {
            throw new Response('Unauthorized', { status: 401 });
        }
    }

    // Protected viewroom routes - require viewroom session
    const viewroomRoutes = /^\/viewroom\/(?!login)/;
    
    if (viewroomRoutes.test(event.url.pathname)) {
        const viewroomSession = event.cookies.get('viewroom_session');
        if (!viewroomSession) {
            throw redirect(303, '/viewroom/login');
        }
        
        // Add viewroom user to locals if available
        const viewroomUserCookie = event.cookies.get('viewroom_user');
        if (viewroomUserCookie) {
            try {
                event.locals.viewroomUser = JSON.parse(viewroomUserCookie);
            } catch (e) {
                // Invalid user cookie, redirect to login
                throw redirect(303, '/viewroom/login');
            }
        }
    }

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