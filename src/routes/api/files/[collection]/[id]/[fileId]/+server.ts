import type { RequestHandler } from '@sveltejs/kit';
import { query } from '$lib/db';

const KNOWN_FIELDS = ['thumbnail', 'file', 'avatar'];

export const GET: RequestHandler = async ({ params }) => {
  const { collection, id, fileId } = params as { collection: string; id: string; fileId: string };
  try {
    // Try direct by blob id first
    const direct = await query<{ data: Buffer; content_type: string }>(
      `SELECT data, content_type FROM file_blobs WHERE id = $1 LIMIT 1`,
      [fileId]
    );
    if (direct.rows[0]) {
      return new Response(direct.rows[0].data, {
        headers: { 'Content-Type': direct.rows[0].content_type }
      });
    }

    // Fallback: load record and try known fields
    const { rows } = await query<any>(`SELECT * FROM ${collection} WHERE id = $1 LIMIT 1`, [id]);
    const rec = rows[0];
    if (!rec) return new Response('Not found', { status: 404 });

    for (const field of KNOWN_FIELDS) {
      const blobId = rec[field];
      if (blobId) {
        const blob = await query<{ data: Buffer; content_type: string }>(
          `SELECT data, content_type FROM file_blobs WHERE id = $1 LIMIT 1`,
          [blobId]
        );
        if (blob.rows[0]) {
          return new Response(blob.rows[0].data, {
            headers: { 'Content-Type': blob.rows[0].content_type }
          });
        }
      }
    }

    return new Response('Not found', { status: 404 });
  } catch (err) {
    console.error('file serve error', err);
    return new Response('Internal error', { status: 500 });
  }
}; 