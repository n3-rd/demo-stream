import { initializeMultipartUpload, uploadPart, uploadSingleObject } from '../../../lib/cloudflareR2';


export async function POST({ request }) {
    const data = await request.formData();
    const chunk = data.get('chunk') as Blob;
    const index = parseInt(data.get('index') as string);
    const filename = data.get('filename') as string;
    const totalChunks = parseInt(data.get('totalChunks') as string);
    const uploadId = data.get('uploadId') as string;

    try {
        const buffer = Buffer.from(await chunk.arrayBuffer());

        if (totalChunks === 1) {
            // Single part upload
            await uploadSingleObject(filename, buffer);
            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            // Multipart upload
            if (index === 0) {
                // Initialize multipart upload
                const newUploadId = await initializeMultipartUpload(filename);
                const part = await uploadPart(filename, newUploadId, index + 1, buffer);
                return new Response(JSON.stringify({ success: true, uploadId: newUploadId, part }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                // Upload part
                const part = await uploadPart(filename, uploadId, index + 1, buffer);
                return new Response(JSON.stringify({ success: true, part }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
    } catch (error) {
        console.error('Error handling chunk upload:', error);
        return new Response(JSON.stringify({ error: 'Failed to handle chunk upload' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}