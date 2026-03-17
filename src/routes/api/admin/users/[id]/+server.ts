import { json } from '@sveltejs/kit';
import { dbPool } from '$lib/db';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const companyId = params.id;

  if (!companyId) {
    return json({ success: false, message: 'Company ID is required' }, { status: 400 });
  }

  // Check if user is authenticated and is a superuser
  if (!locals.user?.id || !locals.pb.authStore.model?.superuser) {
    return json({ success: false, message: 'Superuser authentication required' }, { status: 403 });
  }

  const client = await dbPool.connect();

  try {
    await client.query('BEGIN');

    // 1. Delete representative device tokens (joined through representatives)
    await client.query(`
      DELETE FROM rep_device_tokens 
      WHERE rep_id IN (SELECT id FROM representatives WHERE company = $1)
    `, [companyId]);

    // 2. Delete rooms (depend on representatives and company)
    await client.query('DELETE FROM rooms WHERE owner_company = $1', [companyId]);

    // 3. Delete representatives (depend on company and locations)
    await client.query('DELETE FROM representatives WHERE company = $1', [companyId]);

    // 4. Delete content library items
    await client.query('DELETE FROM content_library WHERE owner_company = $1', [companyId]);

    // 5. Delete locations
    await client.query('DELETE FROM locations WHERE owner_company = $1', [companyId]);

    // 6. Delete quotes
    await client.query('DELETE FROM quotes WHERE to_company = $1', [companyId]);

    // 7. Delete room videos duplicate
    await client.query('DELETE FROM room_videos_duplicate WHERE owner_company = $1', [companyId]);

    // 8. Delete uploaded videos
    await client.query('DELETE FROM uploaded_videos WHERE user_id = $1', [companyId]);

    // 9. Delete videos
    await client.query('DELETE FROM videos WHERE user_id = $1', [companyId]);

    // 10. Delete viewroom users
    await client.query('DELETE FROM viewroom_users WHERE company = $1', [companyId]);

    // 11. Finally, delete the company itself
    const result = await client.query('DELETE FROM users WHERE id = $1', [companyId]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return json({ success: false, message: 'Company not found' }, { status: 404 });
    }

    await client.query('COMMIT');

    return json({
      success: true,
      message: 'Company and all associated data deleted successfully'
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Failed to delete company:', error);
    return json({
      success: false,
      message: error.message || 'Failed to delete company'
    }, { status: 500 });
  } finally {
    client.release();
  }
};
