import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Actions } from './$types';
import { telnyxSMS } from '$lib/services/telnyx';
import { pb } from '$lib/pocketbase';

export const load: PageServerLoad = async ({ url, locals }) => {
  const roomId = url.searchParams.get('room');
  
  if (!roomId) {
    throw error(400, 'Room ID is required for viewroom access');
  }

  try {
    // Fetch the room to get the owner company
    const room = await pb.collection('rooms').getOne(roomId, {
      expand: 'owner_company'
    });

    if (!room) {
      throw error(404, 'Room not found');
    }

    // Get company information
    const ownerCompany = room.expand?.owner_company || null;
    
    return {
      room: {
        id: room.id,
        title: room.title,
        owner_company: room.owner_company
      },
      company: ownerCompany ? {
        id: ownerCompany.id,
        name: ownerCompany.name || ownerCompany.email,
        email: ownerCompany.email
      } : null
    };
  } catch (err) {
    console.error('Failed to load room information:', err);
    throw error(404, 'Room not found or inaccessible');
  }
}; 

export const actions: Actions = {
  sendCode: async ({ request }) => {
    const data = Object.fromEntries(await request.formData()) as Record<string, string>;
    const email = data.email?.trim();
    const phone = data.phone?.trim();
    if (!email || !phone) {
      return { success: false, message: 'Email and phone are required' };
    }
    const formattedPhone = telnyxSMS.formatPhoneNumber(phone);

    const user = await pb.collection('users').getFirstListItem(`email = "${email}"`).catch(() => null);
    if (!user) return { success: false, message: 'No account found for this email' };

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pb.collection('verification_codes').create({
      user_email: email,
      code,
      phone_number: formattedPhone,
      expires_at: expiresAt.toISOString(),
      used: false,
      verification_type: 'sms'
    });

    const ok = await telnyxSMS.sendVerificationCode(formattedPhone, code, user.company_name || '');
    if (!ok) return { success: false, message: 'Failed to send code' };
    return { success: true, message: 'Code sent' };
  },
  verifyCode: async ({ request, cookies }) => {
    const data = Object.fromEntries(await request.formData()) as Record<string, string>;
    const email = data.email?.trim();
    const code = data.code?.trim();
    if (!email || !code) {
      return { success: false, message: 'Email and code are required' };
    }

    const verification = await pb.collection('verification_codes').getFirstListItem(
      `user_email = "${email}" && code = "${code}" && used = false`
    ).catch(() => null);

    if (!verification) return { success: false, message: 'Invalid or expired code' };

    const expiresAt = new Date(verification.expires_at);
    if (expiresAt < new Date()) return { success: false, message: 'Code expired' };

    await pb.collection('verification_codes').update(verification.id, { used: true });

    // IMPORTANT: Do NOT set admin session here. Viewroom sessions are handled by /api/viewroom/verify
    return { success: true };
  }
}; 