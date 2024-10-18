/// <reference types="@sveltejs/kit" />

declare module '$env/static/public' {
	export const PUBLIC_DAILY_API_KEY: string;
}

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			pb;
			user;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
