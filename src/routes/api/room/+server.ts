import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals }) => {
    if (!locals.pb.authStore.isValid) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized'
        }), { status: 401 });
    }

    return json(
        { success: false, message: 'Daily.co video calls are no longer supported. Use the room flow instead.' },
        { status: 501 }
    );
};
