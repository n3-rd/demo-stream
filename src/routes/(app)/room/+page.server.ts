import { redirect, type RequestHandler } from '@sveltejs/kit';
import { PUBLIC_DAILY_API_KEY, PUBLIC_DAILY_DOMAIN } from '$env/static/public';
import { Actions } from '@sveltejs/kit';

export const load = async ({ locals }) => {
    const isLoggedIn = locals.pb.authStore.isValid;
    const user = locals.pb.authStore.model;
    console.log('Load function called:', { isLoggedIn, user });
    // if (!isLoggedIn){
    // return redirect(301,'/login');
    // }
    // else{
    //     return redirect(301,'/');
    // }
    return {
        isLoggedIn,
        user,
    };
};

const DAILY_API_KEY = PUBLIC_DAILY_API_KEY;


function sanitizeStreamName(name: string): string {
    if (!name) return '';
    // First decode any URL encoded characters
    const decodedName = decodeURIComponent(name);
    // Then replace any spaces or special characters with underscores
    return decodedName.replace(/[^a-zA-Z0-9-]/g, '_');
}
export const actions = {
    'create-room': async ({ fetch, locals, request }) => {
        const formData = await request.formData();
        const videoUrl = formData.get('videoUrl') as string;
        const videoName = formData.get('videoName') as string;
        const anonymousName = formData.get('anonymousName') as string;

        const userId = locals.pb.authStore.isValid ? locals.pb.authStore.model.id : 'anonymous';
        const exp = Math.round(Date.now() / 1000) + 60 * 60;

        // Sanitize the userId/anonymousName before creating meeting name
        const sanitizedName = sanitizeStreamName(anonymousName || userId);
        const meetingName = `room-${Math.random().toString(36).substring(2, 7)}-${sanitizedName}`;
        const options = {
            name: meetingName,
            properties: {
                exp,
                enable_chat: true,
                user_name: locals.pb.authStore.isValid ? locals.pb.authStore.model.name : anonymousName,
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
                    associated_video_name: videoName,
                    created_by: userId,
                    owner_company: locals.pb.authStore.model.id
                });
                return {
                    success: true,
                    room: {
                        name: room.name,
                        url: room.url,
                        videoUrl: videoUrl,
                        videoName: videoName,
                        anonymousName: anonymousName
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
    }
};
