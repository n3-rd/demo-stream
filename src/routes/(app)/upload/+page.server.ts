import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { writeFile, appendFile, rename, mkdir } from 'fs/promises';
import { existsSync, unlinkSync, unlink } from 'fs';
import { join } from 'path';

export const load = async ({ locals }) => {
    const user = locals.pb.authStore.model;
    const representatives = await locals.pb.collection('users').getFullList({
        filter: 'representative = true',
    });

    if (!user) {
        throw redirect(302, '/login');
    }

    if (!user.superuser) {
        throw redirect(302, '/dashboard');
    }

    return { user, representatives };
};

async function ensureDir(dir: string) {
    if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
    }
}

function random_ref() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export const actions: Actions = {
    uploadVideo: async ({ request, locals }) => {
        const formData = await request.formData();

        const title = formData.get('title') as string;
        const desc = formData.get('desc') as string;

        // Handle file uploads
        const video = formData.get('video') as File;
        const thumbnail = formData.get('thumbnail') as File | null;

        if (!video) {
            return fail(400, { error: true, message: 'Video file is required' });
        }

        // Handle representatives
        const representativesString = formData.get('representatives') as string;
        const representatives = representativesString ? representativesString.split(',') : [];

        const data = new FormData();
        data.append('title', title);
        data.append('desc', desc);
        if (thumbnail) data.append('thumbnail', thumbnail);
        representatives.forEach(rep => data.append('representatives', rep));

        // Ensure the upload directories exist
        const tempDir = 'static/video/temp';
        const finalDir = 'static/video';
        await ensureDir(tempDir);
        await ensureDir(finalDir);

        const videoName = random_ref();
        const tempPath = join(tempDir, videoName);
        const finalPath = join(finalDir, `${videoName}.mp4`);

        // Implement chunked upload
        const chunkSize = 1024 * 1024; // 1MB chunks
        const fileSize = video.size;
        const chunks = Math.ceil(fileSize / chunkSize);

        try {
            for (let i = 0; i < chunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, fileSize);
                const chunk = video.slice(start, end);

                const buffer = Buffer.from(await chunk.arrayBuffer());

                if (i === 0) {
                    await writeFile(tempPath, buffer);
                } else {
                    await appendFile(tempPath, buffer);
                }
            }

            // Move the completed file to the final location
            await rename(tempPath, finalPath);

            // Optional fields
            const name = formData.get('name');
            const phone = formData.get('phone');
            const email = formData.get('email');
            if (name) data.append('name', name as string);
            if (phone) data.append('phone', phone as string);
            if (email) data.append('email', email as string);
            data.append('video_ref', videoName);

            // Create the database record
            const record = await locals.pb.collection('room_videos_duplicate').create(data);

            return { success: true, videoId: record.id, status: 200 };
        } catch (err) {
            console.error('Error uploading video:', err);
            return fail(500, {
                error: true,
                message: 'Failed to upload video',
                data: Object.fromEntries(formData)
            });
        }
    },

    deleteVideo: async ({ params, locals, request }) => {
        if (!locals.pb.authStore.model?.superuser) {
            return {
                success: false,
                message: 'Unauthorized: Only super users can delete videos',
                status: 403
            };
        }
        const data = await request.formData();
        const videoId = data.get('id');
        const video_ref = data.get('ref')
        try {
            await locals.pb.collection('room_videos_duplicate').delete(videoId);
            const videoPath = join('static/video', `${video_ref}.mp4`);
            if (existsSync(videoPath)) {
                await unlinkSync(videoPath);
            }
            return { success: true, status: 200 };
        } catch (err) {
            console.error('Error deleting video:', err);
            return fail(400, { error: true, message: 'Failed to delete video' });
        }
    }
};