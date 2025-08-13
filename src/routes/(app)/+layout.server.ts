// import type { PageServerLoad } from './$types';

export const load = async ({ locals, cookies }) => {
	const hasAdmin = !!cookies.get('session');
	const isLoggedIn = hasAdmin && locals.pb.authStore.isValid;
	const user = isLoggedIn ? locals.pb.authStore.model : null;
	return {
		isLoggedIn,
		user,
	};
};
