import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db/drizzle';
import { repDeviceTokens } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { FIREBASE_SERVICE_ACCOUNT } from '$env/static/private';

// Initialize Firebase Admin SDK
let admin: any;
try {
  console.log('[notify-rep] Initializing Firebase Admin SDK...');
  const firebaseAdmin = await import('firebase-admin');
  const serviceAccount = FIREBASE_SERVICE_ACCOUNT;
  
  if (serviceAccount) {
    console.log('[notify-rep] Firebase service account env var found, parsing...');
    try {
      // Remove surrounding quotes if present and handle escaped newlines
      let cleaned = serviceAccount.trim();
      if ((cleaned.startsWith("'") && cleaned.endsWith("'")) || (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
        cleaned = cleaned.slice(1, -1);
      }
      const parsedKey = JSON.parse(cleaned);
      
      // Check if Firebase app is already initialized
      try {
        admin = firebaseAdmin.app();
        console.log('[notify-rep] Using existing Firebase Admin SDK instance');
      } catch {
        // App doesn't exist, initialize it
        admin = firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(parsedKey)
        });
        console.log('[notify-rep] Firebase Admin SDK initialized successfully');
      }
    } catch (parseError) {
      console.error('[notify-rep] Error parsing Firebase service account:', parseError);
      console.error('[notify-rep] Parse error details:', parseError instanceof Error ? parseError.message : String(parseError));
      console.error('[notify-rep] First 100 chars of service account:', serviceAccount.substring(0, 100));
    }
  } else {
    console.warn('[notify-rep] FIREBASE_SERVICE_ACCOUNT not found in environment variables');
  }
} catch (error) {
  console.error('[notify-rep] Firebase Admin SDK initialization failed:', error);
  console.error('[notify-rep] Error details:', error instanceof Error ? error.message : String(error));
  console.error('[notify-rep] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('[notify-rep] Received notification request');
    const { rep_id, room_id } = await request.json();
    console.log('[notify-rep] Request data:', { rep_id, room_id });

    if (!rep_id || !room_id) {
      console.error('[notify-rep] Missing required fields:', { rep_id: !!rep_id, room_id: !!room_id });
      return json({ error: 'Missing rep_id or room_id' }, { status: 400 });
    }

    // Get the representative's FCM token
    console.log('[notify-rep] Querying database for FCM token for rep_id:', rep_id);
    const tokenRecord = await db
      .select()
      .from(repDeviceTokens)
      .where(eq(repDeviceTokens.repId, rep_id))
      .limit(1);

    console.log('[notify-rep] Token query result:', { found: tokenRecord.length > 0, record: tokenRecord.length > 0 ? { ...tokenRecord[0], deviceToken: tokenRecord[0].deviceToken ? '***' : null } : null });

    if (tokenRecord.length === 0 || !tokenRecord[0].deviceToken) {
      console.error('[notify-rep] No FCM token found for rep_id:', rep_id);
      return json({ error: 'No FCM token found for this representative' }, { status: 404 });
    }

    const deviceToken = tokenRecord[0].deviceToken;
    if (!deviceToken || deviceToken.trim() === '') {
      console.error('[notify-rep] Device token is empty for rep_id:', rep_id);
      return json({ error: 'Device token is empty' }, { status: 400 });
    }
    console.log('[notify-rep] Device token retrieved:', deviceToken ? `${deviceToken.substring(0, 20)}...` : 'null');

    // Send push notification via Firebase
    if (admin) {
      console.log('[notify-rep] Admin SDK available, attempting to send notification...');
      try {
        const messagePayload = {
          token: deviceToken,
          notification: {
            title: 'View-Room Assistance Needed',
            body: `User is waiting in Room #${room_id}`,
          },
          data: { 
            room_id: String(room_id),
            type: 'assistance_request'
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                alert: {
                  title: 'View-Room Assistance Needed',
                  body: `User is waiting in Room #${room_id}`,
                }
              }
            },
            headers: {
              'apns-priority': '10',
              'apns-push-type': 'alert'
            }
          }
        };
        console.log('[notify-rep] Sending notification with payload:', { ...messagePayload, token: '***' });
        
        const result = await admin.messaging().send(messagePayload);
        console.log('[notify-rep] Notification sent successfully, result:', result);

        return json({ 
          success: true, 
          message: 'Notification sent successfully',
          messageId: result
        });
      } catch (firebaseError: any) {
        console.error('[notify-rep] Firebase notification error:', firebaseError);
        console.error('[notify-rep] Firebase error message:', firebaseError?.message);
        console.error('[notify-rep] Firebase error code:', firebaseError?.code);
        console.error('[notify-rep] Firebase error stack:', firebaseError?.stack);
        if (firebaseError?.errorInfo) {
          console.error('[notify-rep] Firebase error info:', firebaseError.errorInfo);
        }
        return json({ 
          error: 'Failed to send notification',
          details: firebaseError?.message || 'Unknown error',
          code: firebaseError?.code
        }, { status: 500 });
      }
    } else {
      // Fallback if Firebase is not configured
      console.warn('[notify-rep] Firebase Admin SDK not initialized, cannot send notification');
      console.log(`[notify-rep] Would send notification to rep ${rep_id} for room ${room_id}`);
      return json({ 
        success: false,
        message: 'Notification queued (Firebase not configured)' 
      });
    }

  } catch (error: any) {
    console.error('[notify-rep] Unexpected error in notification handler:', error);
    console.error('[notify-rep] Error message:', error?.message);
    console.error('[notify-rep] Error stack:', error?.stack);
    return json({ 
      error: 'Internal server error',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}; 