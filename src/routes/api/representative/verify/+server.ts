import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pb } from '$lib/pocketbase';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const data = await request.json();
    const { email, code } = data || {};

    if (!email?.trim() || !code?.trim()) {
      return json({ success: false, message: 'Email and code are required' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const verification = await pb.collection('verification_codes').getFirstListItem(
      `user_email = "${normalizedEmail}" && code = "${code}" && used = false`
    ).catch(() => null);

    if (!verification) return json({ success: false, message: 'Invalid or expired code' }, { status: 400 });

    const expiresAt = new Date(verification.expires_at);
    if (expiresAt < new Date()) return json({ success: false, message: 'Code expired' }, { status: 400 });

    await pb.collection('verification_codes').update(verification.id, { used: true });

    // Lookup representative by email
    const rep = await pb.collection('representatives').getFirstListItem(`email = "${normalizedEmail}"`).catch(() => null);
    if (!rep) return json({ success: false, message: 'Representative not found' }, { status: 404 });

    // Issue representative session cookie
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const repSession = { id: rep.id, email: rep.email, name: rep.name, company: rep.company };

    cookies.set('rep_session', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8
    });
    cookies.set('rep_user', JSON.stringify(repSession), {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8
    });

    return json({ success: true, message: 'Representative verified', user: repSession });
  } catch (err: any) {
    console.error('representative verify error', err);
    return json({ success: false, message: err?.message || 'Internal error' }, { status: 500 });
  }
}; 