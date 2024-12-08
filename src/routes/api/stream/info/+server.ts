import type { RequestHandler } from '@sveltejs/kit';
import { PUBLIC_ANT_MEDIA_URL } from '$env/static/public';
export const prerender = true;

export const GET: RequestHandler = async ({ url }) => {
    const roomId = url.searchParams.get('roomId');

    if (!roomId) {
        return new Response(JSON.stringify({ error: 'Room ID is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const apiUrl = `https://${PUBLIC_ANT_MEDIA_URL}/WebRTCAppEE/rest/v2/broadcasts/${roomId}`;


    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            return new Response(JSON.stringify({ error: 'Failed to fetch stream info' }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching stream info:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
