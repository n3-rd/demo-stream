import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	try {
		const { user } = await request.json();

		// Set multiple cookies to ensure persistence
		// 1. rep_user cookie for client-side access
		cookies.set('rep_user', JSON.stringify(user), {
			path: '/',
			httpOnly: false, // Allow client-side access
			secure: true,    // HTTPS only
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		// 2. rep_session cookie for server-side authentication
		cookies.set('rep_session', user.id, {
			path: '/',
			httpOnly: true,  // Prevent client-side access
			secure: true,    // HTTPS only
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		return json({ success: true });
	} catch (error) {
		console.error('Failed to set representative user cookie:', error);
		return json({ success: false, error: 'Cookie setting failed' }, { status: 500 });
	}
}; 