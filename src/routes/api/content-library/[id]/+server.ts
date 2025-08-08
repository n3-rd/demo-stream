import { json, type RequestHandler } from '@sveltejs/kit';
import { query } from '$lib/db';

function isUuid(val: unknown): val is string {
  return typeof val === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(val);
}

export const PUT: RequestHandler = async ({ request, locals, params }) => {
  if (!locals.pb?.authStore.isValid) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
  }
  const formData = await request.formData();
  const contentId = params.id as string;
  try {
    const active = formData.get('active');
    const title = formData.get('title');
    const description = formData.get('description');
    let updateData: any = {};
    if (active !== null) {
      updateData.active = active === 'true';
    } else if (title !== null || description !== null) {
      updateData = { title: title as string, description: description as string, active: formData.get('active') === 'true' };
    } else {
      return new Response(JSON.stringify({ success: false, message: 'No valid update data provided' }), { status: 400 });
    }
    await locals.pb.collection('content_library').update(contentId, updateData);
    return new Response(JSON.stringify({ success: true, message: 'Content updated successfully' }), { status: 200 });
  } catch (error) {
    console.error('Error updating content:', error);
    return new Response(JSON.stringify({ success: false, message: 'Failed to update content' }), { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.pb?.authStore.isValid) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
  }
  const contentId = params.id as string;
  try {
    // fetch content row to get blob ids (these may be UUIDs or legacy filenames)
    const { rows } = await query<{ file: string | null; thumbnail: string | null }>(
      `SELECT file, thumbnail FROM content_library WHERE id = $1 LIMIT 1`,
      [contentId]
    );
    const row = rows[0];

    // delete content row first so UI reflects removal even if blob cleanup fails
    await query(`DELETE FROM content_library WHERE id = $1`, [contentId]);

    // best-effort blob cleanup
    try {
      if (row?.file && isUuid(row.file)) {
        await query(`DELETE FROM file_blobs WHERE id = $1`, [row.file]);
      }
    } catch (e) {
      console.warn('blob delete (file) failed', e);
    }
    try {
      if (row?.thumbnail && isUuid(row.thumbnail)) {
        await query(`DELETE FROM file_blobs WHERE id = $1`, [row.thumbnail]);
      }
    } catch (e) {
      console.warn('blob delete (thumbnail) failed', e);
    }

    return new Response(JSON.stringify({ success: true, message: 'Content deleted successfully' }), { status: 200 });
  } catch (error) {
    console.error('Error deleting content:', error);
    return new Response(JSON.stringify({ success: false, message: 'Failed to delete content' }), { status: 500 });
  }
}; 