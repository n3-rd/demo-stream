import { json, type RequestHandler } from '@sveltejs/kit';
import { join } from 'path';
import { query } from '$lib/db';

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'doc':
    case 'docx': return 'application/msword';
    case 'xls':
    case 'xlsx': return 'application/vnd.ms-excel';
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'mov': return 'video/quicktime';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    default: return 'application/octet-stream';
  }
}

async function storeBlob(file: File | null): Promise<string | null> {
  if (!file) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { rows } = await query<{ id: string }>(
    `INSERT INTO file_blobs (filename, content_type, data) VALUES ($1, $2, $3) RETURNING id`,
    [file.name, file.type || getContentType(file.name), buffer]
  );
  return rows[0]?.id || null;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.pb?.authStore.isValid) {
    return json({ success: false, message: 'Unauthorized' }, { status: 401 });
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
    const thumbnail = formData.get('thumbnail') as File | null;
    const repIds = representatives ? representatives.split(',') : [];

    let file: File | null = null;
    if (fileRef) {
      try {
        const tempPath = join('/tmp/upload', fileRef);
        try {
          const { readFile: fsReadFile } = await import('node:fs/promises');
          const { existsSync: fsExistsSync } = await import('node:fs');
          if (fsExistsSync(tempPath)) {
            const buffer = await fsReadFile(tempPath);
            const originalFilename = fileRef.split('-').slice(1).join('-');
            const contentType = getContentType(originalFilename);
            file = new File([buffer], originalFilename, { type: contentType });
          }
        } catch {}
        if (!file) {
          const chunkFormData = new FormData();
          chunkFormData.append('filename', fileRef);
          const requestUrl = new URL(request.url);
          const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
          const fileResponse = await fetch(`${baseUrl}/api/combine-chunks`, { method: 'POST', body: chunkFormData });
          if (!fileResponse.ok) throw new Error('Failed to get file from chunks');
          const responseFormData = await fileResponse.formData();
          file = responseFormData.get('file') as File;
          if (!file) throw new Error('No file returned from combine-chunks endpoint');
        }
      } catch (error) {
        console.error('Error getting file from chunks:', error);
        throw error;
      }
    }

    const fileBlobId = await storeBlob(file);
    const thumbnailBlobId = await storeBlob(thumbnail);

    const contentData: Record<string, any> = {
      title,
      description,
      type,
      owner_company: user.id,
      active: formData.get('active') === 'true',
      file: fileBlobId,
      thumbnail: thumbnailBlobId
    };

    if (libraryType === 'host') {
      contentData.library_type = ['host'];
      await locals.pb.collection('content_library').create(contentData);
    } else if (libraryType === 'representative') {
      contentData.library_type = ['representative'];
      const record = await locals.pb.collection('content_library').create(contentData);
      for (const repId of repIds) {
        const rep = await locals.pb.collection('representatives').getOne(repId);
        const connectedContent = Array.isArray(rep.connected_content) ? [...rep.connected_content, record.id] : [record.id];
        await locals.pb.collection('representatives').update(repId, {
          name: rep.name,
          email: rep.email,
          phone: rep.phone,
          company: rep.company,
          is_active: rep.is_active,
          schedule: rep.schedule,
          connected_content: connectedContent
        });
      }
    } else if (libraryType === 'both') {
      contentData.library_type = ['host', 'representative'];
      const record = await locals.pb.collection('content_library').create(contentData);
      for (const repId of repIds) {
        const rep = await locals.pb.collection('representatives').getOne(repId);
        const connectedContent = Array.isArray(rep.connected_content) ? [...rep.connected_content, record.id] : [record.id];
        await locals.pb.collection('representatives').update(repId, {
          name: rep.name,
          email: rep.email,
          phone: rep.phone,
          company: rep.company,
          is_active: rep.is_active,
          schedule: rep.schedule,
          connected_content: connectedContent
        });
      }
    }

    return json({ success: true, type: 'success' });
  } catch (err) {
    console.error('Error uploading content:', err);
    return json({ success: false, type: 'error', message: 'Failed to upload content' }, { status: 400 });
  }
}; 