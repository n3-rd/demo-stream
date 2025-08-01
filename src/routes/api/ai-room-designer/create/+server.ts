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
        // Get form values
        const title = formData.get('title')?.toString() || 'AI Room Design';
        const description = formData.get('description')?.toString() || '';
        const libraryType = formData.get('library_type')?.toString() || 'both';
        const ownerCompany = formData.get('owner_company')?.toString() || '';
        
        // Get both files
        const originalFile = formData.get('original_file') as File;
        const generatedFile = formData.get('generated_file') as File;
        
        if (!originalFile || !generatedFile || 
            !(originalFile instanceof File) || 
            !(generatedFile instanceof File)) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Missing or invalid files'
            }), { status: 400 });
        }
        
        // Create the records for both images
        const pb = locals.pb;
        
        // Create record for original image
        const originalData = new FormData();
        originalData.append('title', `${title} - Original`);
        originalData.append('description', `Original image for ${description}`);
        originalData.append('type', 'image');
        originalData.append('file', originalFile);
        
        // Handle library_type correctly for 'both'
        if (libraryType === 'both') {
            originalData.append('library_type', 'host');
            originalData.append('library_type', 'representative');
        } else {
            originalData.append('library_type', libraryType);
        }
        
        originalData.append('active', 'true');
        originalData.append('owner_company', ownerCompany);
        
        const originalRecord = await pb.collection('content_library').create(originalData);
        
        // Create record for generated image
        const generatedData = new FormData();
        generatedData.append('title', `${title} - AI Generated`);
        generatedData.append('description', description);
        generatedData.append('type', 'image');
        generatedData.append('file', generatedFile);
        
        // Handle library_type correctly for 'both'
        if (libraryType === 'both') {
            generatedData.append('library_type', 'host');
            generatedData.append('library_type', 'representative');
        } else {
            generatedData.append('library_type', libraryType);
        }
        
        generatedData.append('active', 'true');
        generatedData.append('owner_company', ownerCompany);
        
        const generatedRecord = await pb.collection('content_library').create(generatedData);
        
        return new Response(JSON.stringify({
            success: true,
            type: 'success',
            originalId: originalRecord.id,
            generatedId: generatedRecord.id
        }), { status: 200 });
    } catch (error) {
        console.error('Error uploading AI room design:', error);
        return new Response(JSON.stringify({
            success: false,
            type: 'error', 
            message: error instanceof Error ? error.message : 'Error uploading content'
        }), { status: 500 });
    }
}; 