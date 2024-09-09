import { json } from '@sveltejs/kit';

export async function POST() {
    /**
     * Note: You must add your Daily API key to an .env file
     * for this request to work. Refer to the README for
     * further instructions. :)
     */
    const DAILY_API_KEY = import.meta.env.VITE_DAILY_API_KEY;

    // add 30min room expiration
    const exp = Math.round(Date.now() / 1000) + 60 * 30;
    const options = {
        properties: {
            exp
        }
    };

    try {
        const res = await fetch('https://api.daily.co/v1/rooms', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${DAILY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(options)
        });

        if (res.ok) {
            const room = await res.json();
            return json({
                success: true,
                room
            }, { status: 200 });
        } else {
            return json({
                success: false
            }, { status: res.status });
        }
    } catch (error) {
        return json({
            success: false,
            message: 'something went wrong with the room submit!'
        }, { status: 500 });
    }
}