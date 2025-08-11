import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendAdminEmailVerification } from '$lib/auth/adminPhoneVerification';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();

    if (!data.email || !data.company_name || !data.phone) {
      return json({ success: false, message: 'Missing required fields: email, phone and company_name are required' }, { status: 400 });
    }

    // basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(data.email))) {
      return json({ success: false, message: 'Invalid email format' }, { status: 400 });
    }

    const result = await sendAdminEmailVerification({
      email: String(data.email).trim().toLowerCase(),
      phone: String(data.phone).trim(),
      company_name: String(data.company_name).trim()
    });

    if (!result.success) {
      return json({ success: false, message: result.message }, { status: 400 });
    }

    return json({ success: true, message: result.message, verification_id: result.verification_id });
  } catch (error) {
    console.error('❌ Error in email verification send endpoint:', error);
    return json({ success: false, message: 'Internal server error. Please try again.' }, { status: 500 });
  }
}; 