import type { RequestHandler } from '@sveltejs/kit';
import { query } from '$lib/db';

// Optimized chunk sizes for video streaming
const VIDEO_CHUNK_SIZE = 512 * 1024; // 512KB for initial chunks
const MAX_VIDEO_CHUNK = 2 * 1024 * 1024; // 2MB max

function parseVideoRange(rangeHeader: string | null, totalSize: number) {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
    // For video, always start with a reasonable chunk
    return { start: 0, end: Math.min(VIDEO_CHUNK_SIZE - 1, totalSize - 1) };
  }
  
  const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
  let start = parseInt(startStr, 10);
  let end = endStr ? parseInt(endStr, 10) : totalSize - 1;
  
  if (Number.isNaN(start)) start = 0;
  if (Number.isNaN(end) || end >= totalSize) end = totalSize - 1;
  if (start > end || start < 0) return null;
  
  // Optimize chunk size for smooth streaming
  const requestedSize = end - start + 1;
  if (requestedSize > MAX_VIDEO_CHUNK) {
    end = start + MAX_VIDEO_CHUNK - 1;
  }
  
  return { start, end };
}

export const GET: RequestHandler = async ({ params, request }) => {
  const { collection, id, fileId } = params as { collection: string; id: string; fileId: string };

  try {
    // Get video metadata
    const meta = await query<{ size: number; content_type: string }>(
      `SELECT OCTET_LENGTH(data) AS size, content_type FROM file_blobs WHERE id = $1 LIMIT 1`,
      [fileId]
    );

    if (!meta.rows[0]) {
      return new Response('Video not found', { status: 404 });
    }

    const { size: totalSize, content_type: contentType } = meta.rows[0];

    // Verify it's a video file
    if (!contentType.startsWith('video/') && 
        !contentType.includes('mp4') && 
        !contentType.includes('webm') && 
        !contentType.includes('mov')) {
      return new Response('Not a video file', { status: 400 });
    }

    // Parse range request
    const range = parseVideoRange(request.headers.get('range'), totalSize);
    if (!range) {
      return new Response('Invalid range', { status: 416 });
    }

    const { start, end } = range;
    const length = end - start + 1;

    // Stream the video chunk
    const chunkRes = await query<{ chunk: Buffer }>(
      `SELECT SUBSTRING(data FROM $1::int + 1 FOR $2::int) AS chunk FROM file_blobs WHERE id = $3 LIMIT 1`,
      [start, length, fileId]
    );

    const chunk = chunkRes.rows[0]?.chunk || Buffer.alloc(0);

    // Optimized headers for video streaming
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Length', String(chunk.length));
    headers.set('Cache-Control', 'public, max-age=3600, must-revalidate');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Enable CORS for video streaming
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range');

    return new Response(chunk, { 
      status: range.start === 0 && range.end === totalSize - 1 ? 200 : 206, 
      headers 
    });

  } catch (err) {
    console.error('Video streaming error:', err);
    return new Response('Streaming error', { status: 500 });
  }
};

// Handle preflight requests
export const OPTIONS: RequestHandler = async () => {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Range');
  headers.set('Access-Control-Max-Age', '86400');
  
  return new Response(null, { status: 200, headers });
};

