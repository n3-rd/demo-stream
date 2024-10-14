import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.pb.authStore.isValid) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = locals.pb.authStore.model;
    if (!user.superuser) {
        return json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { userId, makeRepresentative } = await request.json();

        const updatedUser = await locals.pb.collection('users').update(userId, {
            representative: makeRepresentative
        });

        return json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Error toggling representative status:', error);
        return json({ error: 'Failed to update representative status' }, { status: 500 });
    }
};
