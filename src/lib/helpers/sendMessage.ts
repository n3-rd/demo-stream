export async function sendMessage(messageId: string, messageDate: number, messageBody: string, roomId: string) {
    const messageData = {
        messageId,
        messageDate,
        messageBody,
        roomId
    };

    console.log('Sending message:', {
        messageId,
        messageDate,
        roomId,
        messageBodyPreview: messageBody.substring(0, 100) + (messageBody.length > 100 ? '...' : '')
    });

    try {
        const response = await fetch('/api/stream/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData)
        });

        if (response.ok) {
            console.log('Message sent successfully');
            return true;
        } else {
            console.error('Failed to send message', response.statusText);
            return false;
        }
    } catch (error) {
        console.error('Error sending message:', error);
        return false;
    }
}