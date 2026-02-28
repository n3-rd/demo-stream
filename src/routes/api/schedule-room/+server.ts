import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db/drizzle';
import * as schema from '$lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const {
      title,
      representative_ids,
      schedule_time,
      customer_name,
      customer_email,
      customer_phone,
      room_id,
      additional_information,
      meeting_duration = 60,
      join_before_minutes = 15,
      host_content = [],
      representative_content = []
    } = await request.json();

    // Validation
    if (!title || !representative_ids || !schedule_time || !customer_name || !customer_email) {
      return json({ 
        error: 'Missing required fields: title, representative_ids, schedule_time, customer_name, customer_email' 
      }, { status: 400 });
    }

    // Validate schedule_time is in the future
    const scheduleDate = new Date(schedule_time);
    const now = new Date();
    if (scheduleDate <= now) {
      return json({ 
        error: 'Schedule time must be in the future' 
      }, { status: 400 });
    }

    // Fetch the first representative to get their company
    const firstRepresentative = await db.select().from(schema.representatives)
      .where(eq(schema.representatives.id, representative_ids[0]))
      .limit(1);

    if (!firstRepresentative.length) {
      return json({ 
        error: 'Invalid representative ID' 
      }, { status: 400 });
    }

    const ownerCompany = firstRepresentative[0].company;
    if (!ownerCompany) {
      return json({ 
        error: 'Representative must be associated with a company' 
      }, { status: 400 });
    }

    // Verify the company exists
    const companyExists = await db.select().from(schema.users)
      .where(eq(schema.users.id, ownerCompany))
      .limit(1);

    if (!companyExists.length) {
      return json({ 
        error: 'Company not found' 
      }, { status: 404 });
    }

    // Check for conflicts with existing scheduled rooms
    const conflictingRooms = await db
      .select()
      .from(schema.rooms)
      .where(
        and(
          eq(schema.rooms.scheduled, true),
          eq(schema.rooms.scheduleTime, scheduleDate)
        )
      );

    if (conflictingRooms.length > 0) {
      return json({ 
        error: 'Time slot is already booked' 
      }, { status: 409 });
    }

    // Create the scheduled room
    const scheduledRoom = await db.insert(schema.rooms).values({
      title: title,
      representative: representative_ids,
      scheduled: true,
      scheduleTime: scheduleDate,
      customerName: customer_name,
      customerEmail: customer_email,
      customerPhone: customer_phone,
      roomId: room_id,
      additionalInformation: additional_information,
      ownerCompany: ownerCompany, 
      hostContent: host_content,
      representativeContent: representative_content,
      representativeId: representative_ids[0], 
      isActive: true
    }).returning();

    return json({
      success: true,
      message: 'Room scheduled successfully',
      scheduled_room: scheduledRoom[0]
    });

  } catch (error) {
    console.error('Error scheduling room:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const roomId = url.searchParams.get('room_id');
    const representativeId = url.searchParams.get('representative_id');
    const date = url.searchParams.get('date');

    const conditions = [eq(schema.rooms.scheduled, true)];

    if (roomId) {
      conditions.push(eq(schema.rooms.roomId, roomId));
    }

    if (representativeId) {
      conditions.push(eq(schema.rooms.representativeId, representativeId));
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      
      conditions.push(gte(schema.rooms.scheduleTime, startOfDay));
      conditions.push(lte(schema.rooms.scheduleTime, endOfDay));
    }

    const scheduledRoomsList = await db
      .select()
      .from(schema.rooms)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions));
    
    return json({
      success: true,
      scheduled_rooms: scheduledRoomsList
    });

  } catch (error) {
    console.error('Error fetching scheduled rooms:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request, url }) => {
  try {
    const roomId = url.searchParams.get('room_id');
    if (!roomId) {
      return json({ error: 'Room ID is required' }, { status: 400 });
    }

    const updates = await request.json();
    
    // Remove fields that shouldn't be updated
    const { id, createdAt, ...updateData } = updates;

    const updatedRoom = await db
      .update(schema.rooms)
      .set(updateData)
      .where(eq(schema.rooms.roomId, roomId))
      .returning();

    if (updatedRoom.length === 0) {
      return json({ error: 'Scheduled room not found' }, { status: 404 });
    }

    return json({
      success: true,
      message: 'Room updated successfully',
      scheduled_room: updatedRoom[0]
    });

  } catch (error) {
    console.error('Error updating scheduled room:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const roomId = url.searchParams.get('room_id');
    if (!roomId) {
      return json({ error: 'Room ID is required' }, { status: 400 });
    }

    await db
      .delete(schema.rooms)
      .where(eq(schema.rooms.roomId, roomId));

    return json({
      success: true,
      message: 'Scheduled room deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting scheduled room:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}; 