import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pb } from '$lib/pocketbase';
import { telnyxSMS } from '$lib/services/telnyx';
import { BREVO_API_KEY } from '$env/static/private';
import { PUBLIC_SMTP_FROM } from '$env/static/public';

export const POST: RequestHandler = async ({ request, fetch, cookies }) => {
	try {
		const body = await request.json().catch(() => ({}));
		let { email, phone } = body;

		// If no email/phone in body, try to get from session
		if (!email || !phone) {
			const repId = cookies.get('rep_session');
			if (repId) {
				const rep = await pb.collection('representatives').getOne(repId).catch(() => null);
				if (rep) {
					email = rep.email;
					phone = rep.phone;
				}
			}
		}

		if (!email?.trim() || !phone?.trim()) {
			return json({ success: false, message: 'Email and phone number are required.' }, { status: 400 });
		}

		// Normalize input
		const normalizedEmail = String(email).trim().toLowerCase();
		const normalizedPhone = telnyxSMS.formatPhoneNumber(String(phone));

		// Find representative to ensure they exist
		const reps = await pb.collection('representatives').getFullList({
			filter: `email = "${normalizedEmail}" && phone = "${normalizedPhone}"`,
			expand: 'company'
		});
		const rep = reps[0];

		if (!rep) {
			return json({ success: false, message: 'Representative record not found.' }, { status: 404 });
		}

		// Get company name for SMS
		let companyName = 'Viewroom.ca';
		if (rep.expand?.company?.company_name) {
			companyName = rep.expand.company.company_name;
		}

		// Generate 5-digit code
		const code = Math.floor(10000 + Math.random() * 90000).toString();
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
		
		// Create verification codes in PocketBase (matches login pattern)
		await pb.collection('verification_codes').create({
			user_email: normalizedEmail,
			code,
			phone_number: normalizedPhone,
			expires_at: expiresAt.toISOString(),
			used: false,
			verification_type: 'sms'
		});

		await pb.collection('verification_codes').create({
			user_email: normalizedEmail,
			code,
			phone_number: normalizedPhone,
			expires_at: expiresAt.toISOString(),
			used: false,
			verification_type: 'email'
		});

		let smsSent = false;
		let emailSent = false;

		// Send SMS via Telnyx
		try {
			const message = `Your ${companyName} account DELETION code is: ${code}. This code expires in 5 minutes.`;
			smsSent = await telnyxSMS.sendSMS(normalizedPhone, message);
		} catch (e) {
			console.error('representative deletion sms send error', e);
		}

		// Send Email via Brevo
		try {
			const emailPayload = {
				sender: { name: "Viewroom.ca", email: PUBLIC_SMTP_FROM },
				to: [{ email: normalizedEmail, name: rep.name || 'Representative' }],
				subject: 'Account Deletion Verification Code',
				htmlContent: `
					<div style="font-family: Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border: 1px solid #ff4d4d;border-radius:8px;">
						<h2 style="text-align:center;color:#cc0000;">Account Deletion Request</h2>
						<p>Hello${rep.name ? ` ${rep.name}` : ''},</p>
						<p>To proceed with your account deletion, please use the following verification code:</p>
						<div style="background:#fff5f5;border:2px solid #ffcccc;padding:30px;text-align:center;font-size:36px;font-weight:bold;letter-spacing:8px;margin:30px 0;border-radius:8px;color:#cc0000;">${code}</div>
						<p><strong>This code expires in 5 minutes.</strong></p>
					</div>
				`,
				tags: ['representative', 'deletion-verification']
			};
			
			const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
				method: 'POST',
				headers: { accept: 'application/json', 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
				body: JSON.stringify(emailPayload)
			});
			emailSent = resp.ok;
		} catch (e) {
			console.error('representative deletion email send exception', e);
		}

		return json({ 
			success: true, 
			message: (smsSent || emailSent) ? 'Verification code sent.' : 'Failed to send verification code.',
			verification_type: smsSent && emailSent ? 'both' : smsSent ? 'sms' : 'email' 
		});
	} catch (err: any) {
		console.error('representative deletion request error', err);
		return json({ success: false, message: err?.message || 'Internal error' }, { status: 500 });
	}
};
