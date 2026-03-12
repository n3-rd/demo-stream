/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly BREVO_API_KEY: string;
    readonly PUBLIC_SMTP_FROM: string;
    readonly PUBLIC_ANT_MEDIA_URL: string;
    readonly PUBLIC_BREVO_SENDER_EMAIL: string;
    /** PartyKit host for the sync service, e.g. "demo-stream-sync.your-username.partykit.dev" */
    readonly PUBLIC_PARTYKIT_HOST: string;
    readonly VITE_PARTYKIT_HOST: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
} 