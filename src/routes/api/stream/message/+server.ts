import type { RequestHandler } from '@sveltejs/kit';
import { PUBLIC_ANT_MEDIA_URL } from '$env/static/public';

export const POST: RequestHandler = async ({ request }) => {
    try {
        // Parse the incoming request body
        const { messageId, messageDate, messageBody, roomId } = await request.json();

        // Define the target URL
        const url = `https://${PUBLIC_ANT_MEDIA_URL}/WebRTCAppEE/rest/v2/broadcasts/${roomId}/data`;

        // Send the POST request
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messageId,
                messageDate,
                messageBody
            })
        });

        // Check if the response is successful
        if (!response.ok) {
            return new Response('Failed to send message', { status: response.status });
        }

        // Return a success response
        return new Response('Message sent successfully', { status: 200 });
    } catch (error) {
        // Handle any errors
        return new Response('Error processing request', { status: 500 });
    }
};
