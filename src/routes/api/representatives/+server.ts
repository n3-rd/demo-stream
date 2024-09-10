// src/routes/api/representatives.ts
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
    try {
        const representatives = await locals.pb.collection('users').getFullList({
            filter: 'representative = true',
        });
        return {
            status: 200,
            body: { representatives }
        };
    } catch (error) {
        console.error('Failed to fetch representatives:', error);
        return {
            status: 500,
            body: { error: 'Failed to fetch representatives' }
        };
    }
};