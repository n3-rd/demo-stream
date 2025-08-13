import type { RequestHandler } from '@sveltejs/kit';
import { query } from '$lib/db';

const KNOWN_FIELDS = ['thumbnail', 'file', 'avatar'];

function parseRange(rangeHeader: string | null, totalSize: number) {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) return null;
  const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
  let start = parseInt(startStr, 10);
  let end = endStr ? parseInt(endStr, 10) : totalSize - 1;
  if (Number.isNaN(start)) return null;
  if (Number.isNaN(end) || end >= totalSize) end = totalSize - 1;
  if (start > end || start < 0) return null;
  return { start, end };
}

export const GET: RequestHandler = async ({ params, request, cookies }) => {
  const { collection, id, fileId } = params as { collection: string; id: string; fileId: string };

  // Basic authorization: allow if admin session OR viewroom session OR representative session exists
  const hasAdmin = !!cookies.get('session');
  const hasViewroom = !!cookies.get('viewroom_session');
  const hasRep = !!cookies.get('rep_session');
  if (!hasAdmin && !hasViewroom && !hasRep) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    // First get size and content type via direct blob id
    const meta = await query<{ size: number; content_type: string }>(
      `SELECT OCTET_LENGTH(data) AS size, content_type FROM file_blobs WHERE id = $1 LIMIT 1`,
      [fileId]
    );

    let blobId: string | null = null;
    let contentType = 'application/octet-stream';
    let totalSize = 0;

    if (meta.rows[0]) {
      blobId = fileId;
      contentType = meta.rows[0].content_type || contentType;
      totalSize = meta.rows[0].size || 0;
    } else {
      // Fallback: resolve blob id from record's known fields
      const rec = await query<any>(`SELECT * FROM ${collection} WHERE id = $1 LIMIT 1`, [id]);
      const row = rec.rows[0];
      if (!row) return new Response('Not found', { status: 404 });

      for (const field of KNOWN_FIELDS) {
        if (row[field]) {
          const m = await query<{ size: number; content_type: string }>(
            `SELECT OCTET_LENGTH(data) AS size, content_type FROM file_blobs WHERE id = $1 LIMIT 1`,
            [row[field]]
          );
          if (m.rows[0]) {
            blobId = row[field];
            contentType = m.rows[0].content_type || contentType;
            totalSize = m.rows[0].size || 0;
            break;
          }
        }
      }

      if (!blobId) return new Response('Not found', { status: 404 });
    }

    // Handle Range requests for streaming
    const range = parseRange(request.headers.get('range'), totalSize);
    if (range) {
      const { start, end } = range;
      const length = end - start + 1;
      // Postgres bytea SUBSTRING is 1-based
      const chunkRes = await query<{ chunk: Buffer }>(
        `SELECT SUBSTRING(data FROM $1::int + 1 FOR $2::int) AS chunk FROM file_blobs WHERE id = $3 LIMIT 1`,
        [start, length, blobId]
      );
      const chunk = chunkRes.rows[0]?.chunk || Buffer.alloc(0);
      const headers = new Headers();
      headers.set('Content-Type', contentType);
      headers.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Content-Length', String(chunk.length));
      return new Response(chunk, { status: 206, headers });
    }

    // No range: return full file (may be large)
    const full = await query<{ data: Buffer }>(
      `SELECT data FROM file_blobs WHERE id = $1 LIMIT 1`,
      [blobId]
    );
    const dataBuf = full.rows[0]?.data;
    if (!dataBuf) return new Response('Not found', { status: 404 });
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Length', String(dataBuf.length));
    return new Response(dataBuf, { status: 200, headers });
  } catch (err) {
    console.error('file serve error', err);
    return new Response('Internal error', { status: 500 });
  }
}; 