// src/routes/api/representatives.ts
import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db/drizzle';
import { representatives } from '$lib/db/schema';
import { eq, like, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const name = url.searchParams.get('name');
    const company = url.searchParams.get('company');

    let query = db.select().from(representatives);

    // Filter by name if provided
    if (name) {
      query = query.where(like(representatives.name, `%${name}%`));
    }

    // Filter by company if provided
    if (company) {
      query = query.where(eq(representatives.company, company));
    }

    // Order by creation date
    query = query.orderBy(desc(representatives.createdAt));

    const representativesList = await query;
    
    return json({
      success: true,
      representatives: representativesList
    });

  } catch (error) {
    console.error('Error fetching representatives:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.email) {
      return json({ 
        error: 'Name and email are required' 
      }, { status: 400 });
    }

    // Create the representative
    const newRepresentative = await db.insert(representatives).values({
      name: data.name,
      firstName: data.first_name || data.firstName,
      lastName: data.last_name || data.lastName,
      email: data.email,
      phone: data.phone,
      company: data.company,
      isActive: data.is_active !== false,
      schedule: data.schedule ? JSON.parse(data.schedule) : null,
      avatar: data.avatar
    }).returning();

    return json({
      success: true,
      representative: newRepresentative[0]
    });

  } catch (error) {
    console.error('Error creating representative:', error);
    return json({ 
      error: 'Failed to create representative' 
    }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request, url }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return json({ error: 'Representative ID is required' }, { status: 400 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.email) {
      return json({ 
        error: 'Name and email are required' 
      }, { status: 400 });
    }

    // Update the representative
    const updatedRepresentative = await db
      .update(representatives)
      .set({
        name: data.name,
        firstName: data.first_name || data.firstName,
        lastName: data.last_name || data.lastName,
        email: data.email,
        phone: data.phone,
        isActive: data.is_active !== false,
        schedule: data.schedule ? JSON.parse(data.schedule) : null,
        avatar: data.avatar
      })
      .where(eq(representatives.id, id))
      .returning();

    if (updatedRepresentative.length === 0) {
      return json({ error: 'Representative not found' }, { status: 404 });
    }

    return json({
      success: true,
      representative: updatedRepresentative[0]
    });

  } catch (error) {
    console.error('Error updating representative:', error);
    return json({ 
      error: 'Failed to update representative' 
    }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');
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
    return json({ 
      error: 'Failed to delete representative' 
    }, { status: 500 });
  }
};