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
            description: formData.get('description') as string,
            type: formData.get('type') as string,
            configuration: formData.get('configuration') as string,
            owner_company: locals.pb.authStore.model.id,
            is_active: formData.get('is_active') === 'true'
        };

        const assistant = await locals.pb.collection('ai_assistants').create(data);
        
        return new Response(JSON.stringify({
            success: true,
            assistant: assistant
        }), { status: 200 });
    } catch (error) {
        console.error('Error creating AI assistant:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to create AI assistant'
        }), { status: 500 });
    }
}; 