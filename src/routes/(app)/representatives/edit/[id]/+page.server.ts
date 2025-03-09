import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';

export const load = async ({ params, locals }) => {
  if (!locals.pb.authStore.isValid) {
    throw redirect(303, '/login');
  }

  const { id } = params;

  try {
    // Fetch the representative
    const representative = await locals.pb.collection('representatives').getOne(id);
    
    // Fetch locations
    const locations = await locals.pb.collection('locations').getFullList({
      filter: `owner_company = "${locals.pb.authStore.model.id}"`,
      sort: '-created'
    });

    // Parse schedule times for form
    const schedule = representative.schedule || {};
    const parsedSchedule = {
      monday: parseScheduleTime(schedule.monday),
      tuesday: parseScheduleTime(schedule.tuesday),
      wednesday: parseScheduleTime(schedule.wednesday),
      thursday: parseScheduleTime(schedule.thursday),
      friday: parseScheduleTime(schedule.friday),
      saturday: parseScheduleTime(schedule.saturday),
      sunday: parseScheduleTime(schedule.sunday)
    };

    return {
      representative,
      parsedSchedule,
      locations
    };
  } catch (error) {
    console.error('Error loading representative:', error);
    throw redirect(303, '/representatives');
  }
};

export const actions = {
  default: async ({ request, params, locals }) => {
    if (!locals.pb.authStore.isValid) {
      throw redirect(303, '/login');
    }

    const { id } = params;
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
      };

      // Update representative data
      const repData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        location: formData.get('location'),
        schedule: scheduleData
      };

      // Handle file upload
      const avatar = formData.get('avatar');
      
      // Check if avatar is a file and has content
      if (avatar instanceof File && avatar.size > 0) {
        // Create a new FormData instance for the API call
        const apiFormData = new FormData();
        
        // Add all the regular fields
        for (const [key, value] of Object.entries(repData)) {
          if (key === 'schedule') {
            apiFormData.append(key, JSON.stringify(value));
          } else {
            apiFormData.append(key, value as string);
          }
        }
        
        // Add the file
        apiFormData.append('avatar', avatar);
        
        // Update the record with the file
        const updatedRep = await locals.pb.collection('representatives').update(id, apiFormData);
        
        if (!updatedRep) {
          return fail(400, { 
            error: true, 
            message: 'Failed to update representative' 
          });
        }
      } else {
        // Update without file
        const updatedRep = await locals.pb.collection('representatives').update(id, repData);
        
        if (!updatedRep) {
          return fail(400, { 
            error: true, 
            message: 'Failed to update representative' 
          });
        }
      }

      // Return success
      return { success: true };
      
    } catch (error) {
      console.error('Error updating representative:', error);
      return fail(400, { 
        error: true, 
        message: error instanceof Error ? error.message : 'Failed to update representative' 
      });
    }
  }
};

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

// Helper function to parse schedule times from string like "8:00AM - 5:00PM"
function parseScheduleTime(timeString: string): { start: string, end: string } {
  if (!timeString) {
    return { start: '', end: '' };
  }
  
  try {
    const [startStr, endStr] = timeString.split(' - ');
    
    // Convert 12h format to 24h format
    const convertTo24h = (timeStr: string) => {
      // Extract hours, minutes, and period (AM/PM)
      const match = timeStr.match(/(\d+):(\d+)([AP]M)/);
      if (!match) return '';
      
      let [_, hours, minutes, period] = match;
      let h = parseInt(hours);
      
      // Convert to 24-hour format
      if (period === 'PM' && h < 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      
      return `${h.toString().padStart(2, '0')}:${minutes}`;
    };
    
    return {
      start: convertTo24h(startStr),
      end: convertTo24h(endStr)
    };
  } catch (error) {
    console.error('Error parsing time string:', error);
    return { start: '', end: '' };
  }
} 