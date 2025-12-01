import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db/drizzle';
import { repDeviceTokens } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

// Initialize Firebase Admin SDK
let admin: any;
try {
  const firebaseAdmin = await import('firebase-admin');
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (serviceAccount) {
    admin = firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(JSON.parse(serviceAccount))
    });
  }
} catch (error) {
  console.warn('Firebase Admin SDK not available:', error);
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { rep_id, room_id } = await request.json();

    if (!rep_id || !room_id) {
      return json({ error: 'Missing rep_id or room_id' }, { status: 400 });
    }

    // Get the representative's FCM token
    const tokenRecord = await db
      .select()
      .from(repDeviceTokens)
      .where(eq(repDeviceTokens.repId, rep_id))
      .limit(1);

    if (tokenRecord.length === 0) {
      return json({ error: 'No FCM token found for this representative' }, { status: 404 });
    }

    const deviceToken = tokenRecord[0].deviceToken;

    // Send push notification via Firebase
    if (admin) {
      try {
        await admin.messaging().send({
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
        });

        return json({ 
          success: true, 
          message: 'Notification sent successfully' 
        });
      } catch (firebaseError) {
        console.error('Firebase notification error:', firebaseError);
        return json({ 
          error: 'Failed to send notification',
          details: firebaseError.message 
        }, { status: 500 });
      }
    } else {
      // Fallback if Firebase is not configured
      console.log(`Would send notification to rep ${rep_id} for room ${room_id}`);
      return json({ 
        success: true, 
        message: 'Notification queued (Firebase not configured)' 
      });
    }

  } catch (error) {
    console.error('Error sending notification:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}; 