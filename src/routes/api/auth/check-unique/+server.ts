import { json, type RequestHandler } from '@sveltejs/kit';
import { telnyxSMS } from '$lib/services/telnyx';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const { email, phone } = await request.json();

    let emailTaken = false;
    let phoneTaken = false;

    // Check email
    if (email) {
      try {
        const existingByEmail = await locals.pb
          .collection('users')
          .getFirstListItem(`email = "${String(email).trim().toLowerCase()}"`);
        if (existingByEmail) emailTaken = true;
      } catch {}
    }

    // Check phone
    if (phone) {
      try {
        const formatted = telnyxSMS.formatPhoneNumber(String(phone));
        if (telnyxSMS.isValidPhoneNumber(formatted)) {
          const existingByPhone = await locals.pb
            .collection('users')
            .getFirstListItem(`phone = "${formatted}"`);
          if (existingByPhone) phoneTaken = true;
        }
      } catch {}
    }

    return json({ success: true, email_taken: emailTaken, phone_taken: phoneTaken });
  } catch (error) {
    console.error('check-unique error', error);
    return json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}; 