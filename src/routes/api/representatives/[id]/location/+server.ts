import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';
import PocketBase from 'pocketbase';

export const POST: RequestHandler = async ({ params, request, locals }) => {
    try {
        const { locationId } = await request.json();
        
        if (!locationId) {
            return json({ error: 'Location ID is required' }, { status: 400 });
        }

        const pb = new PocketBase(PUBLIC_POCKETBASE_INSTANCE);
        // Use the auth from the client
        pb.authStore.loadFromCookie(request.headers.get('cookie') || '');

        if (!pb.authStore.isValid) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        await pb.collection('representatives').update(params.id, {
            location: locationId
        });

        return json({ success: true });
    } catch (error) {
        console.error('Error updating representative location:', error);
        return json({ error: 'Failed to update representative location' }, { status: 500 });
    }
}; 