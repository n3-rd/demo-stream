import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pb } from '$lib/pocketbase';
import { telnyxSMS } from '$lib/services/telnyx';
import { BREVO_API_KEY } from '$env/static/private';
import { PUBLIC_BREVO_SENDER_EMAIL, PUBLIC_SMTP_FROM } from '$env/static/public';

export const POST: RequestHandler = async ({ request, fetch }) => {
	try {
		const data = await request.json();
		const { first_name, last_name, company, email, phone, roomId } = data || {};

		if (!first_name?.trim() || !last_name?.trim() || !company?.trim() || !email?.trim() || !phone?.trim()) {
			return json({ success: false, message: 'Missing required fields' }, { status: 400 });
		}

		// Normalize input
		const normalizedEmail = String(email).trim().toLowerCase();
		const normalizedPhone = telnyxSMS.formatPhoneNumber(String(phone));
		if (!telnyxSMS.isValidPhoneNumber(normalizedPhone)) {
			return json({ success: false, message: 'Invalid phone number. Use format like +170********' }, { status: 400 });
		}

		// Resolve company id
		let companyId: string | null = null;
		if (roomId) {
			try {
				const room = await pb.collection('rooms').getOne(roomId);
				companyId = room.owner_company || null;
			} catch {}
		}
		if (!companyId) {
			try {
				const userCompany = await pb.collection('users').getFirstListItem(`company_name = "${company.trim()}"`);
				companyId = userCompany?.id || null;
			} catch {}
		}
		if (!companyId) {
			return json({ success: false, message: 'Company not found' }, { status: 404 });
		}

		// Find representative by company + email + phone
		const reps = await pb.collection('representatives').getFullList({
			filter: `company = "${companyId}" && email = "${normalizedEmail}" && phone = "${normalizedPhone}"`
		});
		const rep = reps[0];
		if (!rep) {
			return json({ success: false, message: 'Representative not found or phone/email mismatch' }, { status: 404 });
		}

		// Optional name check against stored rep.name if available
		if (rep.name) {
			const parts = String(rep.name).trim().split(/\s+/);
			const repFirst = parts[0] || '';
			const repLast = parts.slice(1).join(' ') || '';
			if (repFirst !== first_name.trim() || repLast !== last_name.trim()) {
				return json({ success: false, message: 'Name does not match our records' }, { status: 403 });
			}
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

		// Send SMS
		try {
			smsSent = !!(await telnyxSMS.sendVerificationCode(normalizedPhone, code, company));
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