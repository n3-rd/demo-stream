import { pb } from '$lib/pocketbase';
import { BREVO_API_KEY } from '$env/static/private';
import { PUBLIC_SMTP_FROM } from '$env/static/public';
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
  
  // 3. Verify names with fallback to login_name when first/last are missing
  const fallbackFromLogin = () => {
    const base = String(user.login_name || '').trim();
    const parts = base.split(/[._-]/).filter(Boolean);
    const f = parts[0] || '';
    const l = parts.slice(1).join(' ') || '';
    return { f, l };
  };
  const expectedFirst = (user.first_name || fallbackFromLogin().f || '').trim();
  const expectedLast = (user.last_name || fallbackFromLogin().l || '').trim();
  if (expectedFirst !== request.first_name || expectedLast !== request.last_name) {
    throw new Error('Access denied: Name does not match our records');
  }
  
  // 4. Phone number validation (if provided, must match exactly)
  if (request.phone && user.phone !== request.phone) {
    throw new Error('Access denied: Phone number does not match our records');
  }
  
  // 5. Phone and email verification
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
  
  // 6. Generate 5-digit verification code
  const code = Math.floor(10000 + Math.random() * 90000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  
  // 7. Store verification code in database
  await pb.collection('verification_codes').create({
    user_email: user.email,
    code,
    phone_number: request.phone || null,
    expires_at: expiresAt.toISOString(),
    used: false,
    verification_type: verificationType
  });
  
  // 8. Send verification code via email
  await sendEmailVerificationCode(user.email, code, `${user.first_name} ${user.last_name}`);
  
  return {
    success: true,
    message: 'Verification code sent to your email',
    verification_type: verificationType
  };
}

export async function verifyViewroomCode(request: VerificationRequest) {
  try {
    // Find valid, unused verification code (without expires_at in query)
    const verification = await pb.collection('verification_codes').getFirstListItem(
      `user_email = "${request.email}" && code = "${request.code}" && used = false`
    ).catch(() => null);
    
    if (!verification) {
      throw new Error('Invalid or expired verification code');
    }
    
    // Check if code has expired manually
    const expiresAt = new Date(verification.expires_at);
    if (expiresAt < new Date()) {
      throw new Error('Verification code has expired');
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
  } catch (error) {
    console.error('Verification error details:', {
      email: request.email,
      code: request.code,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    // Check if it's a "not found" error or other error
    if (error.message.includes('Failed to fetch') || error.message.includes('not found')) {
      throw new Error('Invalid or expired verification code');
    }
    
    throw error;
  }
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
      'api-key': BREVO_API_KEY,
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
 