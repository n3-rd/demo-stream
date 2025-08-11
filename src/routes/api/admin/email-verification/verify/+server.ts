import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyAdminEmailCode } from '$lib/auth/adminPhoneVerification';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.email || !data.code) {
      return json({
        success: false,
        message: 'Missing required fields: email and code are required'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(data.email))) {
      return json({
        success: false,
        message: 'Invalid email format'
      }, { status: 400 });
    }

    // Validate verification code format (6 digits)
    const codeRegex = /^[0-9]{6}$/;
    if (!codeRegex.test(String(data.code).trim())) {
      return json({
        success: false,
        message: 'Invalid verification code format. Please enter a 6-digit code.'
      }, { status: 400 });
    }

    // Verify the code
    const result = await verifyAdminEmailCode(
      String(data.email).trim().toLowerCase(),
      String(data.code).trim()
    );

    if (result.success) {
      return json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      return json({
        success: false,
        message: result.message
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error in email verification verify endpoint:', error);
    return json({
      success: false,
      message: 'Internal server error. Please try again.'
    }, { status: 500 });
  }
}; 