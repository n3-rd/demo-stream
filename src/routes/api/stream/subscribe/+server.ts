import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_ANT_MEDIA_URL } from '$env/static/public';

interface SubscribeRequest {
    streamId: string;
    subscriberId: string;
    type?: 'play' | 'publish';  // Default to 'play' if not specified
    b32Secret?: string;
}

interface AntMediaResponse {
    success: boolean;
    message: string;
    dataId: string;
    errorId: number;
}

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.pb.authStore.isValid) {
        return json({
            success: false,
            message: 'Unauthorized'
        }, { status: 401 });
    }

    try {
        const body: SubscribeRequest = await request.json();
        const { streamId, subscriberId, type = 'play', b32Secret } = body;

        if (!streamId || !subscriberId) {
            return json({
                success: false,
                message: 'Stream ID and subscriber ID are required'
            }, { status: 400 });
        }

        // Format the URL for Ant Media Server
        const host = PUBLIC_ANT_MEDIA_URL
        const apiUrl = `http://${host}/WebRTCAppEE/rest/v2/broadcasts/${streamId}/subscribers`;

        const subscribeData = {
            subscriberId,
            streamId,
            type,
            ...(b32Secret && { b32Secret }), // Only include b32Secret if provided
            connected: false, // Initial state
            currentConcurrentConnections: 0,
            concurrentConnectionsLimit: 1
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(subscribeData)
        });

        const result: AntMediaResponse = await response.json();

        if (!response.ok) {
            return json({
                success: false,
                message: result.message || 'Failed to subscribe to stream',
                error: result
            }, { status: response.status });
        }

        return json({
            success: true,
            subscription: result
        });

    } catch (error) {
        console.error('Error subscribing to stream:', error);
        return json({
            success: false,
            message: 'Failed to subscribe to stream',
            error: error.message
        }, { status: 500 });
    }
};
