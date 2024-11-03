export async function sendMessage(messageId: string, messageDate: number, messageBody: string, roomId: string) {
    const messageData = {
        messageId,
        messageDate,
        messageBody,
        roomId
    };

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
        } else {
            console.error('Failed to send message', response.statusText);
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}