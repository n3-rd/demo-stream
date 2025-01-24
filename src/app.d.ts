/// <reference types="@sveltejs/kit" />
import type PocketBase from 'pocketbase';

declare module '$env/static/public' {
	export const PUBLIC_DAILY_API_KEY: string;
	export const PUBLIC_POCKETBASE_INSTANCE: string;
}

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			pb: PocketBase;
			user: {
				id: string;
				email: string;
				name?: string;
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
