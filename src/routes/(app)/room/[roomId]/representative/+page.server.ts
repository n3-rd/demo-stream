import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params  }) => {
      if (!locals.pb.authStore.isValid) {
        throw redirect(302, '/login');
    }

    const user = locals.pb.authStore.model;
    const representative = user.representative
    const roomUrl = `/room/${params.roomId}`
    console.log(user)
    return {
        user,
        params,
        representative,
        roomUrl
    };
};
