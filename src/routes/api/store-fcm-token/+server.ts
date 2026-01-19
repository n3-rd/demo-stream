import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db/drizzle';
import { repDeviceTokens, representatives } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

// UUID validation function
function isValidUUID(val: unknown): val is string {
  return typeof val === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(val);
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('[store-fcm-token] Received FCM token storage request');
    const { rep_id, fcm_token } = await request.json();
    console.log('[store-fcm-token] Request data:', { rep_id, fcm_token: fcm_token ? `${fcm_token.substring(0, 20)}...` : null });

    if (!rep_id || !fcm_token) {
      console.error('[store-fcm-token] Missing required fields:', { rep_id: !!rep_id, fcm_token: !!fcm_token });
      return json({ error: 'Missing rep_id or fcm_token' }, { status: 400 });
    }

    // Validate UUID format
    if (!isValidUUID(rep_id)) {
      console.error('[store-fcm-token] Invalid UUID format for rep_id:', rep_id);
      return json({ error: 'rep_id must be a valid UUID' }, { status: 400 });
    }

    // Validate token is not empty
    if (typeof fcm_token !== 'string' || fcm_token.trim() === '') {
      console.error('[store-fcm-token] Invalid FCM token: empty or not a string');
      return json({ error: 'FCM token must be a non-empty string' }, { status: 400 });
    }

    // Check if representative exists
    const repExists = await db
      .select()
      .from(representatives)
      .where(eq(representatives.id, rep_id))
      .limit(1);

    if (repExists.length === 0) {
      console.error('[store-fcm-token] Representative not found:', rep_id);
      return json({ error: 'Representative not found' }, { status: 404 });
    }

    // Check if token already exists for this rep
    console.log('[store-fcm-token] Checking for existing token for rep_id:', rep_id);
    const existingToken = await db
      .select()
      .from(repDeviceTokens)
      .where(eq(repDeviceTokens.repId, rep_id))
      .limit(1);

    console.log('[store-fcm-token] Existing token check result:', { found: existingToken.length > 0 });

    if (existingToken.length > 0) {
      // Update existing token
      console.log('[store-fcm-token] Updating existing token');
      await db
        .update(repDeviceTokens)
        .set({ 
          deviceToken: fcm_token,
          updatedAt: new Date()
        })
        .where(eq(repDeviceTokens.repId, rep_id));
      console.log('[store-fcm-token] Token updated successfully');
    } else {
      // Insert new token
      console.log('[store-fcm-token] Inserting new token');
      await db.insert(repDeviceTokens).values({
        repId: rep_id,
        deviceToken: fcm_token
      });
      console.log('[store-fcm-token] Token inserted successfully');
    }

    return json({ success: true, message: 'FCM token stored successfully' });
  } catch (error: any) {
    console.error('[store-fcm-token] Error storing FCM token:', error);
    console.error('[store-fcm-token] Error message:', error?.message);
    console.error('[store-fcm-token] Error stack:', error?.stack);
    
    // Handle foreign key constraint violation
    if (error?.cause?.code === '23503') {
      console.error('[store-fcm-token] Foreign key violation - representative not found');
      return json({ 
        error: 'Representative not found',
        details: 'The specified rep_id does not exist in the database'
      }, { status: 404 });
    }
    
    // Handle UUID parsing errors
    if (error?.cause?.code === '22P02') {
      console.error('[store-fcm-token] Invalid UUID format');
      return json({ 
        error: 'Invalid UUID format',
        details: 'rep_id must be a valid UUID'
      }, { status: 400 });
    }
    
    if (error?.code) {
      console.error('[store-fcm-token] Error code:', error.code);
    }
    
    return json({ 
      error: 'Internal server error',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}; 