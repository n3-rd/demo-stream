import { json, type RequestHandler } from '@sveltejs/kit';
import { pb } from '$lib/pocketbase';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { email, code } = await request.json();
    if (!email || !code) return json({ success: false, message: 'Email and code are required' }, { status: 400 });

    const verification = await pb.collection('verification_codes').getFirstListItem(
      `user_email = "${email}" && code = "${code}" && used = false`
    ).catch(() => null);

    if (!verification) return json({ success: false, message: 'Invalid or expired code' }, { status: 400 });

    const expiresAt = new Date(verification.expires_at);
    if (expiresAt < new Date()) return json({ success: false, message: 'Code expired' }, { status: 400 });

    await pb.collection('verification_codes').update(verification.id, { used: true });

    const user = await pb.collection('users').getFirstListItem(`email = "${email}"`).catch(() => null);
    if (!user) return json({ success: false, message: 'User not found' }, { status: 404 });

    const auth = await pb.createSessionForUser(user.id);
    if (auth?.token) {
      cookies.set('session', auth.token, {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30
      });
    }

    return json({ success: true });
  } catch (err) {
    console.error('passwordless verify error', err);
    return json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}; 