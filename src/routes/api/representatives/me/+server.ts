import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db/drizzle';
import { representatives, repDeviceTokens } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

export const DELETE: RequestHandler = async ({ cookies }) => {
  try {
    const repId = cookies.get('rep_session');

    if (!repId) {
      return json({ 
        success: false, 
        message: 'Representative session not found' 
      }, { status: 401 });
    }

    // 1. Delete associated device tokens
    await db
      .delete(repDeviceTokens)
      .where(eq(repDeviceTokens.repId, repId));

    // 2. Delete the representative record
    const result = await db
      .delete(representatives)
      .where(eq(representatives.id, repId))
      .returning();

    if (result.length === 0) {
      // Even if not found in DB, clear cookies to be safe
      cookies.delete('rep_session', { path: '/' });
      cookies.delete('rep_user', { path: '/' });
      return json({ 
        success: false, 
        message: 'Representative record not found' 
      }, { status: 404 });
    }

    // 3. Clear session cookies
    cookies.delete('rep_session', { path: '/' });
    cookies.delete('rep_user', { path: '/' });

    return json({
      success: true,
      message: 'Your representative account has been deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting representative self:', error);
    return json({ 
      success: false, 
      message: error.message || 'Failed to delete account' 
    }, { status: 500 });
  }
};
