import { json, redirect, type RequestHandler } from '@sveltejs/kit';
import { PUBLIC_DAILY_API_KEY } from '$env/static/public';
import { Actions } from '@sveltejs/kit';
import type { PageServerLoad } from "./$types";
import { error } from '@sveltejs/kit';
import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';
import PocketBase from 'pocketbase';

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

export const load: PageServerLoad = async ({ locals, params, url }) => {
    const representativeId = url.searchParams.get('repid');
    const user = locals.pb.authStore.model;

    // If there's a representative ID in the URL, handle representative access
    if (representativeId) {
        try {
            // Get the representative from the representatives collection with expanded fields
            const representative = await locals.pb.collection('representatives').getOne(representativeId, {
                expand: 'connected_content'
            });
            
            // Get the room with expanded relations
            const roomId = await locals.pb.collection('rooms').getFullList({
                filter: `id = "${params.roomId}"`,
                expand: 'representative,host_content,representative_content,selected_video'
            });

            if (!roomId.length) {
                console.log('Room not found line 38');
                throw redirect(303, '/');
            }

            const room = roomId[0];

            // Verify the representative has access to this room
            if (!room.representative || !room.representative.includes(representativeId)) {
                console.log('Representative does not have access to this room line 46');
                throw redirect(303, '/');
            }

            // Return data with representative info
            return {
                user: null,
                representatives: room.expand?.representative || [],
                users: [],
                roomId: [room],
                videoRepresentativesInfo: room.expand?.representative || [],
                representativeName: representative.name + ' (representative)',
                isRepresentative: true
            };
        } catch (error) {
            console.error('Error handling representative access line 61:', error);
            throw redirect(303, '/');
        }
    }

    // Regular room access
    try {
        const roomId = await locals.pb.collection('rooms').getFullList({
            filter: `id = "${params.roomId}"`,
            expand: 'representative,host_content,representative_content,selected_video'
        });

        if (!roomId.length) {
            console.log('Room not found line 74');
            throw redirect(303, '/');
        }

        const room = roomId[0];
        const representatives = room.expand?.representative || [];
        const users = user ? await locals.pb.collection('users').getFullList() : [];

        console.log('Room data loaded:', {
            id: room.id,
            hasHostContent: !!room.host_content,
            hasRepContent: !!room.representative_content,
            expandedData: room.expand
        });

        return {
            user: user || null,
            representatives,
            users,
            roomId: [room],
            videoRepresentativesInfo: representatives,
            isRepresentative: false
        };
    } catch (error) {
        console.error('Error loading room line 99:', error);
        throw redirect(303, '/');
    }
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

export const loadLocations: PageServerLoad = async ({ params, locals }) => {
    const pb = new PocketBase(PUBLIC_POCKETBASE_INSTANCE);
    
    try {
        // Load locations for the current user's company
        const locations = await pb.collection('locations').getFullList({
            filter: `owner_company = "${locals.user?.id}"`,
            sort: '-created'
        });

        return {
            locations
        };
    } catch (error) {
        console.error('Error loading locations:', error);
        throw error(500, 'Failed to load locations');
    }
};
