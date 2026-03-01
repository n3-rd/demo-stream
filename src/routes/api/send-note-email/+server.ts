import nodemailer from 'nodemailer';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } from '$env/static/private';
import { PUBLIC_SMTP_FROM } from '$env/static/public';

// Reuse the same email transporter configuration
const transporter = nodemailer.createTransport({
  host: SMTP_HOST || 'smtp.example.com',
  port: parseInt(SMTP_PORT || '587'),
  secure: SMTP_SECURE === 'true',
  auth: {
    user: SMTP_USER || 'user@example.com',
    pass: SMTP_PASS || 'password'
  }
});

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const { title, requirements, steps, keep, recipient } = data;

    // Create sections for the email content
    const requirementsSection = requirements ? `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #333; margin-bottom: 10px;">Requirements</h3>
        <p style="white-space: pre-line;">${requirements}</p>
      </div>
    ` : '';

    const stepsSection = steps ? `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #333; margin-bottom: 10px;">Steps</h3>
        <p style="white-space: pre-line;">${steps}</p>
      </div>
    ` : '';

    const keepSection = keep ? `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #333; margin-bottom: 10px;">Keep</h3>
        <p style="white-space: pre-line;">${keep}</p>
      </div>
    ` : '';

    // Send the email
    await transporter.sendMail({
      from: `"Notes Service" <${PUBLIC_SMTP_FROM || 'noreply@example.com'}>`,
      to: recipient,
      subject: `Notes: ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #4a5568; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eee;">${title}</h2>
          
          ${requirementsSection}
          ${stepsSection}
          ${keepSection}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #718096; font-size: 0.8em;">
            <p>This email was sent from your notes application.</p>
          </div>
        </div>
      `
    });

    return json({ success: true });
  } catch (error) {
    console.error('Error sending notes email:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};