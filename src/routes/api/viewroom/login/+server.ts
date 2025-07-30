import { json } from '@sveltejs/kit';
import { initiateViewroomLogin } from '$lib/auth/viewroomAuth';
import type { RequestHandler } from './$types';

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
    if (data.phone && data.phone.trim()) {
      const phoneRegex = /^[+]?[0-9\s\-\(\)]{7,15}$/;
      if (!phoneRegex.test(data.phone.trim())) {
        return json({ 
          success: false, 
          message: 'Invalid phone number format' 
        }, { status: 400 });
      }
    }
    
    const result = await initiateViewroomLogin({
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      company: data.company.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || undefined,
      roomId: data.roomId || undefined
    });
    
    // If verification is skipped, set session cookies directly
    if (result.skipVerification && result.sessionToken) {
      // Set secure session cookies server-side
      cookies.set('viewroom_session', result.sessionToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
      
      cookies.set('viewroom_user', JSON.stringify(result.user), {
        path: '/',
        httpOnly: false, // Need to be readable by client
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
      
      console.log('🔐 Server-side: Viewroom authentication successful for:', result.user.first_name, result.user.last_name);
      
      return json({
        success: true,
        user: result.user,
        message: result.message,
        skipVerification: true,
        cookiesSet: true
      });
    }
    
    return json(result);
  } catch (error) {
    console.error('Viewroom login error:', error);
    return json({ 
      success: false, 
      message: error.message 
    }, { status: 400 });
  }
}; 