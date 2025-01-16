import { json, redirect, type RequestHandler } from '@sveltejs/kit';
import { PUBLIC_DAILY_API_KEY } from '$env/static/public';
import { Actions } from '@sveltejs/kit';
import type { PageServerLoad } from "./$types";

const DAILY_API_KEY = PUBLIC_DAILY_API_KEY as string;
const sanitizeAssociatedVideo = (videoRef: string) => {
    // Remove '/video/' prefix if present
    let sanitizedVideo = videoRef.startsWith('/video/') ? videoRef.slice(7) : videoRef;

    // Remove the last '.mp4' if present
    if (sanitizedVideo.endsWith('.mp4')) {
        sanitizedVideo = sanitizedVideo.slice(0, -4);
    }

    return sanitizedVideo;
}

export const load: PageServerLoad = async ({ locals, params }) => {
    const user = locals.pb.authStore.model;
    
    // Get the room with expanded relations
    const roomId = await locals.pb.collection('rooms').getFullList({
        filter: `id = "${params.roomId.split('&')[0]}"`,
        expand: 'representative,host_content,representative_content'
    });

    // If no room found, redirect
    if (!roomId.length) {
        throw redirect(302, '/');
    }

    const room = roomId[0];

    // Check if user has access to the room (only if they are authenticated)
    const isHost = user ? room.owner_company === user.id : false;
    const isRepresentative = user ? room.expand?.representative?.some(rep => rep.id === user.id) : false;

    // Get all representatives assigned to this room
    const representatives = room.expand?.representative || [];

    // Get all users in the room for participant management (only if authenticated)
    const users = user ? await locals.pb.collection('users').getFullList() : [];

    return {
        user: user || null,
        representatives,
        users,
        roomId: [room],
        videoRepresentativesInfo: representatives
    };
};

export const actions: Actions = {
    'create-room': async ({ locals, fetch }) => {
        const user = locals.pb.authStore.model;
        const username = user.name;
        const exp = Math.round(Date.now() / 1000) + 60 * 60 * 24;
        const options = {
            properties: {
                exp,
                userName: username,
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
                return json({
                    success: true,
                    room
                }, { status: 200 });
            } else {
                return json({
                    success: false
                }, { status: res.status });
            }
        } catch (error) {
            return json({
                success: false,
                message: 'something went wrong with the room submit!'
            }, { status: 500 });
        }
    },
    'send-email': async ({ request, fetch }) => {
        try {
            const formData = await request.formData();
            const url = formData.get('url');
            const name = formData.get('name');
            const receipient = formData.get('receipient');

            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url, name, receipient })
            });

            if (response.ok) {
                console.log('Email sent successfully', response);
                return {
                    status: 200,
                    body: { message: 'Email sent successfully' }
                };
            } else {
                const errorData = await response.json();
                console.error('Failed to send email', errorData);
                return {
                    status: response.status,
                    body: { error: errorData.error || 'Failed to send email' }
                };
            }
        } catch (error) {
            console.error('Failed to send email', error);
            return {
                status: 500,
                body: { error: 'Failed to send email' }
            };
        }
    },
    'request-quote': async ({ request, locals }) => {
        const formData = await request.formData();
        const first_name = formData.get('first_name');
        const last_name = formData.get('last_name');
        const phone = formData.get('phone');
        const email = formData.get('email');
        const description = formData.get('description');

        const data = {
            first_name,
            last_name,
            phone,
            email,
            description
        };
        await locals.pb.collection('quotes').create(data).then((result) => {
            console.log('Quote request created:', result);
            return {
                status: 200,
                body: { message: 'Quote request created successfully' }
            };
        }).catch((err) => {
            console.error('Failed to create quote request:', err);
            return {
                status: 500,
                body: { error: 'Failed to create quote request' }
            };
        });
    }
};
