import { json, type RequestHandler } from '@sveltejs/kit';
import { telnyxSMS } from '$lib/services/telnyx';
import { BREVO_API_KEY } from '$env/static/private';
import { PUBLIC_SMTP_FROM } from '$env/static/public';

export const POST: RequestHandler = async ({ request, locals, fetch }) => {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const website = formData.get('website') as string;
    const password = formData.get('password') as string;
    const passwordConfirm = formData.get('passwordConfirm') as string;

    if (!name || !email || !phone || !password || !passwordConfirm) {
        return new Response(JSON.stringify({ type: 'failure', data: { message: 'Name, email, and phone are required' } }), { status: 400 });
    }

    // Validate phone number format
    if (!telnyxSMS.isValidPhoneNumber(phone)) {
        return new Response(JSON.stringify({ type: 'failure', data: { message: 'Invalid phone number format. Please use a valid phone number with country code.' } }), { status: 400 });
    }

    try {
        // Check if email already exists
        try {
            const existingUser = await locals.pb.collection('users').getFirstListItem(`email = "${email}"`);
            if (existingUser) {
                return new Response(JSON.stringify({ type: 'failure', data: { message: 'An account with this email already exists' } }), { status: 400 });
            }
        } catch {}

        const formattedPhone = telnyxSMS.formatPhoneNumber(phone);

        // Check for existing pending verification
        let existingVerificationRecord: any | null = null;
        try {
            const existingVerification = await locals.pb.collection('admin_phone_verification').getList(1, 1, {
                filter: `phone = "${formattedPhone}" && email = "${email}" && used = false && expires_at > "${new Date().toISOString()}"`,
                sort: '-created'
            });
            existingVerificationRecord = existingVerification.items[0] || null;
        } catch {}

        // Helper to send email via Brevo
        const sendEmail = async (code: string) => {
            if (!BREVO_API_KEY || !PUBLIC_SMTP_FROM) return false;
            const emailPayload = {
                sender: { name: "Viewroom.ca", email: PUBLIC_SMTP_FROM },
                to: [{ email, name }],
                subject: 'Your verification code',
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #333; text-align: center;">Account Verification</h2>
                      <p>Hello ${name},</p>
                      <p>Your verification code is:</p>
                      <div style="background: #f8f9fa; border: 2px solid #e9ecef; padding: 30px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 30px 0; border-radius: 8px; color: #495057;">${code}</div>
                      <p><strong>This code expires in 10 minutes.</strong></p>
                    </div>
                `,
                tags: ['registration', 'verification', 'email']
            };
            const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: { accept: 'application/json', 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
                body: JSON.stringify(emailPayload)
            });
            if (!resp.ok) {
                const t = await resp.text();
                console.error('Brevo email send error:', t);
            }
            return resp.ok;
        };

        // If pending exists, generate a fresh code, update the record, and resend
        if (existingVerificationRecord) {
            const freshCode = Math.floor(100000 + Math.random() * 900000).toString();
            const freshExpiry = new Date(Date.now() + 10 * 60 * 1000);

            await locals.pb.collection('admin_phone_verification').update(existingVerificationRecord.id, {
                verification_code: freshCode,
                expires_at: freshExpiry.toISOString(),
                company_name: name,
                password: password,
                website: website || ''
            });

            let smsSent = false;
            let emailSent = false;
            await Promise.all([
                (async () => {
                    try { smsSent = !!(await telnyxSMS.sendVerificationCode(formattedPhone, freshCode, name)); } catch (e) { console.error('SMS resend error:', e); }
                })(),
                (async () => { try { emailSent = await sendEmail(freshCode); } catch (e) { console.error('Email resend error:', e); } })()
            ]);

            if (!smsSent && !emailSent) {
                return new Response(JSON.stringify({ type: 'failure', data: { message: 'Failed to send verification code via SMS and Email. Please try again.' } }), { status: 500 });
            }

            return new Response(JSON.stringify({
                type: 'success',
                data: {
                    success: false,
                    verification_required: true,
                    email,
                    phone: formattedPhone,
                    company_name: name,
                    email_verification_sent: emailSent,
                    sms_verification_sent: smsSent,
                    message: smsSent && emailSent ? `Verification code sent to phone (ending ${formattedPhone.slice(-4)}) and email.` : emailSent ? 'Verification code sent to email.' : `Verification code sent to phone (ending ${formattedPhone.slice(-4)}).`
                }
            }), { status: 200 });
        }

        // Generate new code and store
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Validate password match
        if (password !== passwordConfirm) {
            return new Response(JSON.stringify({ type: 'failure', data: { message: 'Passwords do not match' } }), { status: 400 });
        }

        const verificationData = await locals.pb.collection('admin_phone_verification').create({
            phone: formattedPhone,
            verification_code: verificationCode,
            email: email,
            expires_at: expiresAt.toISOString(),
            used: false,
            company_name: name,
            password: password,
            website: website || ''
        });

        let smsSent = false;
        let emailSent = false;
        await Promise.all([
            (async () => {
                try { smsSent = !!(await telnyxSMS.sendVerificationCode(formattedPhone, verificationCode, name)); } catch (e) { console.error('SMS send error:', e); }
            })(),
            (async () => { try { emailSent = await sendEmail(verificationCode); } catch (e) { console.error('Email send error:', e); } })()
        ]);

        if (!smsSent && !emailSent) {
            await locals.pb.collection('admin_phone_verification').delete(verificationData.id).catch(() => {});
            return new Response(JSON.stringify({ type: 'failure', data: { message: 'Failed to send verification code via SMS and Email. Please try again.' } }), { status: 500 });
        }

        return new Response(JSON.stringify({
            type: 'success',
            data: {
                success: false,
                verification_required: true,
                email: email,
                phone: formattedPhone,
                company_name: name,
                email_verification_sent: emailSent,
                sms_verification_sent: smsSent,
                message: smsSent && emailSent ? `Verification code sent to phone (ending ${formattedPhone.slice(-4)}) and email.` : emailSent ? 'Verification code sent to email.' : `Verification code sent to phone (ending ${formattedPhone.slice(-4)}).`
            }
        }), { status: 200 });
    } catch (error) {
        console.error('Registration error:', error);
        return new Response(JSON.stringify({ type: 'failure', data: { message: 'Registration failed' } }), { status: 500 });
    }
}; 