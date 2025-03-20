import { readFile } from 'node:fs/promises';
import { join } from 'path';
import { existsSync } from 'node:fs';
import type { RequestEvent } from '@sveltejs/kit';

// This endpoint reads a chunked file from the temporary directory
export async function POST({ request }: RequestEvent) {
    try {
        const data = await request.formData();
        const filename = data.get('filename') as string;
        
        console.log(`Combine-chunks received request for filename: ${filename}`);
        
        if (!filename) {
            console.error('No filename provided in request');
            return new Response(JSON.stringify({ error: 'Filename is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const tempPath = join('/tmp/upload', filename);
        
        console.log(`Looking for file at path: ${tempPath}`);
        
        if (!existsSync(tempPath)) {
            console.error(`File not found at path: ${tempPath}`);
            // Try to list the contents of the directory for debugging
            try {
                const { readdir } = await import('node:fs/promises');
                const files = await readdir('/tmp/upload', { withFileTypes: true });
                const fileList = files.map(f => `${f.name} (${f.isDirectory() ? 'dir' : 'file'})`);
                console.log(`Contents of /tmp/upload: ${fileList.join(', ')}`);
            } catch (dirError) {
                console.error(`Error listing directory: ${dirError.message}`);
            }
            
            return new Response(JSON.stringify({ error: 'File not found', path: tempPath }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        try {
            console.log(`Reading file from ${tempPath}`);
            // Read the file from the temp directory
            const buffer = await readFile(tempPath);
            console.log(`Successfully read file, size: ${buffer.length} bytes`);
            
            // Get the original filename from the temp filename (remove timestamp prefix)
            const originalFilename = filename.split('-').slice(1).join('-');
            console.log(`Original filename: ${originalFilename}`);
            
            // Create a file object to return
            const file = new File([buffer], originalFilename, {
                type: getContentType(originalFilename)
            });
            
            console.log(`Created File object with type: ${file.type}`);
            
            // Create a multipart form response with the file
            const formData = new FormData();
            formData.append('file', file);
            
            console.log('Returning FormData response with file');
            return new Response(formData);
        } catch (error) {
            console.error(`Error reading file: ${error.message}`);
            console.error(`Error details: ${JSON.stringify(error)}`);
            return new Response(JSON.stringify({ 
                error: 'Failed to read chunked file',
                message: error.message,
                stack: error.stack
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error(`Unhandled error in combine-chunks: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
        return new Response(JSON.stringify({
            error: 'Unhandled error in combine-chunks',
            message: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Helper function to determine content type based on file extension
function getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    console.log(`Determining content type for extension: ${ext}`);
    
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