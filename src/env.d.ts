/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly BREVO_API_KEY: string;
    readonly PUBLIC_SMTP_FROM: string;
    readonly PUBLIC_ANT_MEDIA_URL: string;
    readonly PUBLIC_BREVO_SENDER_EMAIL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
} 