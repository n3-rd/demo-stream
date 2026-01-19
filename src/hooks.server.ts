import cookie from 'cookie';
import { v4 as uuid } from '@lukeed/uuid';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { pb } from '$lib/pocketbase';
import { initLogger } from '$lib/logger';

// Initialize logger on server startup
if (typeof window === 'undefined') {
	initLogger({
		logFile: 'logs/app.txt',
		maxLines: 10000,
		maxSizeMB: 10,
		enableConsole: true
	});
}

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
            pb: typeof pb;
            user: User | null;
            userid: string;
            session?: string;
        }
    }
}

export const handle: Handle = async ({ event, resolve }) => {
    const request = event.request;
    const cookies = cookie.parse(request.headers.get('cookie') || '');
    const origin = request.headers.get('origin') || '';

    // Add CORS handling for API routes
    if (event.url.pathname.startsWith('/api')) {
        if (event.request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                    'Access-Control-Allow-Origin': origin || '*',
                    'Access-Control-Allow-Headers': '*',
                    'Access-Control-Allow-Credentials': 'true',
                    Vary: 'Origin'
                }
            });
        }
    }

    // Initialize DB shim and load auth store from cookies
    // IMPORTANT: Clear any previous global auth state so it doesn't leak across requests
    pb.authStore.clear();
    event.locals.pb = pb;
    event.locals.pb.authStore.loadFromCookie(request.headers.get('cookie') || '');

    // Set user if auth store is valid
    event.locals.user = event.locals.pb.authStore.isValid ? (event.locals.pb.authStore.model as User) : null;

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

    // Remove viewroom route protection
    // const viewroomRoutes = /^\/viewroom\/(?!login)/;
    
    // if (viewroomRoutes.test(event.url.pathname)) {
    //     const viewroomSession = event.cookies.get('viewroom_session');
    //     if (!viewroomSession) {
    //         throw redirect(303, '/viewroom/login');
    //     }
        
    //     // Add viewroom user to locals if available
    //     const viewroomUserCookie = event.cookies.get('viewroom_user');
    //     if (viewroomUserCookie) {
    //         try {
    //             event.locals.viewroomUser = JSON.parse(viewroomUserCookie);
    //         } catch (e) {
    //             // Invalid user cookie, redirect to login
    //             throw redirect(303, '/viewroom/login');
    //         }
    //     }
    // }

    // Auto-clear rep cookies when outside allowed paths to prevent leakage
    const isAllowedForTransientSessions = (
        event.url.pathname.startsWith('/representative') ||
        event.url.pathname.startsWith('/api/representative') ||
        event.url.pathname.startsWith('/api/stream') ||
        event.url.pathname.startsWith('/api/files')
    );

    const hadRep = !!event.cookies.get('rep_session');

    const response = await resolve(event);

    // Set cookies for user ID
    // Only set tracking userid for authenticated admin sessions
    if (session && !cookies.userid) {
        response.headers.set('set-cookie', cookie.serialize('userid', event.locals.userid, {
            path: '/',
            httpOnly: true,
            maxAge: 1800 // 30 minutes in seconds
        }));
    }

    // TODO: secure before deployment - mirror previous behavior
    // Only mirror admin auth store to cookie when admin session cookie exists
    if (session && event.locals.pb.authStore.token) {
        response.headers.append('set-cookie', event.locals.pb.authStore.exportToCookie({ secure: false, maxAge: 1800 }));
    }

    // If navigating away, clear transient sessions so they can't access anything beyond the room context
    if (!isAllowedForTransientSessions) {
        if (hadRep) {
            response.headers.append('set-cookie', cookie.serialize('rep_session', '', { path: '/', maxAge: 0 }));
            response.headers.append('set-cookie', cookie.serialize('rep_user', '', { path: '/', maxAge: 0 }));
        }
    }

    // Add CORS headers to API responses
    if (event.url.pathname.startsWith('/api')) {
        response.headers.set('Access-Control-Allow-Origin', origin || '*');
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.append('Vary', 'Origin');
    }

    return response;
};