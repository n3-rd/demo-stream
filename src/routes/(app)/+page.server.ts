import type { PageServerLoad } from './$types';
import { Actions, redirect, error } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { pb } from '$lib/pocketbase';

export const load = async ({ locals }) => {
    if (!locals.pb) {
        throw error(500, 'Database connection not available');
    }

    try {
        // Check if user is authenticated
        if (!locals.pb.authStore.isValid) {
            return {
                room: null,
                hostContent: [],
                representativeContent: [],
                contentLibrary: [],
                user: null
            };
        }

        const user = locals.pb.authStore.model;

        let room = null;
        
        // Try to fetch the last room with its content
        try {
            room = await locals.pb.collection('rooms').getFirstListItem('', {
                sort: '-created',
                expand: 'host_content,representative_content',
                fields: 'id,title,is_active,host_content,representative_content,owner_company'
            });
        } catch (roomErr) {
            // If no rooms exist, continue with empty room data
            console.log('No rooms found:', roomErr);
        }

        // Fetch all content owned by this company, similar to content-library approach
        const allContent = await locals.pb.collection('content_library').getFullList({
            filter: `owner_company = "${user.id}"`,
            sort: '-created',
            fields: 'id,title,collectionId,thumbnail,type,file,library_type'
        });

        // Separate content by type
        const hostContent = allContent.filter(item => 
            item.library_type === 'host' || 
            (Array.isArray(item.library_type) && item.library_type.includes('host'))
        );
        
        const representativeContent = allContent.filter(item => 
            item.library_type === 'representative' || 
            (Array.isArray(item.library_type) && item.library_type.includes('representative'))
        );
        
        // Recent content for the library section
        const contentLibrary = allContent.slice(0, 10);

        return {
            room: room ? structuredClone(room) : null,
            hostContent: structuredClone(hostContent),
            representativeContent: structuredClone(representativeContent),
            contentLibrary: structuredClone(contentLibrary),
            user
        };
    } catch (err) {
        console.error('Error loading dashboard data:', err);
        // Return empty data instead of throwing an error
        return {
            room: null,
            hostContent: [],
            representativeContent: [],
            contentLibrary: [],
            user: locals.pb.authStore.isValid ? locals.pb.authStore.model : null
        };
    }
};

function sanitizeStreamName(name: string): string {
    if (!name) return '';
    // First decode any URL encoded characters
    const decodedName = decodeURIComponent(name);
    // Then replace any spaces or special characters with underscores
    return decodedName.replace(/[^a-zA-Z0-9-]/g, '_');
}

export const actions: Actions = {
    'create-room': async ({ locals, request, cookies }) => {
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
                login_name: locals.pb.authStore.model.username || locals.pb.authStore.model.email,
                company: locals.pb.authStore.model.company_name || 'Company User',
                email: locals.pb.authStore.model.email
            };
        } else if (viewroomSession && viewroomUserCookie) {
            // User has viewroom authentication
            try {
                viewroomUser = JSON.parse(viewroomUserCookie);
                authType = 'viewroom';
            } catch (e) {
                return {
                    success: false,
                    message: 'Invalid viewroom session',
                    status: 401
                };
            }
        } else {
            // No authentication at all
            return {
                success: false,
                message: 'Authentication required',
                status: 401
            };
        }

        const formData = await request.formData();
        const videoUrl = formData.get('videoUrl') as string;
        const videoName = formData.get('videoName') as string;

        // Use viewroom user info instead of anonymous
        let userId = locals.pb.authStore.isValid
            ? locals.pb.authStore.model.id
            : `viewroom_${viewroomUser.id}`;

        // Sanitize the userId/anonymousUserId before creating room ID
        const sanitizedUserId = sanitizeStreamName(userId);
        const roomId = `room-${Math.random().toString(36).substring(2, 7)}-${sanitizedUserId}`;

        try {
            const room = await locals.pb.collection('rooms').create({
                room_id: roomId,
                associated_video: videoUrl,
                associated_video_name: videoName,
                created_by: userId
            });

            console.log('room:', room);

            return {
                success: true,
                room: {
                    id: room.id,
                    room_id: roomId,
                    videoUrl: videoUrl,
                    videoName: videoName
                },
                message: 'Room created successfully'
            };
        } catch (error) {
            console.error('Error creating room:', error);
            return {
                success: false,
                message: 'Failed to create room',
                status: 500
            };
        }
    },
    'join-room': async ({ locals, request, cookies }) => {
        console.log('Join room action called');
        
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
                login_name: locals.pb.authStore.model.username || locals.pb.authStore.model.email,
                company: locals.pb.authStore.model.company_name || 'Company User',
                email: locals.pb.authStore.model.email
            };
        } else if (viewroomSession && viewroomUserCookie) {
            // User has viewroom authentication
            try {
                viewroomUser = JSON.parse(viewroomUserCookie);
                authType = 'viewroom';
            } catch (e) {
                return {
                    success: false,
                    message: 'Invalid viewroom session',
                    status: 401
                };
            }
        } else {
            // No authentication at all
            return {
                success: false,
                message: 'Authentication required',
                status: 401
            };
        }

        const formData = await request.formData();
        const roomId = formData.get('roomId') as string;

        try {
            // Find the room in PocketBase
            const room = await locals.pb.collection('rooms').getFirstListItem(`room_id="${roomId}"`);

            if (room) {
                console.log('Room found:', room);
                return {
                    success: true,
                    room: {
                        id: room.id,
                        room_id: room.room_id,
                        videoUrl: room.associated_video,
                        videoName: room.associated_video_name
                    },
                    viewroomUser
                };
            } else {
                console.error('Room not found');
                return {
                    success: false,
                    message: 'Room not found',
                    status: 404
                };
            }
        } catch (error) {
            console.error('Error joining room:', error);
            return {
                success: false,
                message: 'Failed to join room',
                status: 500
            };
        }
    },
    'upload-video': async ({ cookies, request, locals }) => {
        const userId = locals.pb.authStore.model.id;
        console.log('userId:', userId);

        const formData = new FormData();
        const data = await request.formData();
        let name = data.get('name');
        let video = data.get('video');

        if (!video) {
            return { success: false, message: 'No video was uploaded' };
        }

        // Append the video file to the form data
        formData.append('video', video);

        // Append the user id to the form data
        formData.append('user', userId);
        formData.append('name', name);

        // Upload and create new record
        try {
            const result = await locals.pb.collection('videos').create(formData);
            console.log('result:', result);
            return { success: true, message: 'Video uploaded successfully' };
        } catch (err) {
            console.log('err:', err);
            return { success: false, message: 'Failed to upload video' };
        }
    },
    'delete-video': async ({ locals, request }) => {
        const formData = await request.formData();
        const videoId = formData.get('videoId') as string;

        if (!locals.pb.authStore.model?.superuser) {
            return {
                success: false,
                message: 'Unauthorized: Only super users can delete videos',
                status: 403
            };
        }

        try {
            await locals.pb.collection('room_videos').delete(videoId);
            return {
                success: true,
                message: 'Video deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting video:', error);
            return {
                success: false,
                message: 'Failed to delete video',
                status: 500
            };
        }
    }
};

