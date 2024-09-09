import { generateUserName } from '$lib/helpers/generateUserName';
import { error, redirect } from '@sveltejs/kit';

export const actions = {
	register: async ({ locals, request }) => {
		const body = Object.fromEntries(await request.formData());
		console.log('body', body);

		const username = generateUserName(body.name.split(' ').join('')).toLowerCase();

		try {
			await locals.pb.collection('users').create({ username, ...body });
		} catch (err) {
			console.log('Error: ', err);
			return { success: false, message: 'Something went wrong while registering' };
		}

		return { success: true, message: 'Registered successfully' };
	}
};
