import { pb } from '$lib/pocketbase';
import { telnyxSMS } from '$lib/services/telnyx';
import crypto from 'crypto';

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

    if (existingVerification.items.length > 0) {
      return {
        success: false,
        message: 'A verification code was already sent recently. Please wait before requesting a new one.'
      };
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store verification code in database
    const verificationData = await pb.collection('admin_phone_verification').create({
      phone: formattedPhone,
      verification_code: verificationCode,
      email: request.email,
      expires_at: expiresAt.toISOString(),
      used: false,
      company_name: request.company_name
    });

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