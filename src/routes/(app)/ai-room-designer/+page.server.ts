import { error, fail, json } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { join } from 'path';
import { PUBLIC_POCKETBASE_URL } from '$env/static/public';

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
        const data = await request.formData();
        // Or if using JSON
        const jsonData = await request.json();
        
        try {
            // Get user session/auth info
            const user = locals.pb.authStore.model;
            
            if (!user) {
                throw error(401, 'Unauthorized');
            }
            
            // Get the original and generated image data
            const originalImage = jsonData.originalImage;
            const generatedImage = jsonData.generatedImage;
            
            if (!originalImage || !generatedImage) {
                throw error(400, 'Missing image data');
            }
            
            // Save original image to content library
            const originalFormData = new FormData();
            originalFormData.append('title', `${jsonData.title || 'AI Room Design'} - Original`);
            originalFormData.append('file', await fetchAndCreateFile(originalImage, 'original.png'));
            originalFormData.append('user', user.id);
            originalFormData.append('type', 'image');
            
            // Save generated image to content library
            const generatedFormData = new FormData();
            generatedFormData.append('title', `${jsonData.title || 'AI Room Design'} - Generated`);
            generatedFormData.append('file', await fetchAndCreateFile(generatedImage, 'generated.png'));
            generatedFormData.append('user', user.id);
            generatedFormData.append('type', 'image');
            generatedFormData.append('prompt', jsonData.prompt || '');
            
            // Make API calls to save both images
            const originalResponse = await fetch(`${PUBLIC_POCKETBASE_URL}/api/collections/content_library/records`, {
                method: 'POST',
                body: originalFormData,
                headers: {
                    'Authorization': `Bearer ${locals.pb.authStore.token}`
                }
            });
            
            const generatedResponse = await fetch(`${PUBLIC_POCKETBASE_URL}/api/collections/content_library/records`, {
                method: 'POST',
                body: generatedFormData,
                headers: {
                    'Authorization': `Bearer ${locals.pb.authStore.token}`
                }
            });
            
            if (!originalResponse.ok || !generatedResponse.ok) {
                throw error(500, 'Failed to save images to content library');
            }
            
            return json({
                success: true,
                message: 'Both images saved to content library',
                originalId: (await originalResponse.json()).id,
                generatedId: (await generatedResponse.json()).id
            });
        } catch (err) {
            console.error('Error saving to content library:', err);
            throw error(500, 'Server error saving to content library');
        }
    }
};

// Helper function to fetch image from URL and convert to File object
async function fetchAndCreateFile(url, filename) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
}