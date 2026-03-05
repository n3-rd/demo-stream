import { BREVO_API_KEY } from '$env/static/private';
import { PUBLIC_SMTP_FROM } from '$env/static/public';

const BREVO_TIMEOUT_MS = 15000;
const BREVO_SMTP_URL = 'https://api.brevo.com/v3/smtp/email';

interface BrevoEmailPayload {
    sender: { name: string; email: string };
    to: Array<{ email: string; name?: string }>;
    cc?: Array<{ email: string; name?: string }>;
    subject: string;
    htmlContent: string;
    tags?: string[];
}

/**
 * Send a request to the Brevo SMTP API with a 15-second timeout.
 * Prevents indefinite hangs when Brevo is slow or unreachable (which causes nginx 504s).
 */
export async function brevoFetch(payload: BrevoEmailPayload): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BREVO_TIMEOUT_MS);
    try {
        return await fetch(BREVO_SMTP_URL, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
    } catch (err: any) {
        if (err.name === 'AbortError') {
            throw new Error('Brevo email request timed out after 15 seconds');
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

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

        const resp = await brevoFetch(emailPayload);
        return resp.ok;
    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
} 