import { json, type RequestHandler } from '@sveltejs/kit';

export const PUT: RequestHandler = async ({ request, locals, params }) => {
    if (!locals.pb?.authStore.isValid) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized'
        }), { status: 401 });
    }

    const formData = await request.formData();
    const locationId = params.id;
    
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
            is_active: formData.get('is_active') === 'true'
        };

        const location = await locals.pb.collection('locations').update(locationId, data);
        
        return new Response(JSON.stringify({
            success: true,
            location: location
        }), { status: 200 });
    } catch (error) {
        console.error('Error updating location:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to update location'
        }), { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
    if (!locals.pb?.authStore.isValid) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized'
        }), { status: 401 });
    }

    const locationId = params.id;
    
    try {
        await locals.pb.collection('locations').delete(locationId);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Location deleted successfully'
        }), { status: 200 });
    } catch (error) {
        console.error('Error deleting location:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to delete location'
        }), { status: 500 });
    }
}; 