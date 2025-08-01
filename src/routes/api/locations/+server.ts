import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.pb?.authStore.isValid) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized'
        }), { status: 401 });
    }

    const formData = await request.formData();
    
    try {
        const data = {
            name: formData.get('name') as string,
            address: formData.get('address') as string,
            city: formData.get('city') as string,
            state: formData.get('state') as string,
            zip_code: formData.get('zip_code') as string,
            country: formData.get('country') as string,
            phone: formData.get('phone') as string,
            hours: {
                Mon: formData.get('Mon') as string || '',
                Tue: formData.get('Tue') as string || '',
                Wed: formData.get('Wed') as string || '',
                Thurs: formData.get('Thurs') as string || '',
                Fri: formData.get('Fri') as string || '',
                Sat: formData.get('Sat') as string || '',
                Sun: formData.get('Sun') as string || ''
            },
            owner_company: locals.pb.authStore.model.id,
            is_active: formData.get('is_active') === 'true'
        };

        const location = await locals.pb.collection('locations').create(data);
        
        return new Response(JSON.stringify({
            success: true,
            location: location
        }), { status: 200 });
    } catch (error) {
        console.error('Error creating location:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to create location'
        }), { status: 500 });
    }
}; 