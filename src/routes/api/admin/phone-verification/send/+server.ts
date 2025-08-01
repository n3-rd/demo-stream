import { json } from '@sveltejs/kit';
import { sendAdminPhoneVerification } from '$lib/auth/adminPhoneVerification';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.phone || !data.email || !data.company_name) {
      return json({
        success: false,
        message: 'Missing required fields: phone, email, and company_name are required'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return json({
        success: false,
        message: 'Invalid email format'
      }, { status: 400 });
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[+]?[0-9\s\-\(\)]{7,20}$/;
    if (!phoneRegex.test(data.phone.trim())) {
      return json({
        success: false,
        message: 'Invalid phone number format'
      }, { status: 400 });
    }

    // Send verification code
    const result = await sendAdminPhoneVerification({
      phone: data.phone.trim(),
      email: data.email.trim().toLowerCase(),
      company_name: data.company_name.trim()
    });

    if (result.success) {
      return json({
        success: true,
        message: result.message,
        verification_id: result.verification_id
      });
    } else {
      return json({
        success: false,
        message: result.message
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error in phone verification send endpoint:', error);
    return json({
      success: false,
      message: 'Internal server error. Please try again.'
    }, { status: 500 });
  }
}; 