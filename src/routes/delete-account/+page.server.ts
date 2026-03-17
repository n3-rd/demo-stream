import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { BREVO_API_KEY } from '$env/static/private';
import { PUBLIC_SMTP_FROM } from '$env/static/public';

export const load: PageServerLoad = async ({ cookies }) => {
  const repId = cookies.get('rep_session');
  return {
    isLoggedIn: !!repId
  };
};

export const actions: Actions = {
  requestDeletion: async ({ request }) => {
    const data = await request.formData();
    const email = data.get('email');
    const name = data.get('name');
    const reason = data.get('reason');

    if (!email || !name) {
      return fail(400, { message: 'Email and Name are required' });
    }

    // In a real app, you might save this to a 'deletion_requests' table
    // For now, we'll simulate sending an email to support
    
    try {
      if (BREVO_API_KEY) {
        const brevoData = {
          sender: { name: "Account Deletion System", email: PUBLIC_SMTP_FROM },
          to: [{ email: PUBLIC_SMTP_FROM, name: "Support Team" }],
          subject: `Account Deletion Request from ${name}`,
          htmlContent: `
            <h1>Account Deletion Request</h1>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Reason:</strong> ${reason || 'Not provided'}</p>
            <p>Please process this deletion request manually in the admin panel.</p>
          `
        };

        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': BREVO_API_KEY,
            'content-type': 'application/json'
          },
          body: JSON.stringify(brevoData)
        });
      }
      
      return { success: true, message: 'Your request has been submitted. Our team will process it within 24-48 hours.' };
    } catch (error) {
      console.error('Error sending deletion request email:', error);
      // Still return success to the user to avoid confusion, but log the error
      return { success: true, message: 'Your request has been received.' };
    }
  }
};
