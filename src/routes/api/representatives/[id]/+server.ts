import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
    try {
        const representative = await locals.pb.collection('users').getOne(params.id);
        return json(representative);
    } catch (error) {
        console.error('Error fetching representative:', error);
        return json({ error: 'Representative not found' }, { status: 404 });
    }
};

