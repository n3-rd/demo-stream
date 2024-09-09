// import type { PageServerLoad } from './$types';

export const load = async ({ locals }) => {
	const isLoggedIn = locals.pb.authStore.isValid;
	return {
		isLoggedIn
	};
};
