import { json } from '@sveltejs/kit';
import { verifyViewroomCode } from '$lib/auth/viewroomAuth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.email || !data.code) {
      return json({ 
        success: false, 
        message: 'Email and verification code are required' 
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
    
    // Validate code format (5 digits)
    const codeRegex = /^\d{5}$/;
    if (!codeRegex.test(data.code)) {
      return json({ 
        success: false, 
        message: 'Verification code must be 5 digits' 
      }, { status: 400 });
    }
    
    const result = await verifyViewroomCode({
      email: data.email.trim().toLowerCase(),
      code: data.code.trim()
    });
    
    // Set secure session cookie
    cookies.set('viewroom_session', result.sessionToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8 // 8 hours
    });
    
    // Also set a user info cookie for client-side access
    cookies.set('viewroom_user', JSON.stringify(result.user), {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8 // 8 hours
    });
    
    return json({ 
      success: true, 
      user: result.user,
      message: result.message 
    });
  } catch (error) {
    console.error('Viewroom verification error:', error);
    return json({ 
      success: false, 
      message: error.message 
    }, { status: 400 });
  }
}; 