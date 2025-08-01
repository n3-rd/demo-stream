import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.pb?.authStore.isValid) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
    }

    const formData = await request.formData();
    
    try {
        const title = formData.get('title')?.toString() || 'AI Room Design';
        const description = formData.get('description')?.toString() || '';
        const originalFile = formData.get('original_file') as File;
        const generatedFile = formData.get('generated_file') as File;
        
        if (!originalFile || !generatedFile) {
            return new Response(JSON.stringify({ success: false, message: 'Both original and generated files are required' }), { status: 400 });
        }

        const pb = locals.pb;
        
        // Create record for original image
        const originalRecord = await pb.collection('content_library').create({
            title: `${title} - Original`,
            description: description,
            type: 'image',
            file: originalFile,
            owner_company: pb.authStore.model.id,
            active: true
        });

        // Create record for generated image
        const generatedRecord = await pb.collection('content_library').create({
            title: `${title} - Generated`,
            description: description,
            type: 'image',
            file: generatedFile,
            owner_company: pb.authStore.model.id,
            active: true
        });

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'AI room design uploaded successfully',
            originalId: originalRecord.id,
            generatedId: generatedRecord.id
        }), { status: 200 });
    } catch (error) {
        console.error('Error uploading AI room design:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            message: error instanceof Error ? error.message : 'Error uploading content'
        }), { status: 500 });
    }
}; 