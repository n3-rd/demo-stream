import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { join } from 'path';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.pb.authStore.isValid) {
        throw error(401, 'Unauthorized');
    }

    const user = locals.pb.authStore.model;

    try {
        const representatives = await locals.pb.collection('representatives').getFullList({
            filter: `company = "${user.id}"`,
            sort: '-created'
        });

        return {
            user,
            representatives
        };
    } catch (err) {
        console.error('Error fetching representatives:', err);
        return {
            user,
            representatives: []
        };
    }
};

export const actions: Actions = {
    uploadContent: async ({ request, locals }) => {
        if (!locals.pb.authStore.isValid) {
            throw error(401, 'Unauthorized');
        }

        const user = locals.pb.authStore.model;
        const formData = await request.formData();

        try {
            const type = formData.get('type') as string;
            const title = formData.get('title') as string;
            const description = formData.get('description') as string;
            const fileRef = formData.get('file_ref') as string;
            const libraryType = formData.get('library_type') as string;
            const representatives = formData.get('representatives') as string;
            const thumbnail = formData.get('thumbnail') as File;
            const repIds = representatives ? representatives.split(',') : [];

            // Get the file from the temp directory if we have a file reference
            let file = null;
            if (fileRef) {
                try {
                    // First try direct file access (for Vercel environment)
                    const tempPath = join('/tmp/upload', fileRef);
                    let buffer = null;
                    
                    // Check if the file exists in the temp directory
                    console.log(`Checking if file exists at: ${tempPath}`);
                    try {
                        const { readFile, existsSync } = await import('node:fs/promises');
                        const { readFile: fsReadFile } = await import('node:fs/promises');
                        const { existsSync: fsExistsSync } = await import('node:fs');
                        
                        if (fsExistsSync(tempPath)) {
                            console.log(`File exists, reading directly from: ${tempPath}`);
                            buffer = await fsReadFile(tempPath);
                            console.log(`Successfully read file directly, size: ${buffer.length} bytes`);
                            
                            // Get the original filename from the temp filename (remove timestamp prefix)
                            const originalFilename = fileRef.split('-').slice(1).join('-');
                            
                            // Determine the content type
                            const contentType = getContentType(originalFilename);
                            
                            // Create a file object
                            file = new File([buffer], originalFilename, { type: contentType });
                            console.log(`Created File object with name: ${originalFilename}, type: ${contentType}`);
                        } else {
                            console.log(`File not found at ${tempPath}, falling back to API endpoint`);
                        }
                    } catch (directReadError) {
                        console.error(`Error reading file directly: ${directReadError.message}`);
                        console.log('Falling back to API endpoint');
                    }
                    
                    // If direct file access failed, try the API endpoint
                    if (!file) {
                        // Create a new FormData to send to our combine-chunks endpoint
                        const chunkFormData = new FormData();
                        chunkFormData.append('filename', fileRef);
                        
                        // Get the base URL from the request
                        const requestUrl = new URL(request.url);
                        const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
                        
                        // Call our endpoint with absolute URL to ensure it works in serverless
                        console.log(`Attempting to fetch chunks from ${baseUrl}/api/combine-chunks with filename: ${fileRef}`);
                        const fileResponse = await fetch(`${baseUrl}/api/combine-chunks`, {
                            method: 'POST',
                            body: chunkFormData
                        });
                        
                        if (!fileResponse.ok) {
                            const errorText = await fileResponse.text();
                            console.error(`Chunk combine failed with status ${fileResponse.status}: ${errorText}`);
                            throw new Error(`Failed to get file from chunks: ${fileResponse.status} ${errorText}`);
                        }
                        
                        // Get the response FormData that contains our file
                        const responseFormData = await fileResponse.formData();
                        file = responseFormData.get('file') as File;
                        
                        if (!file) {
                            throw new Error('No file returned from combine-chunks endpoint');
                        }
                        
                        console.log(`Successfully retrieved file '${fileRef}' from chunks`);
                    }
                } catch (error) {
                    console.error('Error getting file from chunks:', error);
                    throw error;
                }
            }

            // Base content data
            const contentData: Record<string, any> = {
                title,
                description,
                type,
                thumbnail,
                owner_company: user.id,
                active: formData.get('active') === 'true'
            };
            
            // Debug logging to check the value
            console.log('Active status from form:', formData.get('active'));
            console.log('Parsed active status:', contentData.active);
            
            // Only add the file if we have one
            if (file) {
                contentData.file = file;
            }

            // Create content based on library type
            if (libraryType === 'host') {
                // Create in host library
                contentData.library_type = 'host';
                await locals.pb.collection('content_library').create(contentData);
            } else if (libraryType === 'representative') {
                // Create in representative library
                contentData.library_type = 'representative';
                const record = await locals.pb.collection('content_library').create(contentData);

                // Update each selected representative
                for (const repId of repIds) {
                    // Get current representative data
                    const rep = await locals.pb.collection('representatives').getOne(repId);
                    
                    // Create a new array with existing content plus the new one
                    const connectedContent = Array.isArray(rep.connected_content) 
                        ? [...rep.connected_content, record.id]
                        : [record.id];
                    
                    // Update the representative with the full data structure
                    await locals.pb.collection('representatives').update(repId, {
                        "name": rep.name,
                        "email": rep.email,
                        "phone": rep.phone,
                        "company": rep.company,
                        "is_active": rep.is_active,
                        "schedule": rep.schedule,
                        "connected_content": connectedContent
                    });
                }
            } else if (libraryType === 'both') {
                // Create single entry with both types
                contentData.library_type = ['host', 'representative'];
                const record = await locals.pb.collection('content_library').create(contentData);

                // Update each selected representative
                for (const repId of repIds) {
                    // Get current representative data
                    const rep = await locals.pb.collection('representatives').getOne(repId);
                    
                    // Create a new array with existing content plus the new one
                    const connectedContent = Array.isArray(rep.connected_content) 
                        ? [...rep.connected_content, record.id]
                        : [record.id];
                    
                    // Update the representative with the full data structure
                    await locals.pb.collection('representatives').update(repId, {
                        "name": rep.name,
                        "email": rep.email,
                        "phone": rep.phone,
                        "company": rep.company,
                        "is_active": rep.is_active,
                        "schedule": rep.schedule,
                        "connected_content": connectedContent
                    });
                }
            }

            return {
                type: 'success'
            };
        } catch (err) {
            console.error('Error uploading content:', err);
            return fail(400, {
                type: 'error',
                message: 'Failed to upload content'
            });
        }
    },

    // Add a new action for AI room designs
    uploadAiRoomDesign: async ({ request, locals }) => {
        const formData = await request.formData();
        
        try {
            // Get form values
            const title = formData.get('title')?.toString() || 'AI Room Design';
            const description = formData.get('description')?.toString() || '';
            const libraryType = formData.get('library_type')?.toString() || 'both';
            const ownerCompany = formData.get('owner_company')?.toString() || '';
            
            // Get both files
            const originalFile = formData.get('original_file');
            const generatedFile = formData.get('generated_file');
            
            if (!originalFile || !generatedFile || 
                !(originalFile instanceof File) || 
                !(generatedFile instanceof File)) {
                return { type: 'error', message: 'Missing or invalid files' };
            }
            
            // Create the records for both images
            const pb = locals.pb;
            
            // Create record for original image
            const originalData = new FormData();
            originalData.append('title', `${title} - Original`);
            originalData.append('description', `Original image for ${description}`);
            originalData.append('type', 'image');
            originalData.append('file', originalFile);
            originalData.append('library_type', libraryType);
            originalData.append('active', 'true');
            originalData.append('owner_company', ownerCompany);
            
            const originalRecord = await pb.collection('content_library').create(originalData);
            
            // Create record for generated image
            const generatedData = new FormData();
            generatedData.append('title', `${title} - AI Generated`);
            generatedData.append('description', description);
            generatedData.append('type', 'image');
            generatedData.append('file', generatedFile);
            generatedData.append('library_type', libraryType);
            generatedData.append('active', 'true');
            generatedData.append('owner_company', ownerCompany);
            
            const generatedRecord = await pb.collection('content_library').create(generatedData);
            
            return {
                type: 'success',
                originalId: originalRecord.id,
                generatedId: generatedRecord.id
            };
        } catch (error) {
            console.error('Error uploading AI room design:', error);
            return { 
                type: 'error', 
                message: error.message || 'Error uploading content' 
            };
        }
    }
};

// Helper function to determine content type based on file extension
function getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    switch (ext) {
        case 'pdf':
            return 'application/pdf';
        case 'doc':
        case 'docx':
            return 'application/msword';
        case 'xls':
        case 'xlsx':
            return 'application/vnd.ms-excel';
        case 'mp4':
            return 'video/mp4';
        case 'webm':
            return 'video/webm';
        case 'mov':
            return 'video/quicktime';
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        default:
            return 'application/octet-stream';
    }
}
