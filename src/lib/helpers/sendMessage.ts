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