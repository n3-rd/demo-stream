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
    saveToLibrary: async ({ request, locals }) => {
        if (!locals.pb.authStore.isValid) {
            throw error(401, 'Unauthorized');
        }

        const user = locals.pb.authStore.model;
        const formData = await request.formData();

        try {
            const imageUrl = formData.get('imageUrl') as string;
            const libraryType = formData.get('libraryType') as string;
            const title = formData.get('title') as string;
            const description = formData.get('description') as string;
            
            if (!imageUrl) {
                return fail(400, { success: false, message: 'No image URL provided' });
            }
            
            // Fetch the image from the Replicate URL
            const response = await fetch(imageUrl);
            if (!response.ok) {
                return fail(400, { success: false, message: 'Failed to fetch image from URL' });
            }
            
            const imageBlob = await response.arrayBuffer();
            const fileName = `room-design-${Date.now()}.png`;
            
            // Prepare content data
            const contentData: Record<string, any> = {
                title,
                description,
                type: 'image',
                owner_company: user.id,
                active: true
            };
            
            // Create a file from the blob
            const fileBuffer = Buffer.from(imageBlob);
            
            // Create the content based on library type
            if (libraryType === 'host' || libraryType === 'both') {
                contentData.library_type = libraryType === 'both' ? ['host', 'representative'] : 'host';
                contentData.file = new File([fileBuffer], fileName, { type: 'image/png' });
                contentData.thumbnail = new File([fileBuffer], fileName, { type: 'image/png' });
                
                const record = await locals.pb.collection('content_library').create(contentData);
                
                // If 'both' type, update representatives
                if (libraryType === 'both') {
                    const repIds = formData.get('representatives') as string;
                    if (repIds) {
                        const repIdArray = repIds.split(',');
                        for (const repId of repIdArray) {
                            // Get current representative data
                            const rep = await locals.pb.collection('representatives').getOne(repId);
                            
                            // Create a new array with existing content plus the new one
                            const connectedContent = Array.isArray(rep.connected_content) 
                                ? [...rep.connected_content, record.id]
                                : [record.id];
                            
                            // Update the representative
                            await locals.pb.collection('representatives').update(repId, {
                                "connected_content": connectedContent
                            });
                        }
                    }
                }
            } else if (libraryType === 'representative') {
                // Representative only
                contentData.library_type = 'representative';
                contentData.file = new File([fileBuffer], fileName, { type: 'image/png' });
                contentData.thumbnail = new File([fileBuffer], fileName, { type: 'image/png' });
                
                const record = await locals.pb.collection('content_library').create(contentData);
                
                // Update representatives
                const repIds = formData.get('representatives') as string;
                if (repIds) {
                    const repIdArray = repIds.split(',');
                    for (const repId of repIdArray) {
                        // Get current representative data
                        const rep = await locals.pb.collection('representatives').getOne(repId);
                        
                        // Create a new array with existing content plus the new one
                        const connectedContent = Array.isArray(rep.connected_content) 
                            ? [...rep.connected_content, record.id]
                            : [record.id];
                        
                        // Update the representative
                        await locals.pb.collection('representatives').update(repId, {
                            "connected_content": connectedContent
                        });
                    }
                }
            }

            // Return a simple success response
            return {
                type: 'success'
            };
        } catch (err) {
            console.error('Error saving to library:', err);
            return fail(400, { 
                type: 'error',
                message: 'Failed to save to library' 
            });
        }
    }
};