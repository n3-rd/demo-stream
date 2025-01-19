import type { PageServerLoad } from './$types';
import { Actions, redirect, error } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { pb } from '$lib/pocketbase';

export const load = async ({ locals }) => {
    if (!locals.pb) {
        throw error(500, 'Database connection not available');
    }

    try {
        // Fetch the last room with its content
        const room = await locals.pb.collection('rooms').getFirstListItem('', {
            sort: '-created', // Sort by creation date descending to get the latest
            expand: 'host_content,representative_content',
            fields: 'id,title,is_active,host_content,representative_content,owner_company'
        });

        // Fetch host content details
        const hostContent = await locals.pb.collection('content_library').getList(1, 50, {
            filter: room.host_content?.map(id => `id = "${id}"`).join(' || ') || 'id = ""',
            fields: 'id,title,collectionId,thumbnail,type,file'
        });

        // Fetch representative content details
        const representativeContent = await locals.pb.collection('content_library').getList(1, 50, {
            filter: room.representative_content?.map(id => `id = "${id}"`).join(' || ') || 'id = ""',
            fields: 'id,title,collectionId,thumbnail,type,file'
        });

        // Fetch content library items
        const contentLibrary = await locals.pb.collection('content_library').getList(1, 10, {
            sort: '-created',
            filter: 'library_type ~ "host"',
            fields: 'id,title,collectionId,thumbnail,type,file'
        });

        return {
            room: structuredClone(room),
            hostContent: structuredClone(hostContent.items),
            representativeContent: structuredClone(representativeContent.items),
            contentLibrary: structuredClone(contentLibrary.items)
        };
    } catch (err) {
        console.error('Error loading dashboard data:', err);
        throw error(500, 'Failed to load dashboard data');
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
    'create-room': async ({ locals, request }) => {
        const formData = await request.formData();
        const videoUrl = formData.get('videoUrl') as string;
        const videoName = formData.get('videoName') as string;
        let anonymousUserId = formData.get('anonymousUserId') as string;

        let userId = locals.pb.authStore.isValid
            ? locals.pb.authStore.model.id
            : anonymousUserId;

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
    'join-room': async ({ locals, request }) => {
        console.log('Join room action called');
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
                    }
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

