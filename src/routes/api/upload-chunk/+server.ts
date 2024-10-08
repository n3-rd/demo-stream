import { writeFile, appendFile, rename, mkdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

import { join } from 'path';
async function ensureDir(dir: string) {
    if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
    }
}

// Add this new API route to handle chunk uploads
export async function POST({ request }) {
    const data = await request.formData();
    const chunk = data.get('chunk') as Blob;
    const index = parseInt(data.get('index') as string);
    const filename = data.get('filename') as string;
    const totalChunks = parseInt(data.get('totalChunks') as string);

    const tempDir = 'static/video/temp';
    await ensureDir(tempDir);

    const tempPath = join(tempDir, filename);

    try {
        const buffer = Buffer.from(await chunk.arrayBuffer());

        if (index === 0) {
            await writeFile(tempPath, buffer);
        } else {
            await appendFile(tempPath, buffer);
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error handling chunk upload:', error);
        return new Response(JSON.stringify({ error: 'Failed to handle chunk upload' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}