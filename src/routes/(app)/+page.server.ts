import type { PageServerLoad } from './$types';
import { Actions, redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';


export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.pb.authStore.isValid ? locals.pb.authStore.model : null;
    
    // Only fetch videos owned by the current company
    const roomVideos = await locals.pb.collection('room_videos_duplicate').getFullList({
        filter: user ? `owner_company = "${user.id}"` : ''
    });
    
    return {
        user,
        roomVideos
    };
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

