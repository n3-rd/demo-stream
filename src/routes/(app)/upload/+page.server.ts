import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

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
            const file = formData.get('file') as File;
            const representatives = formData.get('representatives') as string;
            const repIds = representatives ? representatives.split(',') : [];

            const data: Record<string, any> = {
                title,
                description,
                type,
                owner_company: user.id,
                shared_with: repIds,
                file
            };

            // If it's a video and has a thumbnail, add it
            if (type === 'video') {
                const thumbnail = formData.get('thumbnail') as File;
                if (thumbnail) {
                    data.thumbnail = thumbnail;
                }
            }

            await locals.pb.collection('content_library').create(data);

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
    }
};
