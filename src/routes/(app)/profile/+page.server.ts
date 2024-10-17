// import type { PageServerLoad } from './$types';
import { PUBLIC_DAILY_API_KEY } from '$env/static/public';
import { error } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const userId = locals.pb.authStore.model.id;
	const isLoggedIn = locals.pb.authStore.isValid;
	const user = locals.pb.authStore.model;
	const isRepresentative = user.representative;
	const videoRecords = await locals.pb.collection('videos').getFullList({
		filter: `user="${userId}"`
	});

	const scheduled_rooms = await locals.pb.collection('scheduled_rooms').getFullList({
		sort: '-created',
		filter: `user="${userId}"`
	});
	let quotes = null;
	if (isRepresentative) {
	
	quotes = await locals.pb.collection('quotes').getFullList({
		sort: '-created',
	});
	}

	const avatarUrl = user.avatar ? locals.pb.files.getUrl(user, user.avatar) : null;

	return {
		user,
		isLoggedIn,
		videoRecords,
		scheduled_rooms,
		quotes,
		avatarUrl
	};
};

export const actions = {
    'upload-video': async ({ cookies, request, locals }) => {
        const userId = locals.pb.authStore.model.id;
        console.log('userId:', userId);

        const formData = new FormData();
        const data = await request.formData();
        let name = data.get('name');
        let video = data.get('video');

        if (!video) {
            return { success: false, message: 'No video was uploaded' };
        }

        // Append the video file to the form data
        formData.append('video', video);

        // Append the user id to the form data
        formData.append('user', userId);
        formData.append('name', name);

        // Upload and create new record
        try {
            const result = await locals.pb.collection('videos').create(formData);
            console.log('result:', result);
            return { success: true, message: 'Video uploaded successfully' };
        } catch (err) {
            console.log('err:', err);
            return { success: false, message: 'Failed to upload video' };
        }
    },
    'delete-meeting': async ({ request, locals }) => {
        try {
            const formData = await request.formData();
            const meetingId = formData.get('meetingId');
            const dailyRoomName = formData.get('dailyRoomName');
            console.log('Received payload:', { meetingId, dailyRoomName });

            // Delete the meeting from Daily API
            const dailyResponse = await fetch(`https://api.daily.co/v1/rooms/${dailyRoomName}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${PUBLIC_DAILY_API_KEY}`
                }
            });

            if (!dailyResponse.ok) {
                const errorData = await dailyResponse.json();
                console.error('Failed to delete Daily room:', errorData);
                throw new Error('Failed to delete Daily room');
            }

            console.log('Daily room deleted:', dailyRoomName);

            // Delete the meeting from PocketBase
            await locals.pb.collection('scheduled_rooms').delete(meetingId);
            console.log('Meeting deleted from PocketBase:', meetingId);

            return { success: true, message: 'Meeting deleted successfully' };
        } catch (err) {
            console.error('Failed to delete meeting:', err);
            return { success: false, message: 'Failed to delete meeting' };
        }
    },
    'update-avatar': async ({ request, locals }) => {
        const userId = locals.pb.authStore.model.id;
        const formData = await request.formData();
        const avatarFile = formData.get('avatar') as File;

        if (!avatarFile) {
            throw error(400, 'No file uploaded');
        }

        try {
            const user = await locals.pb.collection('users').update(userId, {
                avatar: avatarFile
            });

            return { success: true, user };
        } catch (err) {
            console.error('Failed to update avatar:', err);
            throw error(500, 'Failed to update avatar');
        }
    }
};
