// import type { PageServerLoad } from './$types';

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

	return {
		user,
		isLoggedIn,
		videoRecords,
		scheduled_rooms,
		quotes
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
	}
};
