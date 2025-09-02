import { json, type RequestHandler } from '@sveltejs/kit';
import { join } from 'path';
import https from 'https';
import { BUNNY_STORAGE_ZONE_NAME, BUNNY_ACCESS_KEY, BUNNY_REGION } from '$env/static/private';

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

async function uploadToBunnyCDN(file: File, storageZoneName: string, accessKey: string, region = ''): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const hostname = 'ny.storage.bunnycdn.com';
    
    console.log('Upload details:', {
      storageZoneName,
      filename: file.name,
      fileType: file.type || getContentType(file.name),
      fileSize: file.size
    });

    const options = {
      method: 'PUT',
      hostname: hostname,
      path: `/${storageZoneName}/${encodeURIComponent(file.name)}`,
      headers: {
        'AccessKey': accessKey,
        'Content-Type': file.type || getContentType(file.name),
        'Content-Length': file.size
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('Bunny CDN response:', {
          statusCode: res.statusCode,
          responseData: data
        });

        if (res.statusCode === 201) {
          // Construct the Bunny CDN URL
          const fileUrl = `https://viewroom.b-cdn.net/${encodeURIComponent(file.name)}`;
          resolve(fileUrl);
        } else {
          reject(new Error(`Upload failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Bunny CDN upload error:', error);
      reject(error);
    });

    // Convert File to ArrayBuffer and then to Buffer
    file.arrayBuffer().then(buffer => {
      req.write(Buffer.from(buffer));
      req.end();
    }).catch(reject);
  });
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

    // Upload file to Bunny CDN
    let fileBunnyCdnUrl: string | null = null;
    if (file && BUNNY_STORAGE_ZONE_NAME && BUNNY_ACCESS_KEY) {
      try {
        fileBunnyCdnUrl = await uploadToBunnyCDN(file, BUNNY_STORAGE_ZONE_NAME, BUNNY_ACCESS_KEY, BUNNY_REGION);
      } catch (error) {
        console.error('Bunny CDN upload failed:', error);
        throw error;
      }
    }

    // Upload thumbnail to Bunny CDN (optional)
    let thumbnailBunnyCdnUrl: string | null = null;
    if (thumbnail && BUNNY_STORAGE_ZONE_NAME && BUNNY_ACCESS_KEY) {
      try {
        thumbnailBunnyCdnUrl = await uploadToBunnyCDN(thumbnail, BUNNY_STORAGE_ZONE_NAME, BUNNY_ACCESS_KEY, BUNNY_REGION);
      } catch (error) {
        console.error('Bunny CDN thumbnail upload failed:', error);
        // Don't throw error if thumbnail upload fails
      }
    }

    const contentData: Record<string, any> = {
      title,
      description,
      type,
      owner_company: user.id,
      active: formData.get('active') === 'true',
      file: fileBunnyCdnUrl, // Store Bunny CDN URL instead of blob ID
      thumbnail: thumbnailBunnyCdnUrl // Store thumbnail Bunny CDN URL
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

    return json({ success: true, type: 'success', fileUrl: fileBunnyCdnUrl, thumbnailUrl: thumbnailBunnyCdnUrl });
  } catch (err) {
    console.error('Error uploading content:', err);
    return json({ success: false, type: 'error', message: 'Failed to upload content' }, { status: 400 });
  }
}; 