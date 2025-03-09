import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';

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
      };

      // Create representative data
      const repData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        company: user.id,
        is_active: true,
        schedule: scheduleData,
        location: formData.get('location'),
        library_type: ["host"],
        connected_content: []
      };

      // Handle file upload
      const avatar = formData.get('avatar');
      
      // Check if avatar is a file and has content
      if (avatar instanceof File && avatar.size > 0) {
        // Create a new FormData instance for the API call
        const apiFormData = new FormData();
        
        // Add all the regular fields
        for (const [key, value] of Object.entries(repData)) {
          if (key === 'schedule' || key === 'library_type' || key === 'connected_content') {
            apiFormData.append(key, JSON.stringify(value));
          } else {
            apiFormData.append(key, value as string);
          }
        }
        
        // Add the file
        apiFormData.append('avatar', avatar);
        
        // Create the record with the file
        const createdRep = await locals.pb.collection('representatives').create(apiFormData);
        
        if (!createdRep) {
          return fail(400, { 
            error: true, 
            message: 'Failed to create representative' 
          });
        }
      } else {
        // Create without file
        const createdRep = await locals.pb.collection('representatives').create(repData);
        
        if (!createdRep) {
          return fail(400, { 
            error: true, 
            message: 'Failed to create representative' 
          });
        }
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