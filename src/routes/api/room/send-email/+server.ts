import { json, type RequestHandler } from '@sveltejs/kit';
import { PUBLIC_APP_URL } from '$env/static/public';

export const POST: RequestHandler = async ({ request, params }) => {
    // Get the room ID from params
    const roomId = params.roomId;
    
    // Get form data
    const formData = await request.formData();
    const name = formData.get('name');
    const receipient = formData.get('receipient');
    const url = formData.get('url');
    
    // Extract uid from URL if present
    let uid = '';
    try {
        const urlObj = new URL(url?.toString() || '');
        uid = urlObj.searchParams.get('uid') || '';
    } catch (error) {
        console.error('Error extracting uid from URL:', error);
    }
    
    // Create a proper room link with uid
    const baseUrl = PUBLIC_APP_URL || 'http://localhost:3001';
    const roomLink = `${baseUrl}/room/${roomId}${uid ? `?uid=${uid}` : ''}`;
    
    try {
        // Create email data with updated template
        const emailData = {
            to: receipient,
            subject: `Invitation to join a meeting`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">You've been invited to a meeting</h2>
                    <p>Hello ${name},</p>
                    <p>You have been invited to join a meeting.</p>
                    <p><strong>Room Link:</strong> <a href="${roomLink}">${roomLink}</a></p>
                    <p>Click the link above to join the meeting.</p>
                    <p>Best regards,<br>The Meeting Team</p>
                </div>
            `
        };
        
        // Send the email using your email service
        // This would integrate with your email service (Brevo, SendGrid, etc.)
        console.log('Email would be sent:', emailData);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Email sent successfully'
        }), { status: 200 });
    } catch (error) {
        console.error('Error sending email:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to send email'
        }), { status: 500 });
    }
}; 