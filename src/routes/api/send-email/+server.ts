import { render } from 'svelte-email';
import nodemailer from 'nodemailer';
import Invite from '$lib/components/email/invite.svelte';
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
        const { url, name, receipient } = await request.json();

        const emailHtml = render({
            template: Invite,
            props: {
                name: name,
                url: url
            }
        });

        const options = {
            from: PUBLIC_ELASTICE_MAIL_EMAIL,
            to: receipient,
            subject: 'Invite',
            html: emailHtml
        };

        await transporter.sendMail(options);

        console.log('Email sent successfully from /api/send-email');
        return {
            status: 200,
            body: { message: 'Email sent successfully' }
        };
    } catch (error) {
        console.error('Failed to send email from /api/send-email', error);
        return {
            status: 500,
            body: { error: 'Failed to send email' }
        };
    }
};