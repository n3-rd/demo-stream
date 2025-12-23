import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db/drizzle';
import { repDeviceTokens } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { telnyxSMS } from '$lib/services/telnyx';
import { sendEmail } from '../../../lib/services/email';
import { FIREBASE_SERVICE_ACCOUNT } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { 
      rep_id, 
      room_id, 
      room_title, 
      user_name, 
      invite_url, 
      send_methods = { sms: true, email: true } 
    } = await request.json();

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
    if (send_methods.sms) {
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
    }

    // Send email invite
    let emailSent = false;
    if (send_methods.email) {
      try {
        const rep_email = request.headers.get('x-rep-email');
        
        if (rep_email) {
          const emailSubject = `Invitation to Assist in ${room_title || 'View-Room'}`;
          const emailBody = `
            <p>Hello,</p>
            <p>You've been invited by ${user_name || 'a customer'} to assist in a view-room.</p>
            <p>Click the link below to join:</p>
            <p><a href="${invite_url}">${invite_url}</a></p>
            <p>Best regards,<br>View-Room Team</p>
          `;

          emailSent = await sendEmail({
            to: rep_email,
            subject: emailSubject,
            html: emailBody
          });
        }
      } catch (emailError) {
        console.error('Email send error:', emailError);
      }
    }

    // Send push notification if FCM token exists
    let notificationSent = false;
    if (deviceToken && deviceToken.trim() !== '') {
      console.log('[send-rep-invite] Device token found, attempting to send push notification');
      try {
        // Initialize Firebase Admin SDK
        console.log('[send-rep-invite] Initializing Firebase Admin SDK...');
        const firebaseAdmin = (await import('firebase-admin')).default;
        const serviceAccount = FIREBASE_SERVICE_ACCOUNT;
        
        if (serviceAccount) {
          console.log('[send-rep-invite] Firebase service account env var found, parsing...');
          try {
            // Remove surrounding quotes if present and handle escaped newlines
            let cleaned = serviceAccount.trim();
            if ((cleaned.startsWith("'") && cleaned.endsWith("'")) || (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
              cleaned = cleaned.slice(1, -1);
            }
            const parsedKey = JSON.parse(cleaned);
            
            // Check if Firebase app is already initialized
            let admin;
            try {
              admin = firebaseAdmin.app();
              console.log('[send-rep-invite] Using existing Firebase Admin SDK instance');
            } catch {
              // App doesn't exist, initialize it
              admin = firebaseAdmin.initializeApp({
                credential: firebaseAdmin.credential.cert(parsedKey)
              });
            }
            console.log('[send-rep-invite] Firebase Admin SDK initialized successfully');

            if (!admin) {
              console.error('[send-rep-invite] Firebase Admin SDK not initialized, cannot send notification');
            } else {
              const messagePayload = {
                token: deviceToken,
                notification: {
                  title: 'View-Room Invitation',
                  body: `You've been invited to assist in ${room_title || 'a view-room'}`,
                },
                data: { 
                  room_id: String(room_id),
                  type: 'room_invitation',
                  invite_url: String(invite_url)
                },
                apns: {
                  payload: {
                    aps: {
                      sound: 'default',
                      badge: 1,
                      alert: {
                        title: 'View-Room Invitation',
                        body: `You've been invited to assist in ${room_title || 'a view-room'}`,
                      }
                    }
                  },
                  headers: {
                    'apns-priority': '10',
                    'apns-push-type': 'alert'
                  }
                }
              };
              console.log('[send-rep-invite] Sending notification with payload:', { ...messagePayload, token: '***' });
              
              const result = await admin.messaging().send(messagePayload);
              console.log('[send-rep-invite] Notification sent successfully, result:', result);
              
              notificationSent = true;
            }
          } catch (parseError: any) {
            console.error('[send-rep-invite] Error parsing Firebase service account:', parseError);
            console.error('[send-rep-invite] Parse error details:', parseError?.message);
            console.error('[send-rep-invite] Parse error stack:', parseError?.stack);
            console.error('[send-rep-invite] First 100 chars of service account:', serviceAccount.substring(0, 100));
          }
        } else {
          console.warn('[send-rep-invite] FIREBASE_SERVICE_ACCOUNT not found in environment variables');
        }
      } catch (notificationError: any) {
        console.error('[send-rep-invite] Push notification error:', notificationError);
        console.error('[send-rep-invite] Error message:', notificationError?.message);
        console.error('[send-rep-invite] Error code:', notificationError?.code);
        console.error('[send-rep-invite] Error stack:', notificationError?.stack);
        if (notificationError?.errorInfo) {
          console.error('[send-rep-invite] Firebase error info:', notificationError.errorInfo);
        }
      }
    } else {
      console.log('[send-rep-invite] No device token found, skipping push notification');
    }

    return json({ 
      success: true, 
      message: 'Invite sent successfully',
      sms_sent: smsSent,
      email_sent: emailSent,
      notification_sent: notificationSent
    });

  } catch (error) {
    console.error('Error sending representative invite:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}; 