import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
    if (!locals.pb.authStore.isValid) {
        throw error(401, 'Unauthorized');
    }

    const user = locals.pb.authStore.model;

    try {
        // Get the content
        const content = await locals.pb.collection('content_library').getOne(params.id);
        
        // Get representatives
        const representatives = await locals.pb.collection('representatives').getFullList({
            filter: `company = "${user.id}"`,
            sort: '-created'
        });

        return {
            user,
            content,
            representatives
        };
    } catch (err) {
        console.error('Error fetching content:', err);
        throw error(404, 'Content not found');
    }
};

export const actions: Actions = {
    updateContent: async ({ request, locals, params }) => {
        if (!locals.pb.authStore.isValid) {
            throw error(401, 'Unauthorized');
        }

        const user = locals.pb.authStore.model;
        const formData = await request.formData();

        try {
            const type = formData.get('type') as string;
            const title = formData.get('title') as string;
            const description = formData.get('description') as string;
            const libraryType = formData.get('library_type') as string;
            const representatives = formData.get('representatives') as string;
            const repIds = representatives ? representatives.split(',') : [];

            // Base content data
            const contentData: Record<string, any> = {
                title,
                description,
                type,
                owner_company: user.id,
                library_type: libraryType === 'both' ? ['host', 'representative'] : [libraryType]
            };

            // Only include file if a new one was uploaded
            const file = formData.get('file') as File;
            if (file?.size > 0) {
                contentData.file = file;
            }

            // Only include thumbnail if a new one was uploaded
            const thumbnail = formData.get('thumbnail') as File;
            if (thumbnail?.size > 0) {
                contentData.thumbnail = thumbnail;
            }

            // Update the content
            await locals.pb.collection('content_library').update(params.id, contentData);

            // Update representative connections if needed
            if (libraryType === 'representative' || libraryType === 'both') {
                // Get all representatives
                const allReps = await locals.pb.collection('representatives').getFullList({
                    filter: `company = "${user.id}"`
                });

                // Update each representative's connected content
                for (const rep of allReps) {
                    const currentContent = Array.isArray(rep.connected_content) ? rep.connected_content : [];
                    let newContent: string[];

                    if (repIds.includes(rep.id)) {
                        // Add content if not already present
                        newContent = currentContent.includes(params.id) 
                            ? currentContent 
                            : [...currentContent, params.id];
                    } else {
                        // Remove content if present
                        newContent = currentContent.filter(id => id !== params.id);
                    }

                    if (newContent.length !== currentContent.length) {
                        await locals.pb.collection('representatives').update(rep.id, {
                            connected_content: newContent
                        });
                    }
                }
            }

            return {
                type: 'success'
            };
        } catch (err) {
            console.error('Error updating content:', err);
            return fail(400, {
                type: 'error',
                message: 'Failed to update content'
            });
        }
    },

    deleteContent: async ({ locals, params }) => {
        if (!locals.pb.authStore.isValid) {
            throw error(401, 'Unauthorized');
        }

        try {
            // Get the content first to check library type
            const content = await locals.pb.collection('content_library').getOne(params.id);

            // Delete the content
            await locals.pb.collection('content_library').delete(params.id);

            // If it was in representative libraries, update the representatives
            if (content.library_type.includes('representative')) {
                const representatives = await locals.pb.collection('representatives').getFullList({
                    filter: `company = "${locals.pb.authStore.model.id}"`
                });

                // Remove content from all representatives
                for (const rep of representatives) {
                    if (rep.connected_content?.includes(params.id)) {
                        const newContent = rep.connected_content.filter(id => id !== params.id);
                        await locals.pb.collection('representatives').update(rep.id, {
                            connected_content: newContent
                        });
                    }
                }
            }

            return {
                type: 'success'
            };
        } catch (err) {
            console.error('Error deleting content:', err);
            return fail(400, {
                type: 'error',
                message: 'Failed to delete content'
            });
        }
    }
}; 