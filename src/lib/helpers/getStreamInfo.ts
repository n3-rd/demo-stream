export async function getStreamInfo(roomId: string, uid?: string) {
    // Include uid parameter if provided
    const apiUrl = uid 
        ? `/api/stream/info?roomId=${roomId}&uid=${uid}`
        : `/api/stream/info?roomId=${roomId}`;

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
        
        // Return a default empty structure instead of throwing
        return {
            subTrackStreamIds: []
        };
    }
}
