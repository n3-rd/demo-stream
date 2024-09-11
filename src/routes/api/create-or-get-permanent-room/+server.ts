import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as ics from 'ics';
import { PUBLIC_DAILY_API_KEY } from '$env/static/public';

export const POST: RequestHandler = async ({ request, locals, url }) => {
    try {
        const { userId, roomName, scheduled_date, day, year, month } = await request.json();
        console.log('Received payload:', { userId, roomName, scheduled_date, day, year, month });

        // Ensure scheduled_date is a valid Date object
        const scheduledDate = new Date(scheduled_date);
        if (isNaN(scheduledDate.getTime())) {
            console.error('Invalid scheduled date:', scheduled_date);
            throw error(400, 'Invalid scheduled date');
        }

        const currentDate = new Date();
        console.log('Current date:', currentDate);
        console.log('Scheduled date:', scheduledDate);

        // Check if the current date is before the scheduled date
        if (currentDate > scheduledDate) {
            console.error('The room cannot be started before the scheduled date.');
            throw error(400, 'The room cannot be started before the scheduled date.');
        }

        // Convert room name to lowercase
        const lowerCaseRoomName = roomName.toLowerCase();

        // Create a new scheduled room
        const newHostId = crypto.randomUUID();
        
        // Format the date as "YYYY-MM-DD HH:MM:SS.SSSZ"
        const formattedDate = scheduledDate.toISOString().replace('T', ' ').replace('Z', '');
        console.log('Formatted date:', formattedDate);

        const userInfo = await locals.pb.collection('users').getOne(userId);
        const userName = userInfo?.name || 'Unknown User name';
        const userEmail = userInfo?.email || 'Unknown User email';
        console.log('User info:', { userName, userEmail });
        const newRoomName = `meet-${Math.random().toString(36).substring(2, 7)}-${lowerCaseRoomName}-${userId}`;

        // Create room with Daily API
        const dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PUBLIC_DAILY_API_KEY}`
            },
            body: JSON.stringify({
                name: newRoomName,
                properties: {
                    nbf: Math.floor(scheduledDate.getTime() / 1000),
                    exp: Math.floor(scheduledDate.getTime() / 1000) + 86400, // 24 hours duration
                }
            })
        });

        if (!dailyResponse.ok) {
            const errorData = await dailyResponse.json();
            if (errorData.error === 'invalid-request-error' && errorData.info.includes('already exists')) {
                console.error('Room already exists:', lowerCaseRoomName);
                throw error(409, 'Room already exists');
            } else {
                console.error('Failed to create Daily room:', errorData);
                throw error(500, 'Failed to create Daily room');
            }
        }

        const dailyRoom = await dailyResponse.json();
        console.log('Daily room created:', dailyRoom);

        const room = await locals.pb.collection('scheduled_rooms').create({
            host_id: newHostId,
            user: userId,
            room_name: newRoomName,
            day,
            year,
            month,
            schedule_date: formattedDate, // Use the correctly formatted date
            daily_room_url: dailyRoom.url // Store the Daily room URL
        });
        console.log('New room created:', room);

        const newlyCreatedRoom = await locals.pb.collection('scheduled_rooms').getFirstListItem(`host_id="${newHostId}"`);
        const origin = url.origin;
   
        // Create an iCalendar event
        const event = {
            start: [year, month, day, scheduledDate.getHours(), scheduledDate.getMinutes()],
            title: lowerCaseRoomName,
            description: `Scheduled room by User: ${userName}`,
            status: 'CONFIRMED',
            organizer: { name: userName, email: userEmail },
            url: `${origin}/room/${newlyCreatedRoom.name}`,
        };

        const { error: icsError, value } = ics.createEvent(event);
        if (icsError) {
            console.error('Failed to create iCalendar event:', icsError);
            throw error(500, 'Failed to create iCalendar event');
        }

        // Return the iCalendar event data for download
        return new Response(value, {
            headers: {
                'Content-Type': 'text/calendar',
                'Content-Disposition': 'attachment; filename="event.ics"'
            }
        });
    } catch (err) {
        console.error('Failed to create room:', err);
        throw error(err.status || 500, err.message || 'Failed to create room');
    }
};