import type { Actions } from './$types';

export const actions: Actions = {
	login: async ({ request, locals }) => {
		const body = Object.fromEntries(await request.formData());

		try {
			await locals.pb.collection('users').authWithPassword(body.email as string, body.password as string);
			return { success: true, message: 'Logged in successfully' };
		} catch (err) {
			console.log('Error: ', err);
			return { success: false, message: 'Invalid email or password' };
		}
	}
};
