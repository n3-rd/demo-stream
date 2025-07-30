import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, cookies }) => {
    if (!locals.pb) {
        throw error(500, 'Database connection not available');
    }

    // Check for authentication - allow either normal PocketBase auth or viewroom auth
    const isNormalAuth = locals.pb.authStore.isValid;
    const viewroomSession = cookies.get('viewroom_session');
    const viewroomUserCookie = cookies.get('viewroom_user');
    
    let viewroomUser = null;
    let authType = 'none';
    
    if (isNormalAuth) {
        // User is logged in with normal PocketBase auth - allow access
        authType = 'pocketbase';
        viewroomUser = {
            id: locals.pb.authStore.model.id,
            first_name: locals.pb.authStore.model.first_name || locals.pb.authStore.model.username || 'User',
            last_name: locals.pb.authStore.model.last_name || '',
            company: locals.pb.authStore.model.company_name || 'Company User',
            email: locals.pb.authStore.model.email
        };
    } else if (viewroomSession && viewroomUserCookie) {
        // User has viewroom authentication
        try {
            viewroomUser = JSON.parse(viewroomUserCookie);
            authType = 'viewroom';
        } catch (e) {
            throw redirect(303, `/viewroom/login?room=${params.roomId}`);
        }
    } else {
        // No authentication at all - require viewroom login
        throw redirect(303, `/viewroom/login?room=${params.roomId}`);
    }

    try {
        // Get the room with expanded relations, viewroom auth required
        const roomId = await locals.pb.collection('rooms').getFullList({
            filter: `id = "${params.roomId}"`,
            expand: 'representative,host_content,representative_content,selected_video'
        });

        if (!roomId.length) {
            throw error(404, 'Room not found');
        }

        const room = roomId[0];

        // Return data for authenticated users
        return {
            room,
            viewroomUser,
            authType,
            isViewroomAuthenticated: true,
            isAnonymous: false
        };
    } catch (err) {
        console.error('Error loading room data:', err);
        throw error(500, 'Failed to load room data');
    }
}; 