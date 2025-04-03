import type { RequestHandler } from '@sveltejs/kit';
import { PUBLIC_ANT_MEDIA_URL } from '$env/static/public';

export const GET: RequestHandler = async ({ url }) => {
    const roomId = url.searchParams.get('roomId');
    const uid = url.searchParams.get('uid');

    if (!roomId) {
        return new Response(JSON.stringify({ error: 'Room ID is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Construct the stream ID with uid if provided - use hyphen format
    const streamId = uid ? `${roomId}-${uid}` : roomId;
    
    // console.log(`Fetching stream info for ${streamId} (base room: ${roomId}, uid: ${uid || 'none'})`);
    
    // Fix the URL format - use proper structure and remove extra slash if present
    const apiBaseUrl = PUBLIC_ANT_MEDIA_URL.endsWith('/') ? 
        `https://${PUBLIC_ANT_MEDIA_URL}WebRTCAppEE/rest/v2/broadcasts/` :
        `https://${PUBLIC_ANT_MEDIA_URL}/WebRTCAppEE/rest/v2/broadcasts/`;
    
    const apiUrl = `${apiBaseUrl}${streamId}`;
    
    try {
        // console.log(`Making API request to: ${apiUrl}`);
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            console.error(`API request failed with status ${response.status}`);
            return new Response(JSON.stringify({ 
                error: 'Failed to fetch stream info',
                streamId,
                status: response.status,
                url: apiUrl
            }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const data = await response.json();
        // console.log(`API response received for ${streamId}`);
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching stream info:', error);
        return new Response(JSON.stringify({ 
            error: 'Internal Server Error',
            streamId,
            url: apiUrl
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
