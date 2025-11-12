import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';
import { query } from '$lib/db';

export const load = async ({ locals }) => {
  if (!locals.pb.authStore.isValid) {
    throw redirect(303, '/login');
  }

  try {
    const locations = await locals.pb.collection('locations').getFullList({
      filter: `owner_company = "${locals.pb.authStore.model.id}"`,
      sort: '-created'
    });
    return {
      locations
    };
  } catch (error) {
    console.error('Error loading locations:', error);
    return {
      locations: []
    };
  }
};

export const actions = {
  default: async ({ request, locals }) => {
    if (!locals.pb.authStore.isValid) {
      throw redirect(303, '/login');
    }

    const user = locals.pb.authStore.model;
    const formData = await request.formData();
    
    try {
      // Format schedule data
      const scheduleData = {
        monday: formatSchedule(formData.get('monday_start'), formData.get('monday_end')),
        tuesday: formatSchedule(formData.get('tuesday_start'), formData.get('tuesday_end')),
        wednesday: formatSchedule(formData.get('wednesday_start'), formData.get('wednesday_end')),
        thursday: formatSchedule(formData.get('thursday_start'), formData.get('thursday_end')),
        friday: formatSchedule(formData.get('friday_start'), formData.get('friday_end')),
        saturday: formatSchedule(formData.get('saturday_start'), formData.get('saturday_end')),
        sunday: formatSchedule(formData.get('sunday_start'), formData.get('sunday_end'))
      } as any;

      // Compute names
      const first_name = String(formData.get('first_name') || '').trim();
      const last_name = String(formData.get('last_name') || '').trim();
      const name = [first_name, last_name].filter(Boolean).join(' ').trim();

      const avatarFile = formData.get('avatar');
      let avatarId: string | null = null;
      if (avatarFile instanceof File && avatarFile.size > 0) {
        const buffer = Buffer.from(await avatarFile.arrayBuffer());
        const { rows } = await query<{ id: string }>(
          `INSERT INTO file_blobs (filename, content_type, data) VALUES ($1, $2, $3) RETURNING id`,
          [avatarFile.name, avatarFile.type || 'application/octet-stream', buffer]
        );
        avatarId = rows[0]?.id || null;
      }

      // Create representative data as a plain object (DB shim doesn't accept FormData)
      const repData = {
        name,
        first_name: first_name || null,
        last_name: last_name || null,
        email: String(formData.get('email') || '').trim(),
        phone: String(formData.get('phone') || '').trim(),
        company: user.id,
        is_active: true,
        schedule: scheduleData,
        location: String(formData.get('location') || '') || null,
        avatar: avatarId
      } as any;

      const createdRep = await locals.pb.collection('representatives').create(repData);
      
      if (!createdRep) {
        return fail(400, { 
          error: true, 
          message: 'Failed to create representative' 
        });
      }

      // Return success
      return { success: true };
      
    } catch (error) {
      console.error('Error creating representative:', error);
      return fail(400, { 
        error: true, 
        message: error instanceof Error ? error.message : 'Failed to create representative' 
      });
    }
  }
} satisfies Actions;

// Helper function to format schedule times
function formatSchedule(start: FormDataEntryValue | null, end: FormDataEntryValue | null): string {
  if (!start || !end) return '';
  
  const startTime = start.toString();
  const endTime = end.toString();
  
  if (!startTime || !endTime) return '';
  
  // Convert 24h format to 12h format with AM/PM
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes}${period}`;
  };
  
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
} 