import { json, type RequestHandler } from '@sveltejs/kit';

export const PUT: RequestHandler = async ({ request, locals, params }) => {
    if (!locals.pb?.authStore.isValid) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized'
        }), { status: 401 });
    }

    const formData = await request.formData();
    const assistantId = params.id;
    
    try {
        const data = {
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            type: formData.get('type') as string,
            configuration: formData.get('configuration') as string,
            is_active: formData.get('is_active') === 'true'
        };

        const assistant = await locals.pb.collection('ai_assistants').update(assistantId, data);
        
        return new Response(JSON.stringify({
            success: true,
            assistant: assistant
        }), { status: 200 });
    } catch (error) {
        console.error('Error updating AI assistant:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to update AI assistant'
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

    const assistantId = params.id;
    
    try {
        await locals.pb.collection('ai_assistants').delete(assistantId);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'AI assistant deleted successfully'
        }), { status: 200 });
    } catch (error) {
        console.error('Error deleting AI assistant:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to delete AI assistant'
        }), { status: 500 });
    }
}; 