import { BREVO_API_KEY } from '$env/static/private';
import { PUBLIC_SMTP_FROM } from '$env/static/public';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const emailData = await request.json();
    
    // Format data for Brevo API
    const brevoData = {
      sender: {
        name: emailData.repName || "Meeting Scheduler",
        email: PUBLIC_SMTP_FROM 
      },
      to: [
        {
          email: emailData.customerEmail,
          name: emailData.customerName
        }
      ],
      // Add CC for representative
      cc: [
        {
          email: emailData.repEmail,
          name: emailData.repName
        }
      ],
      subject: `Appointment Confirmation: ${emailData.appointmentTitle}`,
      htmlContent: generateEmailTemplate(emailData),
      // Include tags for tracking
      tags: ["appointment", "booking"]
    };
    
    console.log('Sending email via Brevo API:', JSON.stringify(brevoData, null, 2));
    
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY, 
        'content-type': 'application/json'
      },
      body: JSON.stringify(brevoData)
    });
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { text: responseText };
    }
    
    if (!response.ok) {
      console.error('Brevo API error:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Brevo API error: ${response.status} - ${JSON.stringify(responseData)}` 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Brevo API success:', responseData);
    
    return new Response(JSON.stringify({ 
      success: true, 
      messageId: responseData.messageId || 'sent'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error sending email via Brevo:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Failed to send email: ${error.message}` 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Function to generate HTML email template with Brevo-compatible formatting
function generateEmailTemplate(data) {
  const formattedDate = new Date(data.bookingDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #ffffff; }
    .appointment-details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 14px; color: #666666; }
    h1 { margin: 0; font-size: 24px; }
    h2 { font-size: 18px; margin-top: 20px; }
    .meeting-link { background-color: #e9ecef; padding: 10px; border-radius: 5px; margin: 15px 0; word-break: break-all; }
    .meeting-link a { color: #4f46e5; text-decoration: none; }
    .meeting-link a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Appointment is Confirmed</h1>
    </div>
    <div class="content">
      <p>Dear ${data.customerName},</p>
      <p>Your appointment has been successfully scheduled. Below are the details:</p>
      
      <div class="appointment-details">
        <h2>Appointment Details</h2>
        <ul>
          <li><strong>Title:</strong> ${data.appointmentTitle}</li>
          <li><strong>Date:</strong> ${formattedDate}</li>
          <li><strong>Time:</strong> ${data.bookingTime}</li>
          <li><strong>Representative:</strong> ${data.repName}</li>
        </ul>
      </div>
      
      <div class="meeting-link">
        <h2>Meeting Link</h2>
        <p>Please use the following link to join the meeting at the scheduled time:</p>
        <p><a href="${data.roomUrl}">${data.roomUrl}</a></p>
      </div>
      
      <p>If you need to reschedule or cancel your appointment, please contact us.</p>
      
      <p>Thank you for choosing our service.</p>
      
      <p>Best regards,<br>Your Company Team</p>
    </div>
    <div class="footer">
      <p>This is an automated email. Please do not reply directly to this message.</p>
    </div>
  </div>
</body>
</html>`;
} 