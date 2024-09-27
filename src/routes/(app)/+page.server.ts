import type { PageServerLoad } from './$types';
import { Actions, redirect } from '@sveltejs/kit';
import { PUBLIC_DAILY_API_KEY, PUBLIC_DAILY_DOMAIN } from '$env/static/public';


export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.pb.authStore.model;
    const roomVideos = await locals.pb.collection('room_videos').getFullList();

    if (!user) {
        throw redirect(302, '/login');
    }

    return { user, roomVideos };
};

const DAILY_API_KEY = PUBLIC_DAILY_API_KEY;


export const actions: Actions = {
    'create-room': async ({ fetch, locals, request }) => {
        const formData = await request.formData();
        const videoUrl = formData.get('videoUrl') as string;

        console.log('Create room action called');
        const userId = locals.pb.authStore.model.id;
        const exp = Math.round(Date.now() / 1000) + 60 * 60;
        const options = {
            name: `meet-${Math.random().toString(36).substring(2, 7)}-${userId}`,properties: {
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
                return {
                    success: true,
                    room: {
                        name: room.name,
                        url: room.url,
                        videoUrl: videoUrl,
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
    }
};