import { json, type RequestHandler } from '@sveltejs/kit';
import { BUNNY_STORAGE_ZONE_NAME, BUNNY_ACCESS_KEY, BUNNY_REGION } from '$env/static/private';
import { db } from '$lib/db/drizzle';
import { contentLibrary } from '$lib/db/schema';
import { getContentType, uploadToBunnyCDN } from '$lib/upload/bunny';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.pb?.authStore.isValid) {
        return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();

    try {
        const name = (formData.get('name') as string)?.trim();
        if (!name) {
            return json({ success: false, message: 'Name is required' }, { status: 400 });
        }

        const viewroomIdsRaw = formData.getAll('viewrooom_connections');
        const viewroomIds = [...new Set(
            viewroomIdsRaw.filter((v): v is string => typeof v === 'string' && v.length > 0)
        )];

        const trainingFileList = formData.getAll('training_files').filter((v): v is File => v instanceof File && v.size > 0);
        const userId = (locals as any).pb.authStore.model?.id;
        const trainingFileIds: string[] = [];

        if (trainingFileList.length > 0 && BUNNY_STORAGE_ZONE_NAME && BUNNY_ACCESS_KEY) {
            for (const file of trainingFileList) {
                const url = await uploadToBunnyCDN(file, BUNNY_STORAGE_ZONE_NAME, BUNNY_ACCESS_KEY, BUNNY_REGION);
                if (!url) continue;
                const [row] = await db.insert(contentLibrary).values({
                    title: file.name,
                    type: file.type || getContentType(file.name),
                    file: url,
                    ownerCompany: userId ?? null,
                    libraryType: ['ai_training']
                }).returning();
                if (row?.id) trainingFileIds.push(row.id);
            }
        }

        const data: Record<string, unknown> = {
            name,
            viewrooom_connections: viewroomIds,
            status: true,
            training_files: trainingFileIds
        };

        const assistant = await locals.pb.collection('ai_assistants').create(data);

        return json({ success: true, assistant });
    } catch (err) {
        console.error('Error creating AI assistant:', err);
        return json(
            { success: false, message: err instanceof Error ? err.message : 'Failed to create AI assistant' },
            { status: 500 }
        );
    }
};
