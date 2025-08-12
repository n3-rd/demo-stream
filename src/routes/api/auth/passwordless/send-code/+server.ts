import { json, type RequestHandler } from '@sveltejs/kit';
import { pb } from '$lib/pocketbase';
import { telnyxSMS } from '$lib/services/telnyx';
import { BREVO_API_KEY } from '$env/static/private';
import { PUBLIC_SMTP_FROM } from '$env/static/public';

export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    const { email, phone } = await request.json();
    if (!email || !phone) return json({ success: false, message: 'Email and phone are required' }, { status: 400 });

    const providedPhone = telnyxSMS.formatPhoneNumber(String(phone));
    if (!telnyxSMS.isValidPhoneNumber(providedPhone)) {
      return json({ success: false, message: 'Invalid phone number. Use format like +170********' }, { status: 400 });
    }

    const user = await pb.collection('users').getFirstListItem(`email = "${email}"`).catch(() => null);
    if (!user) return json({ success: false, message: 'No account found for this email' }, { status: 404 });

    const storedPhone = telnyxSMS.formatPhoneNumber(String(user.phone || ''));
    if (!storedPhone) return json({ success: false, message: 'Account has no phone on file' }, { status: 400 });

    // Enforce phone matches stored record
    if (storedPhone !== providedPhone) {
      return json({ success: false, message: 'Phone number does not match our records' }, { status: 403 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pb.collection('verification_codes').create({
      user_email: email,
      code,
      phone_number: storedPhone,
      expires_at: expiresAt.toISOString(),
      used: false,
      verification_type: 'sms'
    });

    let smsSent = false;
    let emailSent = false;

    // Send SMS to stored phone only
    try {
      smsSent = !!(await telnyxSMS.sendVerificationCode(storedPhone, code, user.company_name || ''));
    } catch (e) {
      console.error('passwordless sms send error', e);
    }

    // Send Email via Brevo
    try {
      if (!BREVO_API_KEY || !PUBLIC_SMTP_FROM) throw new Error('Brevo env not configured');
      const emailPayload = {
        sender: { name: "Viewroom.ca", email: PUBLIC_SMTP_FROM },
        to: [{ email, name: user.company_name || 'User' }],
        subject: 'Your Login Code',
        htmlContent: `
          <div style="font-family: Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="text-align:center;color:#333;">Login Verification</h2>
            <p>Hello${user.company_name ? ` ${user.company_name}` : ''},</p>
            <p>Your login code is:</p>
            <div style="background:#f8f9fa;border:2px solid #e9ecef;padding:30px;text-align:center;font-size:36px;font-weight:bold;letter-spacing:8px;margin:30px 0;border-radius:8px;color:#495057;">${code}</div>
            <p><strong>This code expires in 10 minutes.</strong></p>
          </div>
        `,
        tags: ['passwordless', 'verification']
      };
      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { accept: 'application/json', 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify(emailPayload)
      });
      emailSent = resp.ok;
      if (!resp.ok) {
        const t = await resp.text();
        console.error('passwordless email send error', t);
      }
    } catch (e) {
      console.error('passwordless email send exception', e);
    }

    if (!smsSent && !emailSent) return json({ success: false, message: 'Failed to send code' }, { status: 500 });

    return json({ success: true, message: smsSent && emailSent ? 'Code sent via SMS and Email' : smsSent ? 'Code sent via SMS' : 'Code sent via Email' });
  } catch (err) {
    console.error('passwordless send-code error', err);
    return json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}; 