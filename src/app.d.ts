/// <reference types="@sveltejs/kit" />
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