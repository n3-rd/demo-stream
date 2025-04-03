import type { RequestHandler } from '@sveltejs/kit';
import { PUBLIC_ANT_MEDIA_URL } from '$env/static/public';

export const POST: RequestHandler = async ({ request }) => {
    try {
        // Parse the incoming request body
        const { messageId, messageDate, messageBody, roomId } = await request.json();
        
        // console.log('Server received message:', {
        //     messageId,
        //     messageDate,
        //     roomId,
        //     messageBodyPreview: messageBody.substring(0, 100) + (messageBody.length > 100 ? '...' : '')
        // });

        // Define the target URL
        const url = `https://${PUBLIC_ANT_MEDIA_URL}WebRTCAppEE/rest/v2/broadcasts/${roomId}/data`;
        
        // console.log('Forwarding to Ant Media Server:', url);

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
            console.error('Ant Media Server response error:', {
                status: response.status,
                statusText: response.statusText
            });
            return new Response('Failed to send message', { status: response.status });
        }

        // console.log('Message forwarded successfully to Ant Media Server');
        // Return a success response
        return new Response('Message sent successfully', { status: 200 });
    } catch (error) {
        // Handle any errors
        console.error('Error processing message request:', error);
        return new Response('Error processing request', { status: 500 });
    }
};
