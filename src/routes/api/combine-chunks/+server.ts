import { readFile } from 'node:fs/promises';
import { join } from 'path';
import { existsSync } from 'node:fs';
import type { RequestEvent } from '@sveltejs/kit';

// This endpoint reads a chunked file from the temporary directory
export async function POST({ request }: RequestEvent) {
    const data = await request.formData();
    const filename = data.get('filename') as string;
    
    if (!filename) {
        return new Response(JSON.stringify({ error: 'Filename is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    const tempPath = join('/tmp/upload', filename);
    
    if (!existsSync(tempPath)) {
        return new Response(JSON.stringify({ error: 'File not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    try {
        // Read the file from the temp directory
        const buffer = await readFile(tempPath);
        
        // Get the original filename from the temp filename (remove timestamp prefix)
        const originalFilename = filename.split('-').slice(1).join('-');
        
        // Create a file object to return
        const file = new File([buffer], originalFilename, {
            type: getContentType(originalFilename)
        });
        
        // Create a multipart form response with the file
        const formData = new FormData();
        formData.append('file', file);
        
        return new Response(formData);
    } catch (error) {
        console.error('Error reading chunked file:', error);
        return new Response(JSON.stringify({ error: 'Failed to read chunked file' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Helper function to determine content type based on file extension
function getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    switch (ext) {
        case 'pdf':
            return 'application/pdf';
        case 'doc':
        case 'docx':
            return 'application/msword';
        case 'xls':
        case 'xlsx':
            return 'application/vnd.ms-excel';
        case 'mp4':
            return 'video/mp4';
        case 'webm':
            return 'video/webm';
        case 'mov':
            return 'video/quicktime';
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        default:
            return 'application/octet-stream';
    }
} 