import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db/drizzle';
import { rooms } from '$lib/db/schema';

function generateShortId(length = 10): string {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export const POST: RequestHandler = async ({ request, locals }) => {
    // Check authentication via locals.user (populated from session in hooks)
    if (!locals.user) {
        return json({
            success: false,
            message: 'Unauthorized'
        }, { status: 401 });
    }

    const formData = await request.formData();
    const title = formData.get('title')?.toString();
    const isActive = formData.has('is_active');

    // Get the arrays from the form data
    const hostContent = formData.get('host_content[]')?.toString().split(',').filter(Boolean) || [];
    const repContent = formData.get('representative_content[]')?.toString().split(',').filter(Boolean) || [];
    const representative = formData.get('representative[]')?.toString().split(',').filter(Boolean) || [];

    if (!title) {
        return json({
            success: false,
            error: 'Title is required'
        }, { status: 400 });
    }

    try {
        const shortId = generateShortId(10);

        // Use Drizzle to insert the new room record
        const [roomRecord] = await db.insert(rooms).values({
            roomId: shortId,
            title,
            isActive,
            hostContent,
            representativeContent: repContent,
            representative,
            ownerCompany: locals.user.id
        }).returning();

        console.log('Created room successfully with Drizzle:', roomRecord);

        return json({
            success: true,
            room: roomRecord
        }, { status: 200 });

    } catch (err: any) {
        console.error('Error creating room with Drizzle:', err);
        return json({
            success: false,
            error: 'Failed to create room',
            message: err.message
        }, { status: 500 });
    }
};
