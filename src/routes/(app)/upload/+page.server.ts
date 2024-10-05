import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

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

function checkFolder() {
    if (!existsSync('static/video')) {
        mkdirSync('static/video');
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
        const video = formData.get('video') as File | null;
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
        // if (video) data.append('video', video);
        let videoBuffer = await video.arrayBuffer();
        let videoName = random_ref();
        console.log('videoBuffer', videoBuffer);
        if (thumbnail) data.append('thumbnail', thumbnail);
        representatives.forEach(rep => data.append('representatives', rep));

        checkFolder();

        try {
            writeFileSync(`static/video/${videoName}.mp4`, Buffer.from(videoBuffer));
        } catch (e) {
            console.log(e);
            return fail(500, { error: true, message: 'Failed to save video file' });
        }

        // Optional fields
        const name = formData.get('name');
        const phone = formData.get('phone');
        const email = formData.get('email');
        if (name) data.append('name', name as string);
        if (phone) data.append('phone', phone as string);
        if (email) data.append('email', email as string);
        data.append('video_ref', videoName as string)

        try {
            const record = await locals.pb.collection('room_videos_duplicate').create(data);

            // Redirect to the newly created room or a success page
            return { success: true, videoId: record.id, status: 200 };
        } catch (err) {
            console.error('Error creating video:', err);
            return fail(400, {
                error: true,
                message: 'Failed to create video',
                data: Object.fromEntries(formData)  // Use formData instead of data for re-population
            });
        }
    }
};