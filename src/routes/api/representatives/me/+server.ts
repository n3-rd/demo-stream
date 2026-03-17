import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db/drizzle';
import { representatives, repDeviceTokens, verificationCodes } from '$lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';

export const DELETE: RequestHandler = async ({ cookies, request }) => {
  try {
    const repIdFromCookie = cookies.get('rep_session');

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ success: false, message: 'Invalid request body' }, { status: 400 });
    }

    const { code, email } = body;
    if (!code) {
      return json({ success: false, message: 'Verification code is required' }, { status: 400 });
    }

    // Identify target representative
    let targetRep;
    if (repIdFromCookie) {
      targetRep = await db.query.representatives.findFirst({
        where: eq(representatives.id, repIdFromCookie)
      });
    } else if (email) {
      targetRep = await db.query.representatives.findFirst({
        where: eq(representatives.email, email.trim().toLowerCase())
      });
    }

    if (!targetRep) {
      return json({ success: false, message: 'Representative record not found' }, { status: 404 });
    }

    // 2. Verify the code
    const verification = await db.query.verificationCodes.findFirst({
      where: and(
        eq(verificationCodes.userEmail, targetRep.email),
        eq(verificationCodes.code, code),
        eq(verificationCodes.used, false),
        gt(verificationCodes.expiresAt, new Date())
      )
    });

    if (!verification) {
      return json({ success: false, message: 'Invalid or expired verification code' }, { status: 400 });
    }

    // 3. Mark code as used
    await db
      .update(verificationCodes)
      .set({ used: true })
      .where(eq(verificationCodes.id, verification.id));

    // 4. Delete associated device tokens
    await db
      .delete(repDeviceTokens)
      .where(eq(repDeviceTokens.repId, targetRep.id));

    // 5. Delete the representative record
    const result = await db
      .delete(representatives)
      .where(eq(representatives.id, targetRep.id))
      .returning();

    // 6. Clear session cookies if they match the deleted user
    if (repIdFromCookie === targetRep.id) {
      cookies.delete('rep_session', { path: '/' });
      cookies.delete('rep_user', { path: '/' });
    }

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
