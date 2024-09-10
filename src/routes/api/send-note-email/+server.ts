import { render } from 'svelte-email';
import nodemailer from 'nodemailer';
import NoteEmail from '../../../lib/components/email/note_email.svelte';
import type { RequestHandler } from '@sveltejs/kit';
import { PUBLIC_ELASTICE_MAIL_EMAIL, PUBLIC_ELASTICE_MAIL_HOST, PUBLIC_ELASTICE_MAIL_PASS } from '$env/static/public';

const transporter = nodemailer.createTransport({
    host: PUBLIC_ELASTICE_MAIL_HOST,
    port: 2525,
    secure: false,
    auth: {
        user: PUBLIC_ELASTICE_MAIL_EMAIL,
        pass: PUBLIC_ELASTICE_MAIL_PASS
    }
});

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { title, requirements, steps, keep, recipient } = await request.json();

        const emailHtml = render({
            template: NoteEmail,
            props: {
                title: title,
                requirements: requirements,
                steps: steps,
                keep: keep
            }
        });

        const options = {
            from: PUBLIC_ELASTICE_MAIL_EMAIL,
            to: recipient,
            subject: 'Notes',
            html: emailHtml
        };

        await transporter.sendMail(options);

        console.log('Email sent successfully from /api/send-note-email');
        return new Response(JSON.stringify({ message: 'Email sent successfully' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Failed to send email from /api/send-note-email', error);
        return new Response(JSON.stringify({ error: 'Failed to send email' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};