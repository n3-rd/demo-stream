// src/routes/api/representatives.ts
import { json, type RequestHandler } from '@sveltejs/kit';

export async function GET({ locals }) {
    if (!locals.pb.authStore.isValid) {
        return json([], { status: 401 });
    }

    const user = locals.pb.authStore.model;

    try {
        const representatives = await locals.pb.collection('representatives').getFullList({
            filter: `company = "${user.id}"`,
            sort: '-created'
        });

        return json(representatives);
    } catch (err) {
        console.error('Error fetching representatives:', err);
        return json([], { status: 500 });
    }
}

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.pb?.authStore.isValid) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized'
        }), { status: 401 });
    }

    const formData = await request.formData();
    
    try {
        const first_name = String(formData.get('first_name') || '').trim();
        const last_name = String(formData.get('last_name') || '').trim();
        const name = [first_name, last_name].filter(Boolean).join(' ').trim() || String(formData.get('name') || '').trim();
        const data = {
            name,
            first_name: first_name || null,
            last_name: last_name || null,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            company: locals.pb.authStore.model.id,
            is_active: formData.get('is_active') === 'true',
            schedule: formData.get('schedule') as string || '',
            connected_content: []
        } as any;

        const record = await locals.pb.collection('representatives').create(data);
        
        return new Response(JSON.stringify({
            success: true,
            representative: record
        }), { status: 200 });
    } catch (error) {
        console.error('Error creating representative:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to create representative'
        }), { status: 500 });
    }
};

export const PUT: RequestHandler = async ({ request, locals }) => {
    if (!locals.pb?.authStore.isValid) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized'
        }), { status: 401 });
    }

    const formData = await request.formData();
    const id = formData.get('id') as string;
    
    try {
        const first_name = String(formData.get('first_name') || '').trim();
        const last_name = String(formData.get('last_name') || '').trim();
        const name = [first_name, last_name].filter(Boolean).join(' ').trim() || String(formData.get('name') || '').trim();
        const data = {
            name,
            first_name: first_name || null,
            last_name: last_name || null,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            is_active: formData.get('is_active') === 'true',
            schedule: formData.get('schedule') as string || ''
        } as any;

        const record = await locals.pb.collection('representatives').update(id, data);
        
        return new Response(JSON.stringify({
            success: true,
            representative: record
        }), { status: 200 });
    } catch (error) {
        console.error('Error updating representative:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to update representative'
        }), { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
    if (!locals.pb?.authStore.isValid) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized'
        }), { status: 401 });
    }

    const formData = await request.formData();
    const id = formData.get('id') as string;
    
    try {
        await locals.pb.collection('representatives').delete(id);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Representative deleted successfully'
        }), { status: 200 });
    } catch (error) {
        console.error('Error deleting representative:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to delete representative'
        }), { status: 500 });
    }
};