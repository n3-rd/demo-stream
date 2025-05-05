import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import PocketBase from 'pocketbase';

// Initialize PocketBase
const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090');

export const load: PageServerLoad = async ({ params }) => {
    try {
        const aiId = params.aiId;
        
        if (!aiId) {
            throw error(404, 'AI Assistant not found');
        }
        
        // Fetch AI assistant details
        const aiAssistant = await pb.collection('ai_assistants').getOne(aiId, {
            expand: 'viewrooom_connections'
        });
        
        // Fetch all viewrooms for the connection dropdown
        const viewrooms = await pb.collection('rooms').getFullList({
            sort: 'title',
            fields: 'id,title' // Only fetch necessary fields
        });
        
        // Create a map of viewroom IDs to names for displaying connections
        const viewroomMap = {};
        viewrooms.forEach(viewroom => {
            viewroomMap[viewroom.id] = viewroom.title;
        });
        
        return {
            aiAssistant,
            viewrooms,
            viewroomMap
        };
    } catch (err) {
        console.error('Error loading AI assistant details:', err);
        throw error(404, 'AI Assistant not found');
    }
};

export const actions: Actions = {
    uploadFiles: async ({ request }) => {
        try {
            const formData = await request.formData();
            const id = formData.get('id');
            
            if (!id) {
                return fail(400, {
                    success: false,
                    message: 'AI assistant ID is required'
                });
            }
            
            // Fetch the current AI assistant
            const aiAssistant = await pb.collection('ai_assistants').getOne(id.toString());
            
            // Create a new FormData for the update
            const updateFormData = new FormData();
            
            // Add the training files from the request
            const files = formData.getAll('training_files');
            if (files && files.length > 0) {
                files.forEach(file => {
                    if (file instanceof File) {
                        updateFormData.append('training_files', file);
                    }
                });
                
                // Update the AI assistant with the new files
                await pb.collection('ai_assistants').update(id.toString(), updateFormData);
                
                return {
                    success: true,
                    message: 'Files uploaded successfully'
                };
            } else {
                return fail(400, {
                    success: false,
                    message: 'No files provided'
                });
            }
        } catch (err) {
            console.error('Error uploading files:', err);
            return fail(400, {
                success: false,
                message: err.message || 'Failed to upload files'
            });
        }
    },
    
    removeFile: async ({ request }) => {
        try {
            const formData = await request.formData();
            const id = formData.get('id');
            const fileIndex = formData.get('fileIndex');
            
            if (!id || fileIndex === null || fileIndex === undefined) {
                return fail(400, {
                    success: false,
                    message: 'AI assistant ID and file index are required'
                });
            }
            
            // Fetch the current AI assistant
            const aiAssistant = await pb.collection('ai_assistants').getOne(id.toString());
            
            // Get the current training files
            let files = aiAssistant.training_files || [];
            
            // Create a copy of the files array without the file to remove
            const indexToRemove = parseInt(fileIndex.toString());
            if (indexToRemove >= 0 && indexToRemove < files.length) {
                // In PocketBase, to remove a specific file by its index, we use "-" prefix
                // before the index in the "training_files" field
                const updateData = {};
                updateData[`training_files-${indexToRemove}`] = null;
                
                // Update the AI assistant
                await pb.collection('ai_assistants').update(id.toString(), updateData);
                
                return {
                    success: true,
                    message: 'File removed successfully'
                };
            } else {
                return fail(400, {
                    success: false,
                    message: 'Invalid file index'
                });
            }
        } catch (err) {
            console.error('Error removing file:', err);
            return fail(400, {
                success: false,
                message: err.message || 'Failed to remove file'
            });
        }
    },
    
    updateViewrooms: async ({ request }) => {
        try {
            const formData = await request.formData();
            const id = formData.get('id');
            // Check both spellings for backward compatibility
            let viewroomConnections = formData.getAll('viewrooom_connections');
            
            if (!viewroomConnections || viewroomConnections.length === 0) {
                viewroomConnections = formData.getAll('viewroom_connections');
            }
            
            if (!id) {
                return fail(400, {
                    success: false,
                    message: 'AI assistant ID is required'
                });
            }
            
            // Log for debugging
            console.log('Updating viewroom connections:', viewroomConnections);
            
            // Construct update data
            const updateData = {
                viewrooom_connections: viewroomConnections
            };
            
            // Update the AI assistant with the new viewroom connections
            await pb.collection('ai_assistants').update(id.toString(), updateData);
            
            return {
                success: true,
                message: 'ViewRoom connections updated successfully'
            };
        } catch (err) {
            console.error('Error updating ViewRoom connections:', err);
            return fail(400, {
                success: false,
                message: err.message || 'Failed to update ViewRoom connections'
            });
        }
    },
    
    archive: async ({ request }) => {
        try {
            const formData = await request.formData();
            const id = formData.get('id');
            
            if (!id) {
                return fail(400, {
                    success: false,
                    message: 'AI assistant ID is required'
                });
            }
            
            // Archive the AI assistant by setting status to false
            await pb.collection('ai_assistants').update(id.toString(), {
                status: false
            });
            
            return {
                success: true,
                message: 'AI assistant archived successfully'
            };
        } catch (err) {
            console.error('Error archiving AI assistant:', err);
            return fail(400, {
                success: false,
                message: err.message || 'Failed to archive AI assistant'
            });
        }
    },
    
    restore: async ({ request }) => {
        try {
            const formData = await request.formData();
            const id = formData.get('id');
            
            if (!id) {
                return fail(400, {
                    success: false,
                    message: 'AI assistant ID is required'
                });
            }
            
            // Restore the AI assistant by setting status to true
            await pb.collection('ai_assistants').update(id.toString(), {
                status: true
            });
            
            return {
                success: true,
                message: 'AI assistant restored successfully'
            };
        } catch (err) {
            console.error('Error restoring AI assistant:', err);
            return fail(400, {
                success: false,
                message: err.message || 'Failed to restore AI assistant'
            });
        }
    }
}; 