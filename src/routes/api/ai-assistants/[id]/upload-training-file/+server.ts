import { json, type RequestHandler } from '@sveltejs/kit';
import { BUNNY_STORAGE_ZONE_NAME, BUNNY_ACCESS_KEY, BUNNY_REGION } from '$env/static/private';
import { db } from '$lib/db/drizzle';
import { aiAssistants, contentLibrary } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { getContentType, uploadToBunnyCDN } from '$lib/upload/bunny';

export const POST: RequestHandler = async ({ request, params, locals }) => {
  if (!(locals as any).pb?.authStore.isValid) {
    return json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const user = (locals as any).pb.authStore.model;
  const assistantId = params.id;
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return json({ success: false, message: 'No file provided' }, { status: 400 });
  }

  try {
    const fileBunnyCdnUrl = await uploadToBunnyCDN(file, BUNNY_STORAGE_ZONE_NAME, BUNNY_ACCESS_KEY, BUNNY_REGION);

    if (!fileBunnyCdnUrl) {
      throw new Error('File upload to BunnyCDN failed');
    }

    const [newContent] = await db.insert(contentLibrary).values({
      title: file.name,
      type: file.type || getContentType(file.name),
      file: fileBunnyCdnUrl,
      ownerCompany: user.id,
      libraryType: ['ai_training']
    }).returning();

    const assistant = await db.query.aiAssistants.findFirst({
      where: eq(aiAssistants.id, assistantId)
    });

    if (!assistant) {
      return json({ success: false, message: 'Assistant not found' }, { status: 404 });
    }

    const updatedTrainingFiles = [...(assistant.trainingFiles || []), newContent.id];

    await db.update(aiAssistants).set({ trainingFiles: updatedTrainingFiles }).where(eq(aiAssistants.id, assistantId));

    return json({ success: true, file: newContent });

  } catch (err) {
    console.error('Error uploading training file:', err);
    return json({ success: false, message: 'Failed to upload training file' }, { status: 500 });
  }
};