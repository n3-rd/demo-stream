import { json, type RequestHandler } from '@sveltejs/kit';

export const PUT: RequestHandler = async ({ request, locals, params }) => {
    if (!locals.pb?.authStore.isValid) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized'
        }), { status: 401 });
    }

    const formData = await request.formData();
    const contentId = params.id;
    
    try {
        const updateData = {
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            active: formData.get('active') === 'true'
        };

        await locals.pb.collection('content_library').update(contentId, updateData);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Content updated successfully'
        }), { status: 200 });
    } catch (error) {
        console.error('Error updating content:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to update content'
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

    const contentId = params.id;
    
    try {
        await locals.pb.collection('content_library').delete(contentId);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Content deleted successfully'
        }), { status: 200 });
    } catch (error) {
        console.error('Error deleting content:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to delete content'
        }), { status: 500 });
    }
}; 