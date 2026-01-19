import { json, type RequestHandler } from '@sveltejs/kit';
import { pb } from '$lib/pocketbase';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
  try {
    const requestBody = await request.json();
    console.log('Verification Request Body:', requestBody);

    const { email, code } = requestBody;
    if (!email || !code) {
      console.error('Missing email or code');
      return json({ success: false, message: 'Email and code are required' }, { status: 400 });
    }

    const verification = await pb.collection('verification_codes').getFirstListItem(
      `user_email = "${email}" && code = "${code}" && used = false`
    ).catch(() => null);

    if (!verification) {
      console.error('Invalid verification code');
      return json({ success: false, message: 'Invalid or expired code' }, { status: 400 });
    }

    const expiresAt = new Date(verification.expires_at);
    if (expiresAt < new Date()) {
      console.error('Verification code expired');
      return json({ success: false, message: 'Code expired' }, { status: 400 });
    }

    await pb.collection('verification_codes').update(verification.id, { used: true });

    const rep = await pb.collection('representatives').getFirstListItem(`email = "${email}"`, {
      expand: 'company'
    }).catch(() => null);
    if (!rep) {
      console.error('Representative not found');
      return json({ success: false, message: 'Representative not found' }, { status: 404 });
    }

    // Get company name if available
    let companyName = null;
    if (rep.expand?.company?.company_name) {
      companyName = rep.expand.company.company_name;
    } else if (typeof rep.company === 'string') {
      try {
        const company = await pb.collection('users').getOne(rep.company);
        companyName = company.company_name || null;
      } catch {}
    }

    // Parse name if available
    const nameParts = rep.name ? String(rep.name).trim().split(/\s+/) : [];
    const firstName = rep.firstName || nameParts[0] || '';
    const lastName = rep.lastName || nameParts.slice(1).join(' ') || '';

    // Prepare representative session data
    const repSession = { 
      id: rep.id, 
      email: rep.email, 
      name: rep.name || `${firstName} ${lastName}`.trim() || '',
      firstName,
      lastName,
      company: rep.company || null,
      companyName
    };

    // Set cookies with extended options for persistence
    cookies.set('rep_session', rep.id, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7  // 7 days
    });

    cookies.set('rep_user', JSON.stringify(repSession), {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7  // 7 days
    });

    return json({ 
      success: true, 
      message: 'Representative verified', 
      user: repSession 
    });
  } catch (err: any) {
    console.error('Representative verify error', err);
    return json({ success: false, message: err?.message || 'Internal error' }, { status: 500 });
  }
};