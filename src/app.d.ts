/// <reference types="@sveltejs/kit" />
/// <reference types="vite/client" />
/// <reference types="svelte" />

interface Locals {
    pb: {
        authStore: {
            isValid: boolean;
            model: {
                id: string;
                username?: string;
                email?: string;
                company_name?: string;
                first_name?: string;
                last_name?: string;
                name?: string;
            };
        };
        collection: (name: string) => {
            create: (data: Record<string, any>) => Promise<any>;
            getFirstListItem: (query: string) => Promise<any>;
            getFullList: (options?: {
                filter?: string;
                expand?: string;
                sort?: string;
            }) => Promise<any[]>;
            getOne: (id: string, options?: {
                expand?: string;
            }) => Promise<any>;
            update: (id: string, data: Record<string, any>) => Promise<any>;
        };
    };
    user?: {
        id: string;
        email?: string;
        name?: string;
    } | null;
}

interface ImportMetaEnv {
    readonly VITE_PUBLIC_POCKETBASE_URL: string;
    // Add other environment variables here
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

declare module '$env/static/public' {
	export const PUBLIC_DAILY_API_KEY: string;
	export const PUBLIC_POCKETBASE_INSTANCE: string;
	export const PUBLIC_BREVO_API_KEY: string;
	export const PUBLIC_APP_URL: string;
	export const PUBLIC_SMTP_FROM: string;
	export const PUBLIC_SMTP_HOST: string;
	export const PUBLIC_SMTP_PORT: string;
	export const PUBLIC_SMTP_SECURE: string;
	export const PUBLIC_SMTP_USER: string;
	export const PUBLIC_SMTP_PASS: string;
}

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {}
		interface PrivateEnv {}
		interface PublicEnv {
			PUBLIC_BREVO_API_KEY: string;
			PUBLIC_APP_URL: string;
		}
	}
}

export {};
