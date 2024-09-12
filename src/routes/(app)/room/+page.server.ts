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

export const actions = {
    'create-room': async ({ fetch, locals }) => {
        console.log('Create room action called');
        const userId = locals.pb.authStore.model.id;
        const exp = Math.round(Date.now() / 1000) + 60 * 30;
        const options = {
            properties: {
                exp,
                user_id: userId,
                enable_adaptive_simulcast: false,
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
                console.log('Room created successfully:', room);
                return {
                    success: true,
                    room: {
                        name: room.name,
                        url: room.url,
                        created_at: room.created_at,
                        // Add other necessary fields here
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