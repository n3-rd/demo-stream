import { json, type RequestHandler } from '@sveltejs/kit';

export const PUT: RequestHandler = async ({ request, locals, params }) => {
    if (!(locals as any).pb?.authStore.isValid) {
        return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const assistantId = params.id;
    
    try {
        const existingAssistant = await (locals as any).pb.collection('ai_assistants').getOne(assistantId);

        const updateData: Record<string, any> = {};
        const viewroomIds = formData.getAll('viewrooom_connections').filter((v): v is string => typeof v === 'string');
        const trainingFiles = formData.getAll('training_files').filter((v): v is File => v instanceof File);

        for (const [key, value] of formData.entries()) {
            if (key === 'viewrooom_connections' || key === 'training_files') continue;
            updateData[key] = value;
        }
        if (formData.has('viewrooom_connections')) updateData['viewrooom_connections'] = viewroomIds;
        if (formData.has('training_files')) updateData['training_files'] = trainingFiles;

        const sanitizedExisting: Record<string, any> = { ...existingAssistant };
        if (Array.isArray(sanitizedExisting.viewrooom_connections) && sanitizedExisting.viewrooom_connections.length > 0) {
            const first = sanitizedExisting.viewrooom_connections[0];
            if (typeof first === 'object' && first !== null && 'id' in first) {
                sanitizedExisting.viewrooom_connections = sanitizedExisting.viewrooom_connections.map((c: any) => c?.id ?? c);
            }
        }

        const finalData = { ...sanitizedExisting, ...updateData };

        const assistant = await (locals as any).pb.collection('ai_assistants').update(assistantId, finalData);
        
        return json({ success: true, assistant });

    } catch (error) {
        console.error('Error updating AI assistant:', error);
        return json({ success: false, message: 'Failed to update AI assistant' }, { status: 500 });
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