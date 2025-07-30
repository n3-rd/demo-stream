import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
  try {
    // Clear viewroom session cookies
    cookies.delete('viewroom_session', { path: '/' });
    cookies.delete('viewroom_user', { path: '/' });
    
    return json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    return json({ 
      success: false, 
      message: 'Logout failed' 
    }, { status: 500 });
  }
}; 