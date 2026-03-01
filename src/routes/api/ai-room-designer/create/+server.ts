import { json, type RequestHandler } from '@sveltejs/kit';
import { query } from '$lib/db';
import { db } from '$lib/db/drizzle';
import { contentLibrary } from '$lib/db/schema';

function getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        case 'webp':
            return 'image/webp';
        default:
            return 'image/png';
    }
}

async function storeBlob(file: File): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { rows } = await query<{ id: string }>(
        `INSERT INTO file_blobs (filename, content_type, data) VALUES ($1, $2, $3) RETURNING id`,
        [file.name, file.type || getContentType(file.name), buffer]
    );
    const id = rows[0]?.id;
    if (!id) throw new Error('Failed to store file blob');
    return id;
}

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.pb?.authStore.isValid) {
        return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const user = locals.pb.authStore.model as { id: string };
    if (!user?.id) {
        return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    try {
        const title = formData.get('title')?.toString() || 'AI Room Design';
        const description = formData.get('description')?.toString() || '';
        const originalFile = formData.get('original_file') as File | null;
        const generatedFile = formData.get('generated_file') as File | null;

        if (!originalFile?.size || !generatedFile?.size) {
            return json(
                { success: false, message: 'Both original and generated files are required' },
                { status: 400 }
            );
        }

        const originalBlobId = await storeBlob(originalFile);
        const generatedBlobId = await storeBlob(generatedFile);

        const [originalRecord] = await db
            .insert(contentLibrary)
            .values({
                title: `${title} - Original`,
                description: description || null,
                type: 'image',
                file: originalBlobId,
                ownerCompany: user.id,
                active: true
            })
            .returning();

        const [generatedRecord] = await db
            .insert(contentLibrary)
            .values({
                title: `${title} - Generated`,
                description: description || null,
                type: 'image',
                file: generatedBlobId,
                ownerCompany: user.id,
                active: true
            })
            .returning();

        return json({
            success: true,
            message: 'AI room design uploaded successfully',
            originalId: originalRecord?.id,
            generatedId: generatedRecord?.id
        });
    } catch (err) {
        console.error('Error uploading AI room design:', err);
        return json(
            {
                success: false,
                message: err instanceof Error ? err.message : 'Error uploading content'
            },
            { status: 500 }
        );
    }
};
