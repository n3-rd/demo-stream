import type { PageServerLoad } from './$types';
import { Actions, redirect } from '@sveltejs/kit';
import { PUBLIC_DAILY_API_KEY, PUBLIC_DAILY_DOMAIN } from '$env/static/public';
import { browser } from '$app/environment';


export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.pb.authStore.isValid ? locals.pb.authStore.model : null;
    const roomVideos = await locals.pb.collection('room_videos_duplicate').getFullList();
    return {
        user,
        roomVideos
    };
};

const DAILY_API_KEY = PUBLIC_DAILY_API_KEY;


export const actions: Actions = {
    'create-room': async ({ fetch, locals, request,params }) => {
        const formData = await request.formData();
        const videoUrl = formData.get('videoUrl') as string;
        const videoName = formData.get('videoName') as string;
        let anonymousUserId = formData.get('anonymousUserId') as string;

        console.log('Create room action called');
        let userId = '';
        if (!locals.pb.authStore.isValid) {
            userId = anonymousUserId;
        } else {
            userId = locals.pb.authStore.model.id;
        }
        const exp = Math.round(Date.now() / 1000) + 60 * 60;
        const meetingName = `meet-${Math.random().toString(36).substring(2, 7)}-${userId}`;
        const options = {
            name: meetingName,
            properties: {
                exp,
                enable_chat: true,
            }
        };

        try {
            const res = await fetch('https://api.daily.co/v1/rooms', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${DAILY_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(options)
            });

            if (res.ok) {
                const room = await res.json();
                // Store the videoUrl with the room data
                await locals.pb.collection('rooms').create({
                    room_id: meetingName,
                    associated_video: videoUrl,
                    associated_video_name: videoName
                });
                return {
                    success: true,
                    room: {
                        name: `${room.name}${anonymousUserId ? `?anonymousUserId=${encodeURIComponent(anonymousUserId)}` : ''}`,
                        url: room.url,
                        videoUrl: videoUrl,
                        videoName: videoName
                        // ... other room data ...
                    }
                };
            } else {
                console.error('Failed to create room:', res.status);
                return {
                    success: false,
                    status: res.status
                };
            }
        } catch (error) {
            console.error('Error creating room:', error);
            return {
                success: false,
                message: 'something went wrong with the room submit!',
                status: 500
            };
        }
    },
    'join-room': async ({ request, fetch }) => {
        console.log('Join room action called');
        const formData = await request.formData();
        const dailyUrl = formData.get('dailyUrl') as string;

        if (dailyUrl) {
            console.log('Joining existing room with URL:', dailyUrl);
            return {
                success: true,
                url: dailyUrl
            };
        }

        const exp = Math.round(Date.now() / 1000) + 60 * 30;
        const options = {
            properties: {
                exp
            }
        };

        try {
            const res = await fetch('https://api.daily.co/v1/rooms', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${DAILY_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(options)
            });

            if (res.ok) {
                const room = await res.json();
                const DOMAIN = PUBLIC_DAILY_DOMAIN;
                const roomUrl = `https://${DOMAIN}.daily.co/${room.name}`;
                console.log('Room joined successfully:', roomUrl);
                return {
                    success: true,
                    url: roomUrl
                };
            } else {
                console.error('Failed to join room:', res.status);
                return {
                    success: false,
                    status: res.status
                };
            }
        } catch (error) {
            console.error('Error joining room:', error);
            return {
                success: false,
                message: 'something went wrong with the room submit!',
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

