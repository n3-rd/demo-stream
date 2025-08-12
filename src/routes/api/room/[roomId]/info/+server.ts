import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db/drizzle';
import { rooms } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params, locals }) {
  try {
    const roomId = params.roomId;
    
    if (!roomId) {
      return json({
        success: false,
        message: 'Room ID is required'
      }, { status: 400 });
    }

    // Use the locals.pb instance that's already available
    const room = await locals.pb.collection('rooms').getOne(roomId, {
      expand: 'owner_company'
    });

    if (!room) {
      return json({
        success: false,
        message: 'Room not found'
      }, { status: 404 });
    }

    // Get company information from the expanded owner_company
    const ownerCompany = room.expand?.owner_company;
    
    return json({
      success: true,
      room: {
        id: room.id,
        title: room.title,
        owner_company: room.owner_company
      },
      company: ownerCompany ? {
        id: ownerCompany.id,
        name: ownerCompany.name || ownerCompany.email,
        email: ownerCompany.email
      } : null
    });
  } catch (error) {
    console.error('Failed to fetch room info:', error);
    return json({
      success: false,
      message: 'Failed to fetch room information'
    }, { status: 500 });
  }
} 

export const PUT: RequestHandler = async ({ request, locals, params }) => {
    // Optional auth via PB if available; skip hard failure if moving to Postgres-only
    if (locals.pb && !locals.pb?.authStore.isValid) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized'
        }), { status: 401 });
    }

    const formData = await request.formData();
    const roomId = params.roomId;
    
    const getArray = (key: string): string[] => {
        const raw = formData.get(key);
        if (!raw) return [];
        return raw.toString().split(',').map(s => s.trim()).filter(Boolean);
    };

    try {
        const title = formData.get('title') as string | null;
        const isActiveRaw = formData.get('is_active');
        const selectedVideo = formData.get('selected_video') as string | null; // not stored in Postgres schema

        // Client sends these as host_content[], representative_content[], representative[]
        const hostContent = getArray('host_content[]');
        const representativeContent = getArray('representative_content[]');
        const representative = getArray('representative[]');

        let pgUpdated = false;
        let pbUpdated = false;

        // Prefer Postgres (Drizzle) if configured
        if (process.env.DATABASE_URL) {
            const pgUpdate: Record<string, any> = {};
            if (title !== null) pgUpdate.title = title;
            if (isActiveRaw !== null) pgUpdate.isActive = isActiveRaw === 'true';
            if (hostContent) pgUpdate.hostContent = hostContent;
            if (representativeContent) pgUpdate.representativeContent = representativeContent;
            if (representative) pgUpdate.representative = representative;

            if (Object.keys(pgUpdate).length > 0) {
                try {
                    await db.update(rooms).set(pgUpdate).where(eq(rooms.id, roomId));
                    pgUpdated = true;
                } catch (e) {
                    console.warn('Postgres update failed (non-fatal):', e);
                }
            }
        }

        // Best-effort sync to PocketBase if still used
        try {
            if (locals.pb) {
                const pbUpdate: Record<string, any> = {};
                if (title !== null) pbUpdate.title = title;
                if (isActiveRaw !== null) pbUpdate.is_active = isActiveRaw === 'true';
                if (hostContent) pbUpdate.host_content = hostContent;
                if (representativeContent) pbUpdate.representative_content = representativeContent;
                if (representative) pbUpdate.representative = representative;
                if (selectedVideo !== null) pbUpdate.selected_video = selectedVideo;
                if (Object.keys(pbUpdate).length > 0) {
                    await locals.pb.collection('rooms').update(roomId, pbUpdate);
                    pbUpdated = true;
                }
            }
        } catch (e) {
            console.warn('PocketBase update failed (non-fatal):', e);
        }
        
        if (pgUpdated || pbUpdated) {
            return new Response(JSON.stringify({
                success: true,
                message: 'Room updated successfully'
            }), { status: 200 });
        }

        return new Response(JSON.stringify({
            success: false,
            message: 'No backend accepted the update (DB not configured and PB unavailable)'
        }), { status: 500 });
    } catch (error) {
        console.error('Error updating room:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to update room'
        }), { status: 500 });
    }
}; 