import { pb } from '$lib/pocketbase';
import { PUBLIC_BREVO_API_KEY, PUBLIC_SMTP_FROM } from '$env/static/public';
import crypto from 'crypto';

export interface ViewroomLoginRequest {
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  phone?: string; // Optional
  roomId?: string; // Optional room context for company-specific auth
}

export interface VerificationRequest {
  email: string;
  code: string;
}

export async function initiateViewroomLogin(request: ViewroomLoginRequest) {
  let requiredCompanyId = null;
  
  // 1. If roomId is provided, get the room's owner company for verification
  if (request.roomId) {
    try {
      const room = await pb.collection('rooms').getOne(request.roomId);
      requiredCompanyId = room.owner_company;
    } catch (error) {
      throw new Error('Room not found or inaccessible');
    }
  }
  
  // 2. Find user in database by email (primary lookup)
  let userFilter = `email = "${request.email}" && is_active = true`;
  
  // If we have a specific company requirement (from room), add it to filter
  if (requiredCompanyId) {
    userFilter += ` && company = "${requiredCompanyId}"`;
  }
  
  const user = await pb.collection('viewroom_users').getFirstListItem(userFilter).catch(() => null);
  
  if (!user) {
    if (requiredCompanyId) {
      throw new Error('Access denied: You are not authorized to access this room');
    } else {
      throw new Error('Access denied: Email not authorized for viewroom access');
    }
  }
  
     // 3. Verify first_name and last_name match (company is already verified by filter above)
   if (user.first_name !== request.first_name || user.last_name !== request.last_name) {
     throw new Error('Access denied: Name does not match our records');
   }
   
   // TEMPORARILY DISABLED: Phone number validation
   /*
   // 4. Phone number validation (if provided, must match exactly)
   if (request.phone && user.phone !== request.phone) {
     throw new Error('Access denied: Phone number does not match our records');
   }
   */
  
  // TEMPORARILY DISABLED: Phone and email verification
  /*
  // 3. Phone number logic
  let verificationType: 'email' | 'sms';
  let targetContact: string;
  
  if (request.phone) {
    // Phone number provided - must match database exactly
    if (user.phone !== request.phone) {
      throw new Error('Access denied: Phone number does not match our records');
    }
    // Phone matches - send code via SMS
    verificationType = 'sms';
    targetContact = request.phone;
  } else {
    // No phone provided - send code via email
    verificationType = 'email';
    targetContact = request.email;
  }
  
  // 4. Generate 5-digit verification code
  const code = Math.floor(10000 + Math.random() * 90000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  
  // 5. Store verification code in database
  await pb.collection('verification_codes').create({
    user_email: user.email,
    code,
    phone_number: request.phone || null,
    expires_at: expiresAt.toISOString(),
    used: false,
    verification_type: verificationType
  });
  
  // 6. Send verification code
  if (verificationType === 'sms') {
    await sendSMSVerificationCode(request.phone!, code);
  } else {
    await sendEmailVerificationCode(user.email, code, `${user.first_name} ${user.last_name}`);
  }
  
  return {
    success: true,
    message: verificationType === 'sms' 
      ? `Verification code sent to phone ending in ${request.phone!.slice(-4)}`
      : 'Verification code sent to your email',
    verification_type: verificationType
  };
  */
  
  // TEMPORARY: Skip verification and directly authenticate
  // Generate session token
  const sessionToken = crypto.randomBytes(32).toString('hex');
  
  return {
    success: true,
    message: 'Authentication successful - Welcome to the viewroom (verification temporarily disabled)',
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      company: user.company,
      email: user.email
    },
    sessionToken,
    skipVerification: true
  };
}

export async function verifyViewroomCode(request: VerificationRequest) {
  // Find valid, unused verification code
  const verification = await pb.collection('verification_codes').getFirstListItem(
    `user_email = "${request.email}" && code = "${request.code}" && used = false && expires_at > "${new Date().toISOString()}"`
  ).catch(() => null);
  
  if (!verification) {
    throw new Error('Invalid or expired verification code');
  }
  
  // Mark code as used
  await pb.collection('verification_codes').update(verification.id, { used: true });
  
  // Get user data
  const user = await pb.collection('viewroom_users').getFirstListItem(
    `email = "${request.email}"`
  );
  
  // Generate session token
  const sessionToken = crypto.randomBytes(32).toString('hex');
  
      return {
      success: true,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        company: user.company,
        email: user.email
      },
      sessionToken,
      message: 'Authentication successful - Welcome to the viewroom'
    };
}

async function sendEmailVerificationCode(email: string, code: string, loginName: string) {
  const emailData = {
    sender: {
      name: "Viewroom Access",
      email: PUBLIC_SMTP_FROM
    },
    to: [{
      email: email,
      name: loginName
    }],
    subject: "Your Viewroom Access Code",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Viewroom Access Verification</h2>
        <p>Hello ${loginName},</p>
        <p>Your verification code for viewroom access is:</p>
        <div style="background: #f8f9fa; border: 2px solid #e9ecef; padding: 30px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 30px 0; border-radius: 8px; color: #495057;">
          ${code}
        </div>
        <p><strong>This code expires in 5 minutes.</strong></p>
        <p style="color: #6c757d; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
        <p style="color: #6c757d; font-size: 12px; text-align: center;">This is an automated message from the Viewroom Access System.</p>
      </div>
    `,
    tags: ["viewroom", "verification", "email"]
  };
  
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': PUBLIC_BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify(emailData)
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    console.error('Brevo email error:', errorData);
    throw new Error('Failed to send verification email');
  }
}

async function sendSMSVerificationCode(phoneNumber: string, code: string) {
  // PLACEHOLDER: Replace with your SMS service
  // Options:
  // 1. Use your existing SMS provider API
  // 2. Use a different service like AWS SNS, MessageBird, etc.
  // 3. Integrate with your current SMS infrastructure
  
  console.log(`SMS would be sent to ${phoneNumber}: Your viewroom access code is ${code}`);
  
  // Example implementation placeholder:
  /*
  const smsData = {
    to: phoneNumber,
    message: `Your viewroom access code is: ${code}. This code expires in 5 minutes.`
  };
  
  const response = await fetch('YOUR_SMS_API_ENDPOINT', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_SMS_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(smsData)
  });
  
  if (!response.ok) {
    throw new Error('Failed to send SMS verification code');
  }
  */
  
  // For now, throw error to indicate SMS not implemented
  throw new Error('SMS verification temporarily unavailable. Please login without phone number to receive email verification.');
} 