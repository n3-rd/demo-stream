import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db/drizzle';
import { scheduledRooms } from '$lib/db/schema';
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

    // Check for conflicts with existing scheduled rooms
    const conflictingRooms = await db
      .select()
      .from(scheduledRooms)
      .where(
        and(
          eq(scheduledRooms.scheduled, true),
          eq(scheduledRooms.scheduleTime, scheduleDate)
        )
      );

    if (conflictingRooms.length > 0) {
      return json({ 
        error: 'Time slot is already booked' 
      }, { status: 409 });
    }

    // Create the scheduled room
    const scheduledRoom = await db.insert(scheduledRooms).values({
      title,
      representative: representative_ids,
      scheduled: true,
      scheduleTime: scheduleDate,
      customerName: customer_name,
      customerEmail: customer_email,
      customerPhone: customer_phone,
      roomId: room_id,
      additionalInformation: additional_information,
      meetingStatus: 'scheduled',
      meetingDuration: meeting_duration,
      joinBeforeMinutes: join_before_minutes,
      hostContent: host_content,
      representativeContent: representative_content,
      participantsJoined: []
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

    let query = db.select().from(scheduledRooms);

    if (roomId) {
      query = query.where(eq(scheduledRooms.roomId, roomId));
    }

    if (representativeId) {
      // Note: This is a simplified check since representative is stored as text array
      // In production, you might want to use a proper join table
      query = query.where(eq(scheduledRooms.representative, [representativeId]));
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query.where(
        and(
          gte(scheduledRooms.scheduleTime, startOfDay),
          lte(scheduledRooms.scheduleTime, endOfDay)
        )
      );
    }

    const scheduledRoomsList = await query;
    
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
      .update(scheduledRooms)
      .set(updateData)
      .where(eq(scheduledRooms.roomId, roomId))
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
      .delete(scheduledRooms)
      .where(eq(scheduledRooms.roomId, roomId));

    return json({
      success: true,
      message: 'Scheduled room deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting scheduled room:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}; 