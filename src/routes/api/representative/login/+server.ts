import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pb } from '$lib/pocketbase';
import { telnyxSMS } from '$lib/services/telnyx';
import { BREVO_API_KEY } from '$env/static/private';
import { PUBLIC_SMTP_FROM } from '$env/static/public';

export const POST: RequestHandler = async ({ request, fetch }) => {
	try {
		const data = await request.json();
		const { email, phone } = data || {};

		if (!email?.trim() || !phone?.trim()) {
			return json({ success: false, message: 'Missing required fields: email and phone' }, { status: 400 });
		}

		// Normalize input
		const normalizedEmail = String(email).trim().toLowerCase();
		const normalizedPhone = telnyxSMS.formatPhoneNumber(String(phone));
		if (!telnyxSMS.isValidPhoneNumber(normalizedPhone)) {
			return json({ success: false, message: 'Invalid phone number. Use format like +170********' }, { status: 400 });
		}

		// Find representative by email + phone
		const reps = await pb.collection('representatives').getFullList({
			filter: `email = "${normalizedEmail}" && phone = "${normalizedPhone}"`,
			expand: 'company'
		});
		const rep = reps[0];
		if (!rep) {
			return json({ success: false, message: 'Representative not found' }, { status: 404 });
		}

		// Get company name for SMS
		let companyName = 'Viewroom.ca';
		if (rep.expand?.company?.company_name) {
			companyName = rep.expand.company.company_name;
		} else if (typeof rep.company === 'string') {
			try {
				const company = await pb.collection('users').getOne(rep.company);
				companyName = company.company_name || companyName;
			} catch {}
		}

		// Generate code and store in verification_codes
		const code = Math.floor(10000 + Math.random() * 90000).toString();
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
		
		// Create SMS verification code
		await pb.collection('verification_codes').create({
			user_email: normalizedEmail,
			code,
			phone_number: normalizedPhone,
			expires_at: expiresAt.toISOString(),
			used: false,
			verification_type: 'sms'
		});

		// Create Email verification code
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
			smsSent = !!(await telnyxSMS.sendVerificationCode(normalizedPhone, code, companyName));
		} catch (e) {
			console.error('representative sms send error', e);
		}

		// Send Email via Brevo
		try {
			const emailPayload = {
				sender: { name: "Viewroom.ca", email: PUBLIC_SMTP_FROM },
				to: [{ email: normalizedEmail, name: rep.name || 'Representative' }],
				subject: 'Your Login Code',
				htmlContent: `
					<div style="font-family: Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
						<h2 style="text-align:center;color:#333;">Login Verification</h2>
						<p>Hello${rep.name ? ` ${rep.name}` : ''},</p>
						<p>Your login code is:</p>
						<div style="background:#f8f9fa;border:2px solid #e9ecef;padding:30px;text-align:center;font-size:36px;font-weight:bold;letter-spacing:8px;margin:30px 0;border-radius:8px;color:#495057;">${code}</div>
						<p><strong>This code expires in 5 minutes.</strong></p>
					</div>
				`,
				tags: ['representative', 'verification']
			};
			console.log('Email Payload:', JSON.stringify(emailPayload, null, 2));
			const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
				method: 'POST',
				headers: { accept: 'application/json', 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
				body: JSON.stringify(emailPayload)
			});
			console.log('Email Response Status:', resp.status);
			const respText = await resp.text();
			console.log('Email Response Body:', respText);
			emailSent = resp.ok;
			if (!resp.ok) {
				console.error('representative email send error', respText);
			}
		} catch (e) {
			console.error('representative email send exception', e);
		}

		const verificationMessage = smsSent && emailSent 
			? 'Verification code sent via SMS and Email' 
			: smsSent 
				? 'Verification code sent via SMS' 
				: 'Verification code sent via Email';

		return json({ 
			success: true, 
			message: verificationMessage, 
			verification_type: smsSent && emailSent ? 'both' : smsSent ? 'sms' : 'email' 
		});
	} catch (err: any) {
		console.error('representative login error', err);
		return json({ success: false, message: err?.message || 'Internal error' }, { status: 500 });
	}
}; 