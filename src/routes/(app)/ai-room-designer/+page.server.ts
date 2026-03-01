import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/db/drizzle';
import { representatives } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.pb?.authStore.isValid) {
        throw error(401, 'Unauthorized');
    }

    const user = locals.pb.authStore.model as { id: string };
    if (!user?.id) {
        throw error(401, 'Unauthorized');
    }

    try {
        const reps = await db
            .select()
            .from(representatives)
            .where(eq(representatives.company, user.id));

        return {
            user,
            representatives: reps
        };
    } catch (err) {
        console.error('Error fetching representatives:', err);
        return {
            user,
            representatives: []
        };
    }
};
