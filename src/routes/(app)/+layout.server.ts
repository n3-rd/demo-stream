// import type { PageServerLoad } from './$types';

export const load = async ({ locals }) => {
	const isLoggedIn = locals.pb.authStore.isValid;
	const user = locals.pb.authStore.model;
	const representatives = await locals.pb.collection('users').getFullList({
        filter: 'representative = true',
    });
	return {
		isLoggedIn,
		user,
		representatives
	};
};
