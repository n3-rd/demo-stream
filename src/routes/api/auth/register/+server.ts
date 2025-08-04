import { json, type RequestHandler } from '@sveltejs/kit';
import { telnyxSMS } from '$lib/services/telnyx';

export const POST: RequestHandler = async ({ request, locals }) => {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const website = formData.get('website') as string;

    if (!name || !email || !phone) {
        return new Response(JSON.stringify({ 
            type: 'failure', 
            data: { message: 'Name, email, and phone are required' } 
        }), { status: 400 });
    }

    // Validate phone number format
    if (!telnyxSMS.isValidPhoneNumber(phone)) {
        return new Response(JSON.stringify({ 
            type: 'failure', 
            data: { message: 'Invalid phone number format. Please use a valid phone number with country code.' } 
        }), { status: 400 });
    }

    try {
        // Check if email already exists
        try {
            const existingUser = await locals.pb.collection('users').getFirstListItem(`email = "${email}"`);
            if (existingUser) {
                return new Response(JSON.stringify({ 
                    type: 'failure', 
                    data: { message: 'An account with this email already exists' } 
                }), { status: 400 });
            }
        } catch (err) {
            // User doesn't exist, which is what we want
        }

        const formattedPhone = telnyxSMS.formatPhoneNumber(phone);
        
        // Check if there's already a pending verification for this email/phone
        try {
            const existingVerification = await locals.pb.collection('admin_phone_verification')
                .getList(1, 1, {
                    filter: `phone = "${formattedPhone}" && email = "${email}" && used = false && expires_at > "${new Date().toISOString()}"`
                });

            if (existingVerification.items.length > 0) {
                return new Response(JSON.stringify({ 
                    type: 'failure', 
                    data: { message: 'A verification code was already sent recently. Please check your phone or wait before requesting a new one.' } 
                }), { status: 400 });
            }
        } catch (err) {
            // No existing verification, continue
        }

        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store complete registration data in verification record
        const verificationData = await locals.pb.collection('admin_phone_verification').create({
            phone: formattedPhone,
            verification_code: verificationCode,
            email: email,
            expires_at: expiresAt.toISOString(),
            used: false,
            company_name: name,
            password: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            website: website || ''
        });

        // Send SMS via Telnyx
        const smsSent = await telnyxSMS.sendVerificationCode(
            formattedPhone,
            verificationCode,
            name
        );

        if (!smsSent) {
            // If SMS failed, delete the verification record
            await locals.pb.collection('admin_phone_verification').delete(verificationData.id).catch(() => {});
            return new Response(JSON.stringify({ 
                type: 'failure', 
                data: { message: 'Failed to send verification code. Please try again.' } 
            }), { status: 500 });
        }

        return new Response(JSON.stringify({ 
            type: 'success', 
            data: { 
                success: false, // Not actually successful yet, need verification
                verification_required: true,
                email: email,
                phone: formattedPhone,
                company_name: name,
                message: `Verification code sent to ${formattedPhone.slice(-4)} digits. Please check your phone.`
            } 
        }), { status: 200 });
    } catch (error) {
        console.error('Registration error:', error);
        return new Response(JSON.stringify({ 
            type: 'failure', 
            data: { message: 'Registration failed' } 
        }), { status: 500 });
    }
}; 