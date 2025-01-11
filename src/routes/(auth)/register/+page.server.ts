import { generateUserName } from '$lib/helpers/generateUserName';
import { error, redirect } from '@sveltejs/kit';

export const actions = {
	register: async ({ locals, request }) => {
		const body = Object.fromEntries(await request.formData());
		console.log('body', body);

		const username = generateUserName(body.name.split(' ').join('')).toLowerCase();

		try {
			// Create the company account
			const company = await locals.pb.collection('users').create({ 
				username, 
				company_name: body.name,
				email: body.email,
				password: body.password,
				passwordConfirm: body.passwordConfirm,
				phone: body.phone || '',
				website: body.website || '',
			});

			// Auto-login after registration
			await locals.pb.collection('users').authWithPassword(body.email, body.password);
		} catch (err) {
			console.log('Error: ', err);
			return { success: false, message: 'Something went wrong while registering' };
		}

		return { success: true, message: 'Registered successfully' };
	}
};
