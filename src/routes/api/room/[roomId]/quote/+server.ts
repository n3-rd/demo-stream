import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals, params }) => {
    if (!locals.pb?.authStore.isValid) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized'
        }), { status: 401 });
    }

    const formData = await request.formData();
    const roomId = params.roomId;
    
    try {
        const data = {
            first_name: formData.get('first_name') as string,
            last_name: formData.get('last_name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            company: formData.get('company') as string,
            message: formData.get('message') as string,
            room_id: roomId,
            status: 'pending'
        };

        const quote = await locals.pb.collection('quotes').create(data);
        
        return new Response(JSON.stringify({
            success: true,
            quote: quote,
            message: 'Quote request submitted successfully'
        }), { status: 200 });
    } catch (error) {
        console.error('Error creating quote:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to submit quote request'
        }), { status: 500 });
    }
}; 