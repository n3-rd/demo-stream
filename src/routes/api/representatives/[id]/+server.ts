import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db/drizzle';
import { representatives } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return json({ error: 'Representative ID is required' }, { status: 400 });
    }

    const representative = await db
      .select()
      .from(representatives)
      .where(eq(representatives.id, id))
      .limit(1);

    if (representative.length === 0) {
      return json({ error: 'Representative not found' }, { status: 404 });
    }

    return json({
      success: true,
      representative: representative[0]
    });

  } catch (error) {
    console.error('Error fetching representative:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params;

    if (!id) {
      return json({ error: 'Representative ID is required' }, { status: 400 });
    }

    const updates = await request.json();
    
    // Remove fields that shouldn't be updated
    const { id: _, createdAt, ...updateData } = updates;

    const updatedRepresentative = await db
      .update(representatives)
      .set(updateData)
      .where(eq(representatives.id, id))
      .returning();

    if (updatedRepresentative.length === 0) {
      return json({ error: 'Representative not found' }, { status: 404 });
    }

    return json({
      success: true,
      message: 'Representative updated successfully',
      representative: updatedRepresentative[0]
    });

  } catch (error) {
    console.error('Error updating representative:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return json({ error: 'Representative ID is required' }, { status: 400 });
    }

    await db
      .delete(representatives)
      .where(eq(representatives.id, id));

    return json({
      success: true,
      message: 'Representative deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting representative:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

