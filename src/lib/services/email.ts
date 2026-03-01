import { BREVO_API_KEY } from '$env/static/private';
import { PUBLIC_SMTP_FROM } from '$env/static/public';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
    try {
        const emailPayload = {
            sender: {
                name: "View-Room",
                email: options.from || PUBLIC_SMTP_FROM
            },
            to: [
                {
                    email: options.to
                }
            ],
            subject: options.subject,
            htmlContent: options.html
        };

        const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify(emailPayload)
        });

        return resp.ok;
    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
} 