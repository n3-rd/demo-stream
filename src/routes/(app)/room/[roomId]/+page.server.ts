import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/db/drizzle';
import { rooms, representatives, locations, users } from '$lib/db/schema';
import { eq, or, and, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url, cookies }) => {
    const roomIdParam = params.roomId;

    // Check for authentication - allow either normal user auth or viewroom/representative auth
    const isNormalAuth = !!locals.user;
    const viewroomSession = cookies.get('viewroom_session');
    const viewroomUserCookie = cookies.get('viewroom_user');
    const repSession = cookies.get('rep_session');
    const repUserCookie = cookies.get('rep_user');
    const incomingUid = url.searchParams.get('uid') || '';

    let viewroomUser: any = null;
    let representativeUser: any = null;
    let authType = 'none';

    if (isNormalAuth) {
        authType = 'pocketbase'; // Kept for UI compatibility
        viewroomUser = {
            id: locals.user.id,
            first_name: locals.user.name || 'User',
            company: locals.user.companyName || 'Company User',
            email: locals.user.email
        };
    } else if (viewroomSession && viewroomUserCookie) {
        try {
            viewroomUser = JSON.parse(viewroomUserCookie);
            authType = 'viewroom';
        } catch (e) {
            const suffix = incomingUid ? `&uid=${encodeURIComponent(incomingUid)}` : '';
            throw redirect(303, `/viewroom/login?room=${params.roomId}${suffix}`);
        }
    } else if (repSession && repUserCookie) {
        try {
            representativeUser = JSON.parse(repUserCookie);
            authType = 'representative';
        } catch (e) {
            const suffix = incomingUid ? `&uid=${encodeURIComponent(incomingUid)}` : '';
            throw redirect(303, `/viewroom/login?room=${params.roomId}${suffix}`);
        }
    } else if (url.searchParams.get('repid')) {
        try {
            const repId = url.searchParams.get('repid');
            const [repRecord] = await db.select().from(representatives).where(eq(representatives.id, repId)).limit(1);

            if (repRecord) {
                const sessionData = JSON.stringify({
                    id: repRecord.id,
                    email: repRecord.email,
                    name: repRecord.name || `${repRecord.firstName || ''} ${repRecord.lastName || ''}`.trim(),
                    firstName: repRecord.firstName,
                    lastName: repRecord.lastName,
                    company: repRecord.company
                });

                cookies.set('rep_session', repId, { path: '/', httpOnly: true, sameSite: 'strict', maxAge: 60 * 60 * 8 });
                cookies.set('rep_user', sessionData, { path: '/', httpOnly: false, sameSite: 'strict', maxAge: 60 * 60 * 8 });
                authType = 'representative';
            }
        } catch (err) {
            console.error('Failed to set representative cookies:', err);
            authType = 'anonymous';
        }
    } else {
        authType = 'anonymous';
    }

    try {
        // Fetch room using Drizzle (searching by short room_id or UUID)
        const [roomRecord] = await db.select().from(rooms)
            .where(or(eq(rooms.roomId, roomIdParam), eq(rooms.id, roomIdParam)))
            .limit(1);

        if (!roomRecord) {
            throw error(404, 'Room not found');
        }

        // Handle scheduled meetings
        if (roomRecord.scheduled && roomRecord.scheduleTime) {
            const scheduleTime = new Date(roomRecord.scheduleTime);
            const currentTime = new Date();
            const timeDiffMinutes = (scheduleTime.getTime() - currentTime.getTime()) / (1000 * 60);

            // In Drizzle, the table likely doesn't have join_before_minutes yet, default to 5
            const joinBeforeMinutes = 5;

            if (timeDiffMinutes > joinBeforeMinutes) {
                return {
                    error: true,
                    scheduledMeeting: true,
                    message: `This meeting is scheduled for ${scheduleTime.toLocaleString()}. Please return at that time.`,
                    scheduledTime: scheduleTime,
                    scheduledRoomId: roomRecord.id,
                    join_before_minutes: joinBeforeMinutes,
                    redirectTo: '/'
                };
            }
        }

        // Company ID for additional lookups
        const companyId = isNormalAuth ? locals.user.id : roomRecord.ownerCompany;

        // Fetch Representatives with locations using a JOIN
        let roomRepresentatives = [];
        const repIds = roomRecord.representative || [];

        if (repIds.length > 0) {
            const repsWithLocations = await db.select({
                id: representatives.id,
                name: representatives.name,
                firstName: representatives.firstName,
                lastName: representatives.lastName,
                email: representatives.email,
                avatar: representatives.avatar,
                isActive: representatives.isActive,
                company: representatives.company,
                location: {
                    id: locations.id,
                    name: locations.name,
                    address: locations.address
                }
            })
                .from(representatives)
                .leftJoin(locations, eq(representatives.location, locations.id))
                .where(inArray(representatives.id, repIds));

            // Flatten for UI compat (transform location object to 'expand.location')
            roomRepresentatives = repsWithLocations.map(r => ({
                ...r,
                expand: { location: r.location }
            }));
        }

        // Return room data with snake_case fields for UI compatibility
        return {
            id: roomRecord.id,
            room_id: roomRecord.roomId,
            title: roomRecord.title,
            owner_company: roomRecord.ownerCompany,
            is_active: roomRecord.isActive,
            host_content: roomRecord.hostContent,
            representative_content: roomRecord.representativeContent,
            representative: roomRecord.representative,
            scheduled: roomRecord.scheduled,
            schedule_time: roomRecord.scheduleTime,
            customer_name: roomRecord.customerName,
            customer_email: roomRecord.customerEmail,
            customer_phone: roomRecord.customerPhone,
            additional_information: roomRecord.additionalInformation,
            representative_id: roomRecord.representativeId,
            representatives: roomRepresentatives,
            authType,
            debug: {
                hasRepField: !!roomRecord.representative,
                repCount: roomRepresentatives.length,
                isDrizzle: true
            }
        };

    } catch (err) {
        console.error('Error loading room:', err);
        return { error: true, message: 'Room not found', redirectTo: '/' };
    }
};

