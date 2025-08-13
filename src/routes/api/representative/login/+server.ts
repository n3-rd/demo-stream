import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pb } from '$lib/pocketbase';
import { telnyxSMS } from '$lib/services/telnyx';

export const POST: RequestHandler = async ({ request }) => {
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
		await pb.collection('verification_codes').create({
			user_email: normalizedEmail,
			code,
			phone_number: normalizedPhone,
			expires_at: expiresAt.toISOString(),
			used: false,
			verification_type: 'sms'
		});

		// Send SMS
		await telnyxSMS.sendVerificationCode(normalizedPhone, code, company);

		return json({ success: true, message: 'Verification code sent via SMS', verification_type: 'sms' });
	} catch (err: any) {
		console.error('representative login error', err);
		return json({ success: false, message: err?.message || 'Internal error' }, { status: 500 });
	}
}; 