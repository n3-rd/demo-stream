// import { error, redirect } from '@sveltejs/kit';
export const actions = {
	login: async ({ request, locals }) => {
		const body = Object.fromEntries(await request.formData());

		try {
			await locals.pb.collection('users').authWithPassword(body.email, body.password);
		} catch (err) {
			console.log('Error: ', err);
			return { success: false, message: 'Something went wrong logging in' };
		}

		return { success: true, message: 'logged in successfully' };
	}
};
