import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db/drizzle';
import { repDeviceTokens } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { rep_id, fcm_token } = await request.json();

    if (!rep_id || !fcm_token) {
      return json({ error: 'Missing rep_id or fcm_token' }, { status: 400 });
    }

    // Check if token already exists for this rep
    const existingToken = await db
      .select()
      .from(repDeviceTokens)
      .where(eq(repDeviceTokens.repId, rep_id))
      .limit(1);

    if (existingToken.length > 0) {
      // Update existing token
      await db
        .update(repDeviceTokens)
        .set({ 
          deviceToken: fcm_token,
          updatedAt: new Date()
        })
        .where(eq(repDeviceTokens.repId, rep_id));
    } else {
      // Insert new token
      await db.insert(repDeviceTokens).values({
        repId: rep_id,
        deviceToken: fcm_token
      });
    }

    return json({ success: true, message: 'FCM token stored successfully' });
  } catch (error) {
    console.error('Error storing FCM token:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}; 