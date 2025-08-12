import type { RequestHandler } from '@sveltejs/kit';
import { query } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
  const owner = url.searchParams.get('owner');
  if (!owner) {
    return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const { rows } = await query<any>(
      `SELECT id, title, description, type, file, thumbnail, owner_company, shared_with, library_type, active
       FROM content_library
       WHERE owner_company = $1`,
      [owner]
    );
    return new Response(JSON.stringify({ items: rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('content-library list error', e);
    return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}; 