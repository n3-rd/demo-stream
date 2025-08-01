import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals, params }) => {
    if (!locals.pb?.authStore.isValid) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
    }

    const formData = await request.formData();
    const fileIndex = parseInt(formData.get('fileIndex') as string);
    const assistantId = params.id;

    if (isNaN(fileIndex)) {
        return new Response(JSON.stringify({ success: false, message: 'Invalid file index' }), { status: 400 });
    }

    try {
        // Get the current assistant
        const assistant = await locals.pb.collection('ai_assistants').getOne(assistantId);
        
        if (!assistant) {
            return new Response(JSON.stringify({ success: false, message: 'AI assistant not found' }), { status: 404 });
        }

        // Remove the file at the specified index
        const trainingFiles = assistant.training_files || [];
        if (fileIndex >= 0 && fileIndex < trainingFiles.length) {
            trainingFiles.splice(fileIndex, 1);
            
            // Update the assistant
            await locals.pb.collection('ai_assistants').update(assistantId, {
                training_files: trainingFiles
            });

            return new Response(JSON.stringify({ success: true, message: 'File removed successfully' }), { status: 200 });
        } else {
            return new Response(JSON.stringify({ success: false, message: 'Invalid file index' }), { status: 400 });
        }
    } catch (error) {
        console.error('Error removing file:', error);
        return new Response(JSON.stringify({ success: false, message: 'Failed to remove file' }), { status: 500 });
    }
}; 