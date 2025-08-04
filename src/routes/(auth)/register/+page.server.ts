import { generateUserName } from '$lib/helpers/generateUserName';
import { telnyxSMS } from '$lib/services/telnyx';
import { error, redirect } from '@sveltejs/kit';

export const actions = {
	register: async ({ locals, request }) => {
		const body = Object.fromEntries(await request.formData());
		console.log('📝 Admin registration attempt:', body);

		// Validate required fields
		if (!body.name || !body.email || !body.password || !body.passwordConfirm || !body.phone) {
			return { 
				type: 'failure',
				data: { 
					success: false, 
					message: 'All fields are required: company name, email, password, confirm password, and phone number' 
				}
			};
		}

		// Validate phone number format
		if (!telnyxSMS.isValidPhoneNumber(body.phone.toString())) {
			return { 
				type: 'failure',
				data: { 
					success: false, 
					message: 'Invalid phone number format. Please use a valid phone number with country code.' 
				}
			};
		}

		// Validate password match
		if (body.password !== body.passwordConfirm) {
			return { 
				type: 'failure',
				data: { 
					success: false, 
					message: 'Passwords do not match' 
				}
			};
		}

		// Check if email already exists
		try {
			const existingUser = await locals.pb.collection('users').getFirstListItem(`email = "${body.email}"`);
			if (existingUser) {
				return { 
					type: 'failure',
					data: { 
						success: false, 
						message: 'An account with this email already exists' 
					}
				};
			}
		} catch (err) {
			// User doesn't exist, which is what we want
		}

		// Store full registration data in verification record
		const formattedPhone = telnyxSMS.formatPhoneNumber(body.phone.toString());
		
		// Check if there's already a pending verification for this email/phone
		try {
			const existingVerification = await locals.pb.collection('admin_phone_verification')
				.getList(1, 1, {
					filter: `phone = "${formattedPhone}" && email = "${body.email}" && used = false && expires_at > "${new Date().toISOString()}"`
				});

			if (existingVerification.items.length > 0) {
				return { 
					type: 'failure',
					data: { 
						success: false, 
						message: 'A verification code was already sent recently. Please check your phone or wait before requesting a new one.'
					}
				};
			}
		} catch (err) {
			// No existing verification, continue
		}

		// Generate verification code
		const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

		// Store complete registration data in verification record
		try {
			const verificationData = await locals.pb.collection('admin_phone_verification').create({
				phone: formattedPhone,
				verification_code: verificationCode,
				email: body.email.toString(),
				expires_at: expiresAt.toISOString(),
				used: false,
				company_name: body.name.toString(),
				password: body.password.toString(),
				website: body.website?.toString() || ''
			});

			// Send SMS via Telnyx
			const smsSent = await telnyxSMS.sendVerificationCode(
				formattedPhone,
				verificationCode,
				body.name.toString()
			);

			if (!smsSent) {
				// If SMS failed, delete the verification record
				await locals.pb.collection('admin_phone_verification').delete(verificationData.id).catch(() => {});
				return {
					type: 'failure',
					data: {
						success: false,
						message: 'Failed to send verification code. Please try again.'
					}
				};
			}

			console.log('📱 Phone verification sent, redirecting to verification page...');

			return { 
				type: 'success',
				data: {
					success: false, // Not actually successful yet, need verification
					verification_required: true,
					email: body.email.toString(),
					phone: formattedPhone,
					company_name: body.name.toString(),
					message: `Verification code sent to ${formattedPhone.slice(-4)} digits. Please check your phone.`
				}
			};

		} catch (error) {
			console.error('❌ Error creating verification record:', error);
			return { 
				success: false, 
				message: 'Failed to send verification code. Please try again.' 
			};
		}
	}
};
