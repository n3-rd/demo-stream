import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { PUBLIC_BREVO_API_KEY, PUBLIC_SMTP_FROM } from '$env/static/public';


// Get environment variables - fix the import error
let BREVO_API_KEY = PUBLIC_BREVO_API_KEY;
let SMTP_FROM = PUBLIC_SMTP_FROM;


interface QuoteEmailData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quoteDescription: string;
  firstName?: string;
  lastName?: string;
  tags?: string[];
  ownerEmail?: string;
  isCustomerConfirmation?: boolean;
}

// Update the locals type to include pb
export const POST = (async ({ request, fetch, locals }) => {
  try {
    // Get company information from auth store (if available)
    // @ts-ignore - Add type ignore for locals.pb until you can define a proper type
    const companyData = locals.pb?.authStore?.model || null;
    const companyId = companyData?.id || 'Unknown Company';
    const companyName = companyData?.name || 'Your Company';
    
    console.log('Company data from auth store:', companyData);

    // Parse the request body
    const data = await request.json() as QuoteEmailData;
    const { 
      customerName, 
      customerEmail,
      customerPhone,
      quoteDescription,
      firstName,
      lastName,
      tags = ['quote'],
      ownerEmail = SMTP_FROM,
      isCustomerConfirmation = false
    } = data;

    // Validate required fields
    if (!customerEmail || (!quoteDescription && !isCustomerConfirmation)) {
      return json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    console.log(`Processing quote email to ${isCustomerConfirmation ? 'customer' : 'owner'}`);

    // Initialize email data based on recipient type
    let emailData;
    
    if (isCustomerConfirmation) {
      // Email to customer
      emailData = {
        to: [{
          email: customerEmail,
          name: customerName
        }],
        sender: {
          email: ownerEmail,
          name: companyData?.name || "Quote Department"
        },
        subject: "Your Quote Request Has Been Received",
        htmlContent: generateCustomerEmailContent({
          customerName,
          quoteDescription,
          customerPhone,
          customerEmail,
          companyName,
          companyId
        }),
        tags: [...tags, `company_${companyId}`]
      };
    } else {
      // Email to owner/company
      emailData = {
        to: [{
          email: ownerEmail,
          name: companyData?.name || "Quote Department"
        }],
        sender: {
          email: SMTP_FROM,
          name: "Quote System"
        },
        subject: `New Quote Request from ${customerName}`,
        htmlContent: generateOwnerEmailContent({
          customerName,
          quoteDescription,
          customerPhone,
          customerEmail,
          companyName,
          companyId
        }),
        tags: [...tags, 'internal', `company_${companyId}`]
      };
    }

    // Get the Brevo API key from environment variables
    if (!BREVO_API_KEY) {
      console.error('Brevo API key not found');
      return json({ 
        success: false, 
        error: 'Email service configuration error' 
      }, { status: 500 });
    }

    // Send the email via Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify(emailData)
    });

    // Check for API response
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Brevo API error:', response.status, errorText);
      
      return json({
        success: false,
        error: `Email API error: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('Quote email sent successfully:', result);

    return json({
      success: true,
      messageId: result.messageId,
      companyId: companyId
    });
  } catch (error) {
    console.error('Error sending quote email:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}) satisfies RequestHandler;

// Generate HTML email content for customer confirmation
function generateCustomerEmailContent({ customerName, quoteDescription, customerPhone, customerEmail, companyName, companyId }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #333;">Thank You for Your Quote Request!</h2>
      </div>
      
      <p style="font-size: 16px; line-height: 1.5; color: #333;">
        Hello ${customerName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.5; color: #333;">
        We've received your request for a quote regarding:
      </p>
      
      <div style="background-color: #f7f7f7; padding: 15px; border-left: 4px solid #4a90e2; margin: 20px 0; border-radius: 4px;">
        <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0;">
          ${quoteDescription}
        </p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.5; color: #333;">
        Our team will review your request and get back to you shortly with a detailed quote. We typically respond within 1-2 business days.
      </p>
      
      <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <h3 style="color: #333; margin-top: 0;">Your Contact Information:</h3>
        <ul style="font-size: 16px; line-height: 1.5; color: #333;">
          <li>Name: ${customerName}</li>
          <li>Phone: ${customerPhone}</li>
          <li>Email: ${customerEmail}</li>
        </ul>
      </div>
      
      <p style="font-size: 16px; line-height: 1.5; color: #333;">
        If you need to make any changes to your request, please reply to this email or contact our quote department directly.
      </p>
      
      <p style="font-size: 16px; line-height: 1.5; color: #333;">
        Thank you for considering our services!
      </p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #777; font-size: 14px;">
        <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        <p style="font-size: 12px; color: #999;">Reference: #${companyId}-QUOTE-${Date.now().toString(36)}</p>
      </div>
    </div>
  `;
}

// Generate HTML email content for internal notification
function generateOwnerEmailContent({ customerName, quoteDescription, customerPhone, customerEmail, companyName, companyId }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #333;">New Quote Request Received</h2>
        <p style="color: #666; font-size: 14px;">Company ID: ${companyId}</p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.5; color: #333;">
        A new quote request has been submitted through your website.
      </p>
      
      <div style="background-color: #f0f7ff; padding: 15px; border-left: 4px solid #4a90e2; margin: 20px 0; border-radius: 4px;">
        <h3 style="color: #333; margin-top: 0;">Customer Information:</h3>
        <ul style="font-size: 16px; line-height: 1.5; color: #333;">
          <li><strong>Name:</strong> ${customerName}</li>
          <li><strong>Phone:</strong> ${customerPhone}</li>
          <li><strong>Email:</strong> ${customerEmail}</li>
        </ul>
      </div>
      
      <div style="background-color: #f7f7f7; padding: 15px; border-left: 4px solid #4a90e2; margin: 20px 0; border-radius: 4px;">
        <h3 style="color: #333; margin-top: 0;">Quote Request:</h3>
        <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0;">
          ${quoteDescription}
        </p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.5; color: #333;">
        Please contact the customer to follow up on this request.
      </p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #777; font-size: 14px;">
        <p>This is an automated message from your quote system.</p>
        <p style="font-size: 12px; color: #999;">Reference: #${companyId}-QUOTE-${Date.now().toString(36)}</p>
      </div>
    </div>
  `;
}
