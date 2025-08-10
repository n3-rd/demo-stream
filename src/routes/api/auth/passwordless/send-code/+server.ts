import { json, type RequestHandler } from '@sveltejs/kit';
import { pb } from '$lib/pocketbase';
import { telnyxSMS } from '$lib/services/telnyx';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, phone } = await request.json();
    if (!email || !phone) return json({ success: false, message: 'Email and phone are required' }, { status: 400 });

    const formattedPhone = telnyxSMS.formatPhoneNumber(String(phone));
    if (!telnyxSMS.isValidPhoneNumber(formattedPhone)) {
      return json({ success: false, message: 'Invalid phone number. Use format like +170********' }, { status: 400 });
    }
    const user = await pb.collection('users').getFirstListItem(`email = "${email}"`).catch(() => null);
    if (!user) return json({ success: false, message: 'No account found for this email' }, { status: 404 });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pb.collection('verification_codes').create({
      user_email: email,
      code,
      phone_number: formattedPhone,
      expires_at: expiresAt.toISOString(),
      used: false,
      verification_type: 'sms'
    });

    const ok = await telnyxSMS.sendVerificationCode(formattedPhone, code, user.company_name || '');
    if (!ok) return json({ success: false, message: 'Failed to send code' }, { status: 500 });

    return json({ success: true, message: 'Code sent' });
  } catch (err) {
    console.error('passwordless send-code error', err);
    return json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}; 