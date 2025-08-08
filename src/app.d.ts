/// <reference types="@sveltejs/kit" />

declare module '$env/static/public' {
	export const PUBLIC_DAILY_API_KEY: string;
	export const PUBLIC_POCKETBASE_INSTANCE: string;
	export const PUBLIC_BREVO_API_KEY: string;
	export const PUBLIC_APP_URL: string;
}

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			pb: typeof import('$lib/pocketbase').pb;
			user: {
				id: string;
				email: string;
				name?: string;
			} | null;
			userid: string;
			session?: string;
			viewroomUser?: {
				id: string;
				first_name: string;
				last_name: string;
				company: string;
				email: string;
			};
		}
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
