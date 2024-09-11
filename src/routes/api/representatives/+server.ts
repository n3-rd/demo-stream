// src/routes/api/representatives.ts
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
    try {
        const representatives = await locals.pb.collection('users').getFullList({
            filter: 'representative = true',
        });
        return new Response(JSON.stringify({ representatives }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Failed to fetch representatives:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch representatives' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
};