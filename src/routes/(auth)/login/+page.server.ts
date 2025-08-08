import type { Actions } from './$types';

export const actions: Actions = {
	login: async ({ request, locals, cookies }) => {
		const body = Object.fromEntries(await request.formData()) as Record<string, string>;

		try {
			const auth = await locals.pb.authWithPassword(body.email, body.password);
			if (auth?.token) {
				cookies.set('session', auth.token, {
					path: '/',
					httpOnly: true,
					secure: false,
					sameSite: 'lax',
					maxAge: 60 * 60 * 24 * 30
				});
			}
			return { success: true, message: 'Logged in successfully' };
		} catch (err: any) {
			console.log('Error: ', err);
			return { success: false, message: 'Invalid email or password' };
		}
	}
};
