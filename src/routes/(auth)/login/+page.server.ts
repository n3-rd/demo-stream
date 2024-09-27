import type { Actions } from './$types';
import { ClientResponseError } from 'pocketbase';

export const actions: Actions = {
	login: async ({ request, locals }) => {
		const body = Object.fromEntries(await request.formData());

		try {
			await locals.pb.collection('users').authWithPassword(body.email, body.password);
			return { success: true, message: 'Logged in successfully' };
		} catch (err) {
			console.log('Error: ', err);
			if (err instanceof ClientResponseError) {
				switch (err.status) {
					case 400:
						return { success: false, message: 'Invalid email or password' };
					case 401:
						return { success: false, message: 'Email not verified' };
					case 403:
						return { success: false, message: 'Account is disabled' };
					default:
						return { success: false, message: 'An unexpected error occurred' };
				}
			}
			return { success: false, message: 'An unexpected error occurred' };
		}
	}
};
