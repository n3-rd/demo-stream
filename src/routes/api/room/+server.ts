import { json, type RequestHandler } from '@sveltejs/kit';
import { PUBLIC_DAILY_API_KEY } from '$env/static/public';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.pb.authStore.isValid) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized'
        }), { status: 401 });
    }

    const user = locals.pb.authStore.model;
    const username = user.name;
    // add 1 day room expiration
    const exp = Math.round(Date.now() / 1000) + 60 * 60 * 24;
    const options = {
        properties: {
            exp,
            userName: username
        }
    };

    try {
        const res = await fetch('https://api.daily.co/v1/rooms', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${PUBLIC_DAILY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(options)
        });

        if (res.ok) {
            const room = await res.json();
            return new Response(JSON.stringify({
                success: true,
                room
            }), { status: 200 });
        } else {
            return new Response(JSON.stringify({
                success: false
            }), { status: res.status });
        }
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            message: 'something went wrong with the room submit!'
        }), { status: 500 });
    }
};