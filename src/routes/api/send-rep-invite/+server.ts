import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db/drizzle';
import { repDeviceTokens } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { telnyxSMS } from '$lib/services/telnyx';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { rep_id, room_id, room_title, user_name, invite_url } = await request.json();

    if (!rep_id || !room_id || !invite_url) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get representative info and FCM token
    let deviceToken = null;
    try {
      const tokenRecord = await db
        .select()
        .from(repDeviceTokens)
        .where(eq(repDeviceTokens.repId, rep_id))
        .limit(1);

      deviceToken = tokenRecord.length > 0 ? tokenRecord[0].deviceToken : null;
    } catch (tokenError) {
      console.warn('Could not fetch device token:', tokenError);
    }

    // Send SMS invite
    let smsSent = false;
    try {
      const message = `You've been invited to assist in ${room_title || 'a view-room'} by ${user_name || 'a customer'}. Join here: ${invite_url}`;
      
      // Get representative phone from the request or you could fetch it from DB
      // For now, we'll assume it's passed in the request
      const rep_phone = request.headers.get('x-rep-phone');
      
      if (rep_phone) {
        smsSent = await telnyxSMS.sendSMS(rep_phone, message);
      }
    } catch (smsError) {
      console.error('SMS send error:', smsError);
    }

    // Send push notification if FCM token exists
    let notificationSent = false;
    if (deviceToken) {
      try {
        // Initialize Firebase Admin SDK
        const firebaseAdmin = await import('firebase-admin');
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        
        if (serviceAccount) {
          const admin = firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert(JSON.parse(serviceAccount))
          });

          await admin.messaging().send({
            token: deviceToken,
            notification: {
              title: 'View-Room Invitation',
              body: `You've been invited to assist in ${room_title || 'a view-room'}`,
            },
            data: { 
              room_id: room_id,
              type: 'room_invitation',
              invite_url: invite_url
            },
          });
          
          notificationSent = true;
        }
      } catch (notificationError) {
        console.error('Push notification error:', notificationError);
      }
    }

    return json({ 
      success: true, 
      message: 'Invite sent successfully',
      sms_sent: smsSent,
      notification_sent: notificationSent
    });

  } catch (error) {
    console.error('Error sending representative invite:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}; 