/// <reference types="@sveltejs/kit" />
/// <reference types="vite/client" />
/// <reference types="svelte" />



interface ImportMetaEnv {
    readonly VITE_BUNNY_ACCESS_KEY: string;
    readonly VITE_BUNNY_STORAGE_ZONE: string;
    readonly VITE_BUNNY_STORAGE_PASSWORD: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

declare module '$env/static/public' {
    export const PUBLIC_POCKETBASE_INSTANCE: string;
    export const PUBLIC_APP_URL: string;
    export const PUBLIC_SMTP_FROM: string;
}

declare global {
    interface User {
        id: string;
        email: string;
        name?: string;
        companyName?: string;
        companyLogo?: string;
    }

    namespace App {
        // interface Error {}
        interface Locals {
            pb: any;
            user: User | null;
            userid: string;
            session?: string;
        }
        // interface PageData {}
        // interface PageState {}
        interface Platform { }
        interface PrivateEnv { }
        interface PublicEnv {
            PUBLIC_APP_URL: string;
        }
    }
}

export { };
