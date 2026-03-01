import nodemailer from 'nodemailer';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } from '$env/static/private';
import { PUBLIC_SMTP_FROM } from '$env/static/public';

// Configure email transporter
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
    const { customerName, customerEmail, repName, repEmail, bookingDate, bookingTime, roomName, dayOfWeek } = data;

    // Format date for email
    const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    // Send email to customer
    await transporter.sendMail({
      from: `"Meeting Scheduler" <${PUBLIC_SMTP_FROM || 'noreply@example.com'}>`,
      to: customerEmail,
      subject: `Your appointment with ${repName} has been scheduled`,
      html: `
        <h2>Appointment Confirmation</h2>
        <p>Hello ${customerName},</p>
        <p>Your appointment has been scheduled successfully!</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${bookingTime}</p>
        <p><strong>Representative:</strong> ${repName}</p>
        <p><strong>Room Name:</strong> ${roomName}</p>
        <p>Thank you for scheduling with us.</p>
      `
    });

    // Send email to representative
    await transporter.sendMail({
      from: `"Meeting Scheduler" <${PUBLIC_SMTP_FROM || 'noreply@example.com'}>`,
      to: repEmail,
      subject: `New appointment scheduled on ${formattedDate}`,
      html: `
        <h2>New Appointment</h2>
        <p>Hello ${repName},</p>
        <p>A new appointment has been scheduled with you:</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${bookingTime}</p>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Customer Email:</strong> ${customerEmail}</p>
        <p><strong>Room Name:</strong> ${roomName}</p>
      `
    });

    return json({ success: true });
  } catch (error) {
    console.error('Email sending error:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};