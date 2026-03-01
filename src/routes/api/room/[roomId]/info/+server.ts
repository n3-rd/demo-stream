import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db/drizzle';
import { rooms } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import {DATABASE_URL} from '$env/static/private';

const isAbsoluteUrl = (s: string) => /^https?:\/\//i.test(s);

/** Map content_library record to API item shape. Uses file/thumbnail as-is when already absolute (e.g. CDN), else builds /api/files/... URL. */
function toContentItem(record: { id: string; title: string; type: string; file?: string; thumbnail?: string }, basePath = '/api/files/content_library') {
  return {
    id: record.id,
    title: record.title ?? '',
    type: record.type ?? 'document',
    file: record.file ? (isAbsoluteUrl(record.file) ? record.file : `${basePath}/${record.id}/${record.file}`) : '',
    thumbnail: record.thumbnail ? (isAbsoluteUrl(record.thumbnail) ? record.thumbnail : `${basePath}/${record.id}/${record.thumbnail}`) : ''
  };
}

export async function GET({ params, locals, url }) {
  try {
    const roomId = params.roomId;

    if (!roomId) {
      return json({
        success: false,
        message: 'Room ID is required'
      }, { status: 400 });
    }

    if (!locals.pb) {
      return json({
        success: false,
        message: 'Database connection not available'
      }, { status: 503 });
    }

    const room = await locals.pb.collection('rooms').getOne(roomId, {
      expand: 'owner_company,host_content,representative_content'
    });

    if (!room) {
      return json({
        success: false,
        message: 'Room not found'
      }, { status: 404 });
    }

    let contentActiveState: Record<string, Record<string, boolean>> | null = null;
    if (DATABASE_URL) {
      try {
        const [row] = await db.select({ contentActiveState: rooms.contentActiveState }).from(rooms).where(eq(rooms.id, roomId));
        if (row?.contentActiveState && typeof row.contentActiveState === 'object') {
          contentActiveState = row.contentActiveState as Record<string, Record<string, boolean>>;
        }
      } catch (_) {}
    }

    const ownerCompany = room.expand?.owner_company;
    const basePath = url ? `${url.origin}/api/files/content_library` : '/api/files/content_library';

    const hostContent = room.expand?.host_content ?? [];
    const representativeContent = room.expand?.representative_content ?? [];
    const hostContentItems = Array.isArray(hostContent)
      ? hostContent.map((c: { id: string; title: string; type: string; file?: string; thumbnail?: string }) => toContentItem(c, basePath))
      : [];
    const representativeContentItems = Array.isArray(representativeContent)
      ? representativeContent.map((c: { id: string; title: string; type: string; file?: string; thumbnail?: string }) => toContentItem(c, basePath))
      : [];

    return json({
      success: true,
      room: {
        id: room.id,
        title: room.title,
        owner_company: room.owner_company,
        is_active: room.is_active ?? true,
        representative: room.representative ?? [],
        scheduled: room.scheduled ?? false,
        schedule_time: room.schedule_time ?? null,
        host_content_active: contentActiveState?.host_content_active ?? {},
        representative_content_active: contentActiveState?.representative_content_active ?? {},
        hostContentItems,
        representativeContentItems
      },
      company: ownerCompany
        ? {
            id: ownerCompany.id,
            name: ownerCompany.name ?? ownerCompany.email,
            email: ownerCompany.email
          }
        : null
    });
  } catch (error) {
    console.error('Failed to fetch room info:', error);
    return json({
      success: false,
      message: 'Failed to fetch room information'
    }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request, params }) => {
  const roomId = params.roomId;
  if (!roomId) return json({ success: false, message: 'Room ID required' }, { status: 400 });
  try {
    const body = await request.json().catch(() => ({})) as Record<string, Record<string, boolean>>;
    const host_content_active = body.host_content_active;
    const representative_content_active = body.representative_content_active;
    if (!host_content_active && !representative_content_active) {
      return json({ success: false, message: 'No content active state provided' }, { status: 400 });
    }
    const [existing] = await db.select({ contentActiveState: rooms.contentActiveState }).from(rooms).where(eq(rooms.id, roomId));
    const current = (existing?.contentActiveState as Record<string, Record<string, boolean>>) ?? {};
    const next = { ...current };
    if (host_content_active) next.host_content_active = host_content_active;
    if (representative_content_active) next.representative_content_active = representative_content_active;
    await db.update(rooms).set({ contentActiveState: next }).where(eq(rooms.id, roomId));
    return json({ success: true });
  } catch (e) {
    console.error('PATCH room info:', e);
    return json({ success: false, message: 'Failed to update' }, { status: 500 });
  }
};

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
        if (DATABASE_URL) {
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