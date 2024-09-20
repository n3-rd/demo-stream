import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PocketBase from 'pocketbase';

async function fetchLoomDownloadUrl(id: string): Promise<string> {
    const response = await fetch(`https://www.loom.com/api/campaigns/sessions/${id}/transcoded-url`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch Loom download URL: ${response.statusText}`);
    }

    const content = await response.json();
    return content.url;
}

async function downloadLoomVideo(url: string): Promise<Buffer> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to download Loom video: ${response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
}

async function saveVideoToPocketBase(videoBuffer: Buffer, videoId: string, originalUrl: string, locals) {
    const formData = new FormData();
    formData.append('name', `Loom Video ${videoId}`);
    formData.append('video_url', originalUrl);
    formData.append('user', locals.user.id); // Assuming `locals.user.id` contains the relation record ID for the user
    formData.append('video', new Blob([videoBuffer], { type: 'video/mp4' }), `${videoId}.mp4`);

    const record = await locals.pb.collection('uploaded_videos').create(formData);
    return record;
}

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const { url } = await request.json();
        if (!url) {
            throw new Error('URL is missing in the request body');
        }

        const videoId = url.split('/').pop();
        if (!videoId) {
            throw new Error('Invalid Loom video URL');
        }

        // Fetch download URL
        const downloadUrl = await fetchLoomDownloadUrl(videoId);

        // Download the video
        const videoBuffer = await downloadLoomVideo(downloadUrl);

        // Save video to PocketBase
        const savedVideo = await saveVideoToPocketBase(videoBuffer, videoId, url, locals);

        return json({
            success: true,
            message: 'Video downloaded and saved successfully',
            video: {
                id: savedVideo.id,
                name: savedVideo.name,
                video_url: savedVideo.video_url,
                user: savedVideo.user,
                video: savedVideo.video
            }
        });
    } catch (error) {
        console.error('Error processing Loom video:', error);
        return json(
            { success: false, message: error.message || 'Failed to process Loom video' },
            { status: 500 }
        );
    }
};