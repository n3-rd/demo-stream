export async function getStreamInfo(roomId: string) {
    const apiUrl = `/api/stream/info?roomId=${roomId}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },

        });

        if (!response.ok) {
            throw new Error('Failed to fetch stream info');
        }

        const streamInfo = await response.json();
        return streamInfo;
    } catch (error) {
        console.error('Error fetching stream info:', error);
        throw error;
    }
}
