// src/routes/api/representatives.ts
import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
    if (!locals.pb.authStore.isValid) {
        return json([], { status: 401 });
    }

    const user = locals.pb.authStore.model;

    try {
        const representatives = await locals.pb.collection('representatives').getFullList({
            filter: `company = "${user.id}"`,
            sort: '-created'
        });

        return json(representatives);
    } catch (err) {
        console.error('Error fetching representatives:', err);
        return json([], { status: 500 });
    }
}