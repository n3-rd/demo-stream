import { pb } from '$lib/pocketbase';
import { telnyxSMS } from '$lib/services/telnyx';
import crypto from 'crypto';
import { BREVO_API_KEY } from '$env/static/private';
import { PUBLIC_SMTP_FROM } from '$env/static/public';

export interface AdminPhoneVerificationRequest {
  phone: string;
  email: string;
  company_name: string;
}

export interface AdminPhoneVerificationData {
  phone: string;
  verification_code: string;
  email: string;
  expires_at: string;
  used: boolean;
  company_name: string;
}

export interface PhoneVerificationResult {
  success: boolean;
  message: string;
  verification_id?: string;
}

export interface PhoneVerificationValidation {
  success: boolean;
  message: string;
  data?: AdminPhoneVerificationData;
}

/**
 * Generate a secure random verification code
 */
function generateVerificationCode(): string {
  // Generate a 6-digit verification code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send phone verification code for admin signup
 */
export async function sendAdminPhoneVerification(
  request: AdminPhoneVerificationRequest
): Promise<PhoneVerificationResult> {
  try {
    // Validate phone number format
    if (!telnyxSMS.isValidPhoneNumber(request.phone)) {
      return {
        success: false,
        message: 'Invalid phone number format. Please use a valid phone number with country code.'
      };
    }

    // Format phone number to E.164
    const formattedPhone = telnyxSMS.formatPhoneNumber(request.phone);

    // Check if there's already a pending verification for this phone/email combination
    const existingVerification = await pb.collection('admin_phone_verification')
      .getList(1, 1, {
        filter: `phone = "${formattedPhone}" && email = "${request.email}" && used = false && expires_at > "${new Date().toISOString()}"`
      }).catch(() => ({ items: [] }));

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    let verificationData: any;

    if (existingVerification.items.length > 0) {
      // Update existing record with fresh code and expiry
      verificationData = await pb.collection('admin_phone_verification').update(existingVerification.items[0].id, {
        verification_code: verificationCode,
        expires_at: expiresAt.toISOString(),
        company_name: request.company_name
      });
    } else {
      // Store new verification code in database
      verificationData = await pb.collection('admin_phone_verification').create({
        phone: formattedPhone,
        verification_code: verificationCode,
        email: request.email,
        expires_at: expiresAt.toISOString(),
        used: false,
        company_name: request.company_name
      });
    }

    // Send SMS via Telnyx
    const smsSent = await telnyxSMS.sendVerificationCode(
      formattedPhone,
      verificationCode,
      request.company_name
    );

    if (!smsSent) {
      // If SMS failed, delete the verification record
      await pb.collection('admin_phone_verification').delete(verificationData.id).catch(() => {});
      return {
        success: false,
        message: 'Failed to send verification code. Please try again.'
      };
    }

    console.log(`📱 Phone verification sent for admin signup: ${request.email} -> ${formattedPhone}`);

    return {
      success: true,
      message: `Verification code sent to ${formattedPhone.slice(-4)} digits. Please check your phone.`,
      verification_id: verificationData.id
    };

  } catch (error) {
    console.error('❌ Error sending admin phone verification:', error);
    return {
      success: false,
      message: 'Failed to send verification code. Please try again.'
    };
  }
}

/**
 * Send email verification code for admin signup
 */
export async function sendAdminEmailVerification(
  request: AdminPhoneVerificationRequest
): Promise<PhoneVerificationResult> {
  try {
    if (!BREVO_API_KEY) {
      return { success: false, message: 'Email service not configured' };
    }

    // Format phone to ensure the record matches complete-registration later
    const formattedPhone = telnyxSMS.formatPhoneNumber(request.phone);

    // Try to find an existing pending verification for this email/phone
    const existing = await pb
      .collection('admin_phone_verification')
      .getList(1, 1, {
        filter: `email = "${request.email}" && phone = "${formattedPhone}" && used = false && expires_at > "${new Date().toISOString()}"`,
        sort: '-created'
      })
      .catch(() => ({ items: [] as any[] }));

    // Use existing code if available, otherwise create a new record
    let verificationCode: string;
    let verificationId: string | null = null;

    if (existing.items.length > 0) {
      const rec = existing.items[0];
      verificationCode = generateVerificationCode();
      verificationId = rec.id;
      // Update existing record with fresh code and expiry
      const freshExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await pb.collection('admin_phone_verification').update(rec.id, {
        verification_code: verificationCode,
        expires_at: freshExpiry.toISOString(),
        company_name: request.company_name
      });
    } else {
      verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      const created = await pb.collection('admin_phone_verification').create({
        phone: formattedPhone,
        verification_code: verificationCode,
        email: request.email,
        expires_at: expiresAt.toISOString(),
        used: false,
        company_name: request.company_name
      });
      verificationId = created.id;
    }

    const emailPayload = {
      sender: { name: "Viewroom.ca", email: PUBLIC_SMTP_FROM },
      to: [{ email: request.email, name: request.company_name }],
      subject: 'Your verification code',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Account Verification</h2>
          <p>Hello ${request.company_name},</p>
          <p>Your verification code is:</p>
          <div style="background: #f8f9fa; border: 2px solid #e9ecef; padding: 30px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 30px 0; border-radius: 8px; color: #495057;">
            ${verificationCode}
          </div>
          <p><strong>This code expires in 10 minutes.</strong></p>
          <p style="color: #6c757d; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
      tags: ['registration', 'verification', 'email']
    };

    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('Brevo email error:', text);
      return { success: false, message: 'Failed to send verification email' };
    }

    console.log(`✉️ Email verification sent for admin signup: ${request.email}`);

    return { success: true, message: 'Verification code sent to email', verification_id: verificationId ?? undefined };
  } catch (error) {
    console.error('❌ Error sending admin email verification:', error);
    return { success: false, message: 'Failed to send verification email. Please try again.' };
  }
}

