import { json, type RequestHandler } from '@sveltejs/kit';
import { PUBLIC_DAILY_API_KEY } from '$env/static/public';
import { Actions } from '@sveltejs/kit';

const DAILY_API_KEY = PUBLIC_DAILY_API_KEY as string;


export const load = async ({ locals }) => {
    const isLoggedIn = locals.pb.authStore.isValid;
    const user = locals.pb.authStore.model;
    const representatives = await locals.pb.collection('users').getFullList({
        filter: 'representative = true',
    });
    console.log('Load function called:', { isLoggedIn, user });

    return {
        isLoggedIn,
        user,
        representatives
    };
};

export const actions: Actions = {
    'create-room': async () => {
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
    },
    'request-quote': async ({ request, locals }) => {
        const formData = await request.formData();
        const first_name = formData.get('first_name');
        const last_name = formData.get('last_name');
        const phone = formData.get('phone');
        const email = formData.get('email');
        const description = formData.get('description');

        const data = {
            first_name,
            last_name,
            phone,
            email,
            description
        };
        await locals.pb.collection('quotes').create(data).then((result) => {
            console.log('Quote request created:', result);
            return {
                status: 200,
                body: { message: 'Quote request created successfully' }
            };
        }).catch((err) => {
            console.error('Failed to create quote request:', err);
            return {
                status: 500,
                body: { error: 'Failed to create quote request' }
            };
        });
    }
};