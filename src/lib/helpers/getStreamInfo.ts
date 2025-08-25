export async function getStreamInfo(roomId: string, uid?: string) {
    // Ensure we're always passing uid parameter if provided
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

        // If the route returns 404 directly (e.g., older deployments), treat as empty
        if (response.status === 404) {
            return { streamId: uid ? `${roomId}-${uid}` : roomId, status: 'not_found', subTrackStreamIds: [] };
        }

        if (!response.ok) {
            console.error(`Failed to fetch stream info: ${response.status} ${response.statusText}`);
            throw new Error('Failed to fetch stream info');
        }

        const streamInfo = await response.json();
        // Check that we got a proper response with expected format
        if (streamInfo && !streamInfo.error) {
            // Ensure subTrackStreamIds exists, even if empty
            if (!streamInfo.subTrackStreamIds) {
                streamInfo.subTrackStreamIds = [];
            }
            
            // Log the expected streamId for debugging
            const expectedStreamId = uid ? `${roomId}-${uid}` : roomId;
            if (streamInfo.streamId && streamInfo.streamId !== expectedStreamId) {
                console.warn(`Stream ID mismatch. Expected: ${expectedStreamId}, Got: ${streamInfo.streamId}`);
            }
        }
        
        return streamInfo;
    } catch (error) {
        console.error('Error fetching stream info:', error);
        
        // Return a default empty structure instead of throwing
        return {
            subTrackStreamIds: [],
            error: (error as Error).message || 'Unknown error'
        };
    }
}