/**
 * Verify admin phone verification code
 */
export async function verifyAdminPhoneCode(
  phone: string,
  email: string,
  code: string
): Promise<PhoneVerificationValidation> {
  try {
    // Format phone number to match database format
    const formattedPhone = telnyxSMS.formatPhoneNumber(phone);

    // Find the verification record
    const verificationRecord = await pb.collection('admin_phone_verification')
      .getFirstListItem(
        `phone = "${formattedPhone}" && email = "${email}" && verification_code = "${code}" && used = false`
      ).catch(() => null);

    if (!verificationRecord) {
      return {
        success: false,
        message: 'Invalid verification code. Please check your code and try again.'
      };
    }

    // Check if code has expired
    const expiresAt = new Date(verificationRecord.expires_at);
    if (expiresAt < new Date()) {
      return {
        success: false,
        message: 'Verification code has expired. Please request a new one.'
      };
    }

    // Mark verification as used
    await pb.collection('admin_phone_verification').update(verificationRecord.id, {
      used: true
    });

    console.log(`✅ Phone verification successful for admin signup: ${email} -> ${formattedPhone}`);

    return {
      success: true,
      message: 'Phone number verified successfully!',
      data: verificationRecord
    };

  } catch (error) {
    console.error('❌ Error verifying admin phone code:', error);
    return {
      success: false,
      message: 'Failed to verify code. Please try again.'
    };
  }
}

/**
 * Verify admin email verification code (email-based verification)
 */
export async function verifyAdminEmailCode(
  email: string,
  code: string
): Promise<PhoneVerificationValidation> {
  try {
    // Find the verification record by email + code
    const verificationRecord = await pb.collection('admin_phone_verification')
      .getFirstListItem(
        `email = "${email}" && verification_code = "${code}" && used = false`
      ).catch(() => null);

    if (!verificationRecord) {
      return {
        success: false,
        message: 'Invalid verification code. Please check your code and try again.'
      };
    }

    // Check if code has expired
    const expiresAt = new Date(verificationRecord.expires_at);
    if (expiresAt < new Date()) {
      return {
        success: false,
        message: 'Verification code has expired. Please request a new one.'
      };
    }

    // Mark verification as used
    await pb.collection('admin_phone_verification').update(verificationRecord.id, {
      used: true
    });

    console.log(`✅ Email verification successful for admin signup: ${email}`);

    return {
      success: true,
      message: 'Email verified successfully!',
      data: verificationRecord
    };

  } catch (error) {
    console.error('❌ Error verifying admin email code:', error);
    return {
      success: false,
      message: 'Failed to verify code. Please try again.'
    };
  }
}

/**
 * Clean up expired verification codes (utility function)
 */
export async function cleanupExpiredVerifications(): Promise<void> {
  try {
    const now = new Date().toISOString();
    const expiredRecords = await pb.collection('admin_phone_verification')
      .getList(1, 100, {
        filter: `expires_at < "${now}"`
      });

    for (const record of expiredRecords.items) {
      await pb.collection('admin_phone_verification').delete(record.id);
    }

    console.log(`🧹 Cleaned up ${expiredRecords.items.length} expired phone verification codes`);
  } catch (error) {
    console.error('❌ Error cleaning up expired verifications:', error);
  }
} 