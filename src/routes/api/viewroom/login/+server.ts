import { json } from '@sveltejs/kit';
import { initiateViewroomLogin } from '$lib/auth/viewroomAuth';
import type { RequestHandler } from './$types';
import { telnyxSMS } from '$lib/services/telnyx';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.first_name || !data.last_name || !data.company || !data.email) {
      return json({ 
        success: false, 
        message: 'Missing required fields: first_name, last_name, company, and email are required' 
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
    
    // Validate phone format if provided
    if (data.phone && String(data.phone).trim()) {
      const formatted = telnyxSMS.formatPhoneNumber(String(data.phone));
      if (!telnyxSMS.isValidPhoneNumber(formatted)) {
        return json({ success: false, message: 'Invalid phone number. Use format like +170********' }, { status: 400 });
      }
      data.phone = formatted;
    }
    
    const result = await initiateViewroomLogin({
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      company: data.company.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || undefined,
      roomId: data.roomId || undefined
    });
    
    return json(result);
  } catch (error: any) {
    console.error('Viewroom login error:', error);
    return json({ 
      success: false, 
      message: error.message 
    }, { status: 400 });
  }
}; 