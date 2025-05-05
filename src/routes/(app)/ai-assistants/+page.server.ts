import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import PocketBase from 'pocketbase';

// Initialize PocketBase
const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090');

export const load: PageServerLoad = async ({ locals }) => {
    try {
        // Fetch AI assistants from PocketBase
        const aiAssistants = await pb.collection('ai_assistants').getFullList({
            sort: '-created'
        });

        // Fetch rooms for the dropdown in the create form (keeping the variable name for compatibility)
        const viewrooms = await pb.collection('rooms').getFullList({
            sort: 'title',
            fields: 'id,title' // Only fetch necessary fields
        });

        return {
            aiAssistants,
            viewrooms: viewrooms // Keep the variable name for backward compatibility
        };
    } catch (err) {
        console.error('Error loading AI assistants:', err);
        return {
            aiAssistants: [],
            viewrooms: []
        };
    }
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        try {
            const formData = await request.formData();
            const name = formData.get('name');
            
            if (!name || typeof name !== 'string' || name.trim() === '') {
                return fail(400, {
                    success: false,
                    message: 'Assistant name is required'
                });
            }
            
            // Get viewroom connections - could be a single string or array of IDs
            const viewroomConnections = formData.getAll('viewrooom_connections');
            console.log('ViewRoom connections received:', viewroomConnections);
            
            // Ensure we have a valid array (not empty strings, etc)
            const validConnections = viewroomConnections.filter(id => id && typeof id === 'string' && id.trim() !== '');
            console.log('Valid connections:', validConnections);
            
            // Prepare data for PocketBase
            const data = {
                name: name.trim(),
                viewrooom_connections: validConnections.length > 0 ? validConnections : [], // Empty array if none
                engagements: JSON.stringify([]), // Initialize as empty array
                status: true // Active by default
            };
            
            console.log('Creating AI assistant with data:', data);
            
            // Handle file uploads if present
            const files = formData.getAll('training_files');
            if (files && files.length > 0 && files[0] instanceof File) {
                // Convert form data for file upload
                const fileFormData = new FormData();
                fileFormData.append('name', data.name);
                
                // For viewrooom_connections, add each ID as a separate entry with the same name
                // This is how PocketBase expects arrays in multipart/form-data
                data.viewrooom_connections.forEach(id => {
                    fileFormData.append('viewrooom_connections', id);
                });
                
                fileFormData.append('engagements', data.engagements);
                fileFormData.append('status', data.status.toString());
                
                // Add each file to form data
                files.forEach((file, index) => {
                    if (file instanceof File) {
                        fileFormData.append('training_files', file);
                    }
                });
                
                // Create record with files
                await pb.collection('ai_assistants').create(fileFormData);
            } else {
                // Create record without files
                await pb.collection('ai_assistants').create(data);
            }
            
            return {
                success: true,
                message: 'AI assistant created successfully'
            };
        } catch (err) {
            console.error('Error creating AI assistant:', err);
            return fail(400, {
                success: false,
                message: err.message || 'Failed to create AI assistant'
            });
        }
    },

    update: async ({ request, locals }) => {
        try {
            const formData = await request.formData();
            const id = formData.get('id');
            
            if (!id) {
                return fail(400, {
                    success: false,
                    message: 'ID is required for updates'
                });
            }
            
            // Prepare update data
            const viewroomConnections = formData.getAll('viewrooom_connections');
            console.log('Update - ViewRoom connections received:', viewroomConnections);
            
            // Ensure we have a valid array
            const validConnections = viewroomConnections.filter(id => id && typeof id === 'string' && id.trim() !== '');
            
            const data = {
                name: formData.get('name'),
                viewrooom_connections: validConnections.length > 0 ? validConnections : [],
                status: formData.get('status') === 'true' // Convert to boolean
            };
            
            console.log('Updating AI assistant with data:', data);
            
            // Determine if we need to handle file uploads
            const files = formData.getAll('training_files');
            if (files && files.length > 0 && files[0] instanceof File) {
                // Convert form data for file upload
                const fileFormData = new FormData();
                
                // Add basic fields
                if (data.name) fileFormData.append('name', data.name);
                
                // For viewrooom_connections, add each ID as a separate entry
                if (data.viewrooom_connections.length) {
                    data.viewrooom_connections.forEach(id => {
                        fileFormData.append('viewrooom_connections', id);
                    });
                }
                
                if (data.status !== undefined) 
                    fileFormData.append('status', data.status.toString());
                
                // Add each file to form data
                files.forEach((file, index) => {
                    if (file instanceof File) {
                        fileFormData.append('training_files', file);
                    }
                });
                
                // Update with files
                await pb.collection('ai_assistants').update(id.toString(), fileFormData);
            } else {
                // Update without files
                await pb.collection('ai_assistants').update(id.toString(), data);
            }
            
            return {
                success: true,
                message: 'AI assistant updated successfully'
            };
        } catch (err) {
            console.error('Error updating AI assistant:', err);
            return fail(400, {
                success: false,
                message: err.message || 'Failed to update AI assistant'
            });
        }
    },

    archive: async ({ request, locals }) => {
        try {
            const formData = await request.formData();
            const id = formData.get('id');
            
            if (!id) {
                return fail(400, {
                    success: false,
                    message: 'ID is required for archiving'
                });
            }
            
            // Archive by setting status to false
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
    
    restore: async ({ request, locals }) => {
        try {
            const formData = await request.formData();
            const id = formData.get('id');
            
            if (!id) {
                return fail(400, {
                    success: false,
                    message: 'ID is required for restoring'
                });
            }
            
            // Restore by setting status to true
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
    },
    
    delete: async ({ request, locals }) => {
        try {
            const formData = await request.formData();
            const id = formData.get('id');
            
            if (!id) {
                return fail(400, {
                    success: false,
                    message: 'ID is required for deletion'
                });
            }
            
            // Delete the record
            await pb.collection('ai_assistants').delete(id.toString());
            
            return {
                success: true,
                message: 'AI assistant deleted successfully'
            };
        } catch (err) {
            console.error('Error deleting AI assistant:', err);
            return fail(400, {
                success: false,
                message: err.message || 'Failed to delete AI assistant'
            });
        }
    }
};