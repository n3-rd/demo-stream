<script lang="ts">
  import { Bell } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { getLocalTimeZone, today } from "@internationalized/date";
  import { Calendar } from "$lib/components/ui/calendar/index.js";
  import { createEventDispatcher } from 'svelte';
  import * as Tabs from "$lib/components/ui/tabs";
  import { useForm, HintGroup, Hint, validators, required, email as emailValidator } from 'svelte-use-form';
  import HintValidate from '$lib/components/layout/hint-validate.svelte';
  import { slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
	import { toast } from 'svelte-sonner';
  // Import workaround - the linter will still show an error but it should work at runtime
  // Alternatively, you could mock this for local development
  const PUBLIC_POCKETBASE_INSTANCE = import.meta.env.PUBLIC_POCKETBASE_INSTANCE || 'http://localhost:8090';
  
  // Use dynamic import for PocketBase to avoid issues during build
  import('pocketbase').then(module => {
    PocketBase = module.default;
    pb = new PocketBase(PUBLIC_POCKETBASE_INSTANCE);
  });
  
  let PocketBase;
  let pb;

  export let userId = null;
  export let availableRepresentatives = [];

  let value = today(getLocalTimeZone());
  const dispatch = createEventDispatcher();

  // Form State
  let firstName = '';
  let lastName = '';
  let phoneNumber = '';
  let email = '';
  let address = { street: '', city: '', state: '', zip: '', country: '' };
  let selectedDay = value.day;
  let selectedMonth = value.month;
  let selectedYear = value.year;
  let roomName = ''; // This will be used for the room name
  let roomNameError: string = '';
  let selectedRepresentative = null;
  let selectedDate = null;
  let selectedTimeSlot = null;
  let availableSlots = [];
  let representativeDetails = null;
  let formError = '';
  let activeTab = 'personal-info';
  let selectedSlot = null;
  let calendarVisible = false;
  let appointmentTitle = '';

  // Sync fullName with firstName + lastName 
  $: fullName = `${firstName} ${lastName}`.trim();
  
  // Sync phone with phoneNumber
  $: phone = phoneNumber;
  
  // Debug values
  $: {
    console.log('Form values:', {
      fullName, 
      firstName, 
      lastName,
      phone, 
      phoneNumber,
      email,
      selectedRepresentative,
      selectedDate,
      selectedTimeSlot,
      roomName,
      isFormValid
    });
  }

  const form = useForm();

  // Reactive statement to update selectedDay, selectedMonth, and selectedYear when value changes
  $: {
    selectedDay = value.day;
    selectedMonth = value.month;
    selectedYear = value.year;
    
    // Convert to date object for the scheduling
    selectedDate = new Date(Date.UTC(selectedYear, selectedMonth - 1, selectedDay));
    
    // Log to verify the correct date is being set
    console.log('Selected date value:', value);
    console.log('Setting selectedDate to:', selectedDate.toISOString());
    console.log('Date components:', { selectedDay, selectedMonth, selectedYear });
  }

  // Function to validate room name
  function validateRoomName(name: string): boolean {
    const regex = /^[A-Za-z0-9_-]+$/;
    return regex.test(name);
  }

  // Function to handle room name change
  function handleRoomNameChange() {
    if (!validateRoomName(roomName)) {
      roomNameError = "Room name can only contain letters, numbers, hyphens, and underscores.";
    } else {
      roomNameError = "";
    }
  }

  // Reactive statement to check if all required fields are filled
  $: isFormValid = firstName && lastName && phoneNumber && email && 
                  selectedRepresentative && selectedDate && selectedTimeSlot;

  // Update available time slots when representative or date changes
  $: if (selectedRepresentative && selectedDate) {
    fetchAvailableSlots(selectedRepresentative, selectedDate);
    fetchRepresentativeDetails(selectedRepresentative);
  }

  async function fetchRepresentativeDetails(rep) {
    if (!rep || !pb) return;
    
    try {
      console.log('Fetching details for representative:', rep);
      
      // If the rep is already the full representative object from PocketBase
      if (typeof rep === 'object' && rep.id && rep.collectionName === 'representatives') {
        console.log('Using direct representative object from selection:', rep);
        representativeDetails = rep;
        return;
      }
      
      // If rep has a direct ID
      if (typeof rep === 'object' && rep.id) {
        try {
          // Try to fetch by ID directly
          const record = await pb.collection('representatives').getOne(rep.id);
          if (record) {
            representativeDetails = record;
            console.log('Found representative by ID:', representativeDetails);
            return;
          }
        } catch (idError) {
          console.error('Error finding representative by ID:', idError);
        }
      }
      
      // Extract from stream data
      if (typeof rep === 'string' && rep.includes('_representative')) {
        // Extract the ID from the stream string
        const parts = rep.split('-');
        if (parts.length > 1) {
          const namePart = parts[parts.length - 1];
          const cleanName = namePart.replace(/_representative$/, '');
          console.log('Extracted name from stream ID:', cleanName);
          
          // Try to find by name first
          try {
            const filter = `name='${cleanName}'`;
            console.log('Searching with filter:', filter);
            const records = await pb.collection('representatives').getList(1, 1, { filter });
            if (records && records.items && records.items.length > 0) {
              representativeDetails = records.items[0];
              console.log('Found representative by name:', representativeDetails);
              return;
            }
          } catch (nameError) {
            console.error('Error finding representative by name:', nameError);
          }
        }
      } else if (typeof rep === 'object' && rep.streamId) {
        // Extract from streamId in an object
        const parts = rep.streamId.split('-');
        if (parts.length > 1) {
          const namePart = parts[parts.length - 1];
          const cleanName = namePart.replace(/_representative$/, '');
          console.log('Extracted name from object streamId:', cleanName);
          
          // Try to find by name first
          try {
            const filter = `name='${cleanName}'`;
            console.log('Searching with filter:', filter);
            const records = await pb.collection('representatives').getList(1, 1, { filter });
            if (records && records.items && records.items.length > 0) {
              representativeDetails = records.items[0];
              console.log('Found representative by name:', representativeDetails);
              return;
            }
          } catch (nameError) {
            console.error('Error finding representative by name:', nameError);
          }
        }
      }
      
      // As a fallback, if we've selected a representative from the dropdown, 
      // we can try to get all representatives and find a match
      console.log('Attempting fallback lookup for all representatives');
      const allRepresentatives = await pb.collection('representatives').getFullList();
      console.log('All representatives:', allRepresentatives);
      
      if (allRepresentatives && allRepresentatives.length > 0) {
        // If we have a rep object with a streamId
        if (typeof rep === 'object' && rep.streamId) {
          const streamParts = rep.streamId.split('-');
          const streamName = streamParts[streamParts.length - 1].replace(/_representative$/, '');
          
          // Find by name match
          const matchByName = allRepresentatives.find(r => 
            r.name.toLowerCase() === streamName.toLowerCase()
          );
          
          if (matchByName) {
            representativeDetails = matchByName;
            console.log('Found representative by name match:', representativeDetails);
            return;
          }
        }
        
        // If all else fails, just use the first representative
        // You might want to remove this in production and show an error instead
        representativeDetails = allRepresentatives[0];
        console.log('Using first available representative as fallback:', representativeDetails);
      } else {
        console.error('No representatives found in the database');
        representativeDetails = null;
      }
      
    } catch (error) {
      console.error('Error fetching representative details:', error);
      representativeDetails = null;
    }
  }

  // Update the isDateDisabled function to check properly
  function isDateDisabled(date) {
    // First check if date is in the past
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0); // Reset hours to start of day
    const selectedDate = new Date(date.year, date.month - 1, date.day);
    
    if (selectedDate.getTime() < todayDate.getTime()) {
      return true; // Disable past dates
    }
    
    // Then check if the day is in the representative's schedule
    if (representativeDetails && representativeDetails.schedule) {
      try {
        // Parse the schedule JSON if it's a string
        const scheduleData = typeof representativeDetails.schedule === 'string' 
          ? JSON.parse(representativeDetails.schedule) 
          : representativeDetails.schedule;
        
        // Get the day of week name in lowercase
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = days[selectedDate.getDay()];
        
        // If this day doesn't exist in the schedule or has an empty schedule, disable it
        return !scheduleData[dayName] || scheduleData[dayName] === "";
      } catch (error) {
        console.error('Error parsing schedule data:', error);
        return false; // If there's an error, don't disable the date
      }
    }
    
    return false; // If no schedule is available, allow all dates
  }

  // Update the fetchAvailableSlots function to properly generate and display time slots
  async function fetchAvailableSlots(rep, date) {
    console.log('schedule console: Fetching available slots for:', { rep, date });
    try {
      // Format date to YYYY-MM-DD
      const formattedDate = date.toISOString().split('T')[0];
      console.log('Formatted date:', formattedDate);
      
      // First get the representative details to access their schedule
      if (!representativeDetails || !representativeDetails.scheduled_meetings) {
        // Fetch fresh data to make sure we have the latest scheduled_meetings
        const repId = typeof rep === 'object' && rep.id ? rep.id : null;
        if (repId) {
          representativeDetails = await pb.collection('representatives').getOne(repId);
          console.log('schedule console: Fetched fresh representative details:', representativeDetails);
        } else {
          await fetchRepresentativeDetails(rep);
        }
      }
      
      // Initialize an empty array for slots
      let generatedSlots = [];
      
      // If we have schedule data, generate slots based on the schedule
      if (representativeDetails && representativeDetails.schedule) {
        try {
          // Parse the schedule JSON if it's a string
          const scheduleData = typeof representativeDetails.schedule === 'string' 
            ? JSON.parse(representativeDetails.schedule) 
            : representativeDetails.schedule;
          
          // Get the day of week name in lowercase
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayName = days[date.getDay()];
          
          // If this day exists in the schedule, parse the hours
          if (scheduleData[dayName]) {
            const hours = scheduleData[dayName];
            console.log(`schedule console: Schedule for ${dayName}: ${hours}`);
            
            // Check if the schedule is empty
            if (!hours || hours === "") {
              console.log(`schedule console: No schedule for ${dayName}`);
              availableSlots = [];
              return; // No slots to generate
            }
            
            // Handle different format possibilities for start-end times
            let startStr, endStr;
            if (typeof hours === 'string' && hours.includes(' - ')) {
              [startStr, endStr] = hours.split(' - ');
            } else if (typeof hours === 'object' && hours.start && hours.end) {
              startStr = hours.start;
              endStr = hours.end;
            } else {
              console.error('Unexpected hours format:', hours);
              availableSlots = [];
              return;
            }
            
            if (startStr && endStr) {
              // Generate the time slots with fixed 1-hour intervals
              generatedSlots = generateFixedTimeSlots();
              
              // Get existing scheduled meetings for this date
              let scheduledMeetings = {};
              if (representativeDetails.scheduled_meetings) {
                try {
                  scheduledMeetings = typeof representativeDetails.scheduled_meetings === 'string'
                    ? JSON.parse(representativeDetails.scheduled_meetings)
                    : representativeDetails.scheduled_meetings;
                  
                  console.log('All meetings:', scheduledMeetings);
                  console.log('Meetings for this date:', scheduledMeetings[formattedDate]);
                } catch (e) {
                  console.error('Error parsing scheduled meetings:', e);
                  scheduledMeetings = {};
                }
              }
              
              // Mark slots as booked if they're already scheduled
              for (const slot of generatedSlots) {
                const isBooked = checkTimeSlotBooked(formattedDate, slot.time, scheduledMeetings);
                slot.available = !isBooked;
                console.log(`Slot ${slot.time} is ${isBooked ? 'booked' : 'available'}`);
              }
            }
          }
        } catch (error) {
          console.error('schedule console: Error parsing schedule hours:', error);
        }
      }
      
      // Update available slots
      console.log('Final time slots:', generatedSlots);
      availableSlots = generatedSlots;
    } catch (error) {
      console.error('Error fetching available slots:', error);
      availableSlots = [];
    }
  }

  // Generate a fixed set of time slots for demo/testing
  function generateFixedTimeSlots() {
    return [
      { id: 1, time: "9:00 AM - 10:00 AM", available: true },
      { id: 2, time: "10:00 AM - 11:00 AM", available: true },
      { id: 3, time: "11:00 AM - 12:00 PM", available: true },
      { id: 4, time: "12:00 PM - 1:00 PM", available: true },
      { id: 5, time: "1:00 PM - 2:00 PM", available: true },
      { id: 6, time: "2:00 PM - 3:00 PM", available: true },
      { id: 7, time: "3:00 PM - 4:00 PM", available: true },
      { id: 8, time: "4:00 PM - 5:00 PM", available: true }
    ];
  }

  // Improved function to check if a time slot is booked
  function checkTimeSlotBooked(dateStr, timeSlot, scheduledMeetings) {
    if (!scheduledMeetings || !scheduledMeetings[dateStr] || !scheduledMeetings[dateStr].length) {
      return false;
    }
    
    // Clean up the time slot format (remove all whitespace and make uppercase)
    const normalizedTimeSlot = timeSlot.replace(/\s+/g, '').toUpperCase();
    
    console.log(`Checking if ${timeSlot} is booked (normalized: ${normalizedTimeSlot})`);
    console.log(`Meetings on ${dateStr}:`, scheduledMeetings[dateStr]);
    
    // Check each existing meeting on this date
    for (const meeting of scheduledMeetings[dateStr]) {
      if (!meeting || !meeting.time) continue;
      
      // Normalize meeting time format
      const normalizedMeetingTime = meeting.time.replace(/\s+/g, '').toUpperCase();
      
      console.log(`Comparing with meeting: ${meeting.time} (normalized: ${normalizedMeetingTime})`);
      
      if (normalizedTimeSlot === normalizedMeetingTime) {
        console.log(`MATCH! Slot ${timeSlot} is booked by meeting at ${meeting.time}`);
        return true;
      }
    }
    
    return false;
  }

  async function handleSubmit() {
    console.log('schedule console: Starting handleSubmit');
    // Clear previous error state
    formError = '';
    
    // Do validation checks but use toast for errors
    if (!firstName || !lastName) {
      toast.error('Please enter your full name (first and last name)');
      return;
    }
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    if (!phoneNumber) {
      toast.error('Please enter your phone number');
      return;
    }
    
    if (!selectedRepresentative) {
      toast.error('Please select a representative');
      return;
    }
    
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }
    
    if (!selectedTimeSlot) {
      toast.error('Please select a time slot');
      return;
    }
    
    try {
      // First fetch representative details
      console.log('schedule console: Current representative details:', representativeDetails);
      const currentRep = await pb.collection('representatives').getOne(representativeDetails.id);
      console.log('schedule console: Fetched current rep data:', currentRep);
      
      // Parse existing meetings
      let scheduledMeetings = {};
      if (currentRep.scheduled_meetings) {
        try {
          scheduledMeetings = typeof currentRep.scheduled_meetings === 'string' 
            ? JSON.parse(currentRep.scheduled_meetings) 
            : { ...currentRep.scheduled_meetings };
          console.log('schedule console: Parsed existing meetings:', scheduledMeetings);
        } catch (e) {
          console.error('schedule console: Error parsing existing meetings:', e);
        }
      }

      const bookingDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
      console.log('schedule console: Booking date:', bookingDate);

      if (!scheduledMeetings[bookingDate]) {
        scheduledMeetings[bookingDate] = [];
      }

      // Make sure we have a selected slot
      if (!selectedSlot) {
        console.error('schedule console: No time slot selected');
        toast.error('Please select a time slot');
        return;
      }

      // Prepare meeting data
      const newMeeting = {
        time: selectedSlot.time,
        customer_name: fullName,
        customer_email: email,
        customer_phone: phoneNumber,
        room_name: roomName,
        appointment_title: appointmentTitle || '',
        customer_address: {
          street: address.street || '',
          city: address.city || '',
          state: address.state || '',
          zip: address.zip || '',
          country: address.country || ''
        }
      };
      console.log('schedule console: New meeting to add:', newMeeting);

      // Store all the data we need for appointment creation
      pendingAppointmentData = {
        scheduledMeetings,
        bookingDate,
        newMeeting,
        representativeDetails,
        currentRep
      };

      // Prepare email data
      const emailData = {
        customerName: fullName,
        customerEmail: email,
        customerPhone: phoneNumber,
        appointmentTitle: appointmentTitle || 'Meeting with ' + representativeDetails.name,
        repName: representativeDetails.name,
        repEmail: representativeDetails.email,
        bookingDate: bookingDate,
        bookingTime: selectedSlot.time,
        roomName: roomName,
        dayOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][selectedDate.getDay()],
        customerAddress: {
          street: address.street || '',
          city: address.city || '',
          state: address.state || '',
          zip: address.zip || '',
          country: address.country || ''
        }
      };
      
      // Show loading state and try to send email
      isEmailSending = true;
      const emailSuccess = await sendEmailNotifications(emailData);
      isEmailSending = false;
      
      if (emailSuccess) {
        // Email sent successfully, create the appointment
        await createAppointment();
      } else {
        // Email failed, show confirmation popup
        showEmailConfirmModal = true;
        emailErrorMessage = 'The server could not send the confirmation email.';
      }
    } catch (error) {
      isEmailSending = false;
      console.error('schedule console: Error in scheduling process:', error);
      toast.error('Failed to schedule the meeting. Please try again.');
    }
  }

  async function retryEmailSending() {
    if (!pendingAppointmentData) {
      toast.error('Missing appointment data for retry');
      showEmailConfirmModal = false;
      return;
    }
    
    // Prepare email data again
    const emailData = {
      customerName: fullName,
      customerEmail: email,
      customerPhone: phoneNumber,
      appointmentTitle: appointmentTitle || 'Meeting with ' + pendingAppointmentData.representativeDetails.name,
      repName: pendingAppointmentData.representativeDetails.name,
      repEmail: pendingAppointmentData.representativeDetails.email,
      bookingDate: pendingAppointmentData.bookingDate,
      bookingTime: selectedSlot.time,
      roomName: roomName,
      dayOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][selectedDate.getDay()],
      customerAddress: {
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        zip: address.zip || '',
        country: address.country || ''
      }
    };
    
    // Show loading state and try to send email again
    showEmailConfirmModal = false;
    isEmailSending = true;
    const emailSuccess = await sendEmailNotifications(emailData, 3); // Try harder with more retries
    isEmailSending = false;
    
    if (emailSuccess) {
      // Email sent successfully on retry, create the appointment
      await createAppointment();
    } else {
      // Email still failed, show confirmation popup again
      showEmailConfirmModal = true;
      emailErrorMessage = 'We still could not send the confirmation email after retrying.';
    }
  }

  async function completeAppointmentWithoutEmail() {
    if (!pendingAppointmentData) {
      toast.error('Missing appointment data');
      return;
    }
    
    try {
      // Create the appointment even without email confirmation
      await createAppointment();
      toast.warning('Appointment scheduled without email confirmation');
    } catch (error) {
      console.error('schedule console: Error creating appointment without email:', error);
      toast.error('Failed to schedule the appointment');
    }
  }

  async function createAppointment() {
    if (!pendingAppointmentData) {
      throw new Error('Missing appointment data');
    }
    
    const { scheduledMeetings, bookingDate, newMeeting, representativeDetails, currentRep } = pendingAppointmentData;
    
    // Add the new meeting to scheduled meetings
    scheduledMeetings[bookingDate].push(newMeeting);
    console.log('schedule console: Updated meetings for date:', scheduledMeetings[bookingDate]);

    const updateData = {
      scheduled_meetings: JSON.stringify(scheduledMeetings)
    };
    console.log('schedule console: Sending update data:', updateData);

    const updatedRep = await pb.collection('representatives')
      .update(representativeDetails.id, updateData);
    console.log('schedule console: Successfully updated meetings:', updatedRep);
    
    // Show confirmation toast
    showConfirmationToast(representativeDetails.name, bookingDate, selectedSlot.time, representativeDetails.location || 'Online');
    
    // Clear pending data and close the dialog
    pendingAppointmentData = null;
    dispatch('close');
  }

  async function sendEmailNotifications(data, maxRetries = 2) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        console.log('schedule console: Attempt', attempt + 1, 'sending email');
        
        // Create a copy of the data to avoid modifying the original
        const emailData = {
          ...data,
          appointmentTitle: data.appointmentTitle || 'Meeting with ' + data.repName,
          customerAddress: {
            street: data.customerAddress?.street || '',
            city: data.customerAddress?.city || '',
            state: data.customerAddress?.state || '',
            zip: data.customerAddress?.zip || '',
            country: data.customerAddress?.country || ''
          }
        };
        
        // Use the Brevo API endpoint
        const response = await fetch('/api/send-brevo-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailData)
        });
        
        // Get the full response text first to ensure we can handle any response format
        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          responseData = { text: responseText };
          console.error('Failed to parse response as JSON:', responseText);
        }
        
        if (!response.ok) {
          console.error('schedule console: Brevo API error:', response.status, responseData);
          
          if (attempt === maxRetries - 1) {
            toast.error(`Email service error: ${responseData.error || response.statusText}`);
            return false;
          }
        } else {
          if (responseData.success) {
            console.log('schedule console: Email sent successfully:', responseData);
            toast.success('Appointment confirmation email sent successfully');
            return true;
          } else {
            console.error('schedule console: Email sending failed:', responseData);
            if (attempt === maxRetries - 1) {
              toast.error(responseData.error || 'Failed to send email');
              return false;
            }
          }
        }
        
        // Wait before retrying
        attempt++;
        await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
      } catch (error) {
        console.error('schedule console: Error sending email (attempt ' + (attempt + 1) + '):', error);
        
        if (attempt === maxRetries - 1) {
          toast.error(`Network error: ${error.message}`);
          return false;
        }
        
        attempt++;
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
    
    return false;
  }

  // Helper function to extract participant name
  function getParticipantName(participant) {
    if (typeof participant === 'string') {
      const nameWithoutPrefix = participant.split('-').pop() || '';
      return nameWithoutPrefix.replace(/_+representative/g, '');
    } else if (participant && participant.streamId) {
      const nameWithoutPrefix = participant.streamId.split('-').pop() || '';
      return nameWithoutPrefix.replace(/_+representative/g, '');
    }
    return 'Unknown User';
  }

  function handleCancel() {
    dispatch('close'); // Dispatch close event to close the dialog
  }

  // Function to check if a date is in the past
  function isDateInPast(date) {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0); // Reset hours to start of day
    const selectedDate = new Date(date.year, date.month - 1, date.day);
    // Compare timestamps instead of Date vs number
    return selectedDate.getTime() < todayDate.getTime(); // Allow current day
  }

  function handleButtonClick() {
    console.log("Button clicked, isFormValid:", isFormValid);
    
    if (!isFormValid) {
      // Check which fields are missing and show appropriate errors with toast
      if (!firstName || !lastName) {
        toast.error('Please enter your full name (first and last name)');
      } else if (!email) {
        toast.error('Please enter your email address');
      } else if (!phoneNumber) {
        toast.error('Please enter your phone number');
      } else if (!selectedRepresentative) {
        toast.error('Please select a representative');
      } else if (!selectedDate) {
        toast.error('Please select a date');
      } else if (!selectedTimeSlot) {
        toast.error('Please select a time slot');
      }
    } else {
      handleSubmit();
    }
  }

  // Update the showConfirmationToast function to use the toast component
  function showConfirmationToast(repName, date, time, location) {
    // Format the date in a more readable way
    const readableDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    
    const title = appointmentTitle ? `"${appointmentTitle}"` : '';
    const message = `Your appointment ${title} with ${repName} is scheduled for ${readableDate} at ${time}. ${location ? `Location: ${location}` : ''}`;
    
    toast.success(message, {
      duration: 6000, // Show for 6 seconds
      position: 'top-center'
    });
  }

  // Add helper function to extract rep ID
  function getRepresentativeId(rep) {
    if (typeof rep === 'object' && rep.id) return rep.id;
    if (typeof rep === 'object' && rep.streamId) {
      // Try to parse ID from streamId
      const parts = rep.streamId.split('-');
      if (parts.length > 0 && parts[0].length > 0) return parts[0];
    }
    return null;
  }

  // Add function to check if a date has any bookings
  function hasBookings(date) {
    if (!representativeDetails || !representativeDetails.scheduled_meetings) return false;
    
    try {
      const scheduledMeetings = typeof representativeDetails.scheduled_meetings === 'string'
        ? JSON.parse(representativeDetails.scheduled_meetings)
        : representativeDetails.scheduled_meetings;
      
      const formattedDate = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
      
      return scheduledMeetings[formattedDate] && scheduledMeetings[formattedDate].length > 0;
    } catch (e) {
      console.error('Error checking bookings for date:', e);
      return false;
    }
  }
  
  // Add function to render custom date cell content
  function customDateCell(date) {
    const hasExistingBookings = hasBookings(date);
    return {
      hasBookings: hasExistingBookings
    };
  }

  // Function to round time to nearest hour
  function roundToHour(timeStr) {
    const [time, period] = timeStr.split(' ');
    const [hour, minute] = time.split(':').map(Number);
    
    // Round to nearest hour
    let roundedHour = minute >= 30 ? hour + 1 : hour;
    if (roundedHour === 0) roundedHour = 12;
    if (roundedHour > 12) roundedHour = roundedHour % 12;
    
    return `${roundedHour}:00 ${period}`;
  }

  // Function to format schedule with even hours
  function formatSchedule(schedule) {
    const formattedSchedule = {};
    
    for (const [day, timeRange] of Object.entries(schedule)) {
      if (!timeRange) {
        formattedSchedule[day] = "";
        continue;
      }
      
      const [start, end] = timeRange.split(' - ');
      const formattedStart = roundToHour(start);
      const formattedEnd = roundToHour(end);
      
      formattedSchedule[day] = `${formattedStart} - ${formattedEnd}`;
    }
    
    return formattedSchedule;
  }

  // Update the isTimeSlotBooked function to be more robust
  function isTimeSlotBooked(date, timeSlot, scheduledMeetings) {
    console.log('schedule console: Checking if slot is booked:', { date, timeSlot });
    
    const dateStr = date.toISOString().split('T')[0];
    if (!scheduledMeetings[dateStr]) return false;
    
    const normalizedTimeSlot = timeSlot.replace(/\s+/g, '').toUpperCase();
    
    return scheduledMeetings[dateStr].some(meeting => {
      if (!meeting.time) return false;
      const normalizedMeetingTime = meeting.time.replace(/\s+/g, '').toUpperCase();
      const isBooked = normalizedMeetingTime === normalizedTimeSlot;
      
      if (isBooked) {
        console.log('schedule console: Found booking match:', { timeSlot, meetingTime: meeting.time });
      }
      
      return isBooked;
    });
  }

  // Make sure the slot generation includes the available property
  function generateTimeSlots(startTime, endTime) {
    console.log('schedule console: Generating time slots between:', { startTime, endTime });
    const slots = [];
    const [startHour, startPeriod] = startTime.split(' ');
    const [endHour, endPeriod] = endTime.split(' ');
    
    let currentHour = parseInt(startHour.split(':')[0]);
    const startPM = startPeriod === 'PM' && currentHour !== 12;
    const endHourNum = parseInt(endHour.split(':')[0]) + (endPeriod === 'PM' && endHour.split(':')[0] !== '12' ? 12 : 0);
    
    // Convert to 24-hour for easier calculation
    let current24Hour = startPM ? currentHour + 12 : currentHour;
    if (startPeriod === 'AM' && currentHour === 12) current24Hour = 0;
    
    while (current24Hour < endHourNum) {
      const nextHour = current24Hour + 1;
      
      // Convert back to 12-hour for display
      const displayHour = current24Hour % 12 || 12;
      const displayNextHour = nextHour % 12 || 12;
      const currentPeriod = current24Hour >= 12 ? 'PM' : 'AM';
      const nextPeriod = nextHour >= 12 ? 'PM' : 'AM';
      
      slots.push({
        id: slots.length + 1,
        time: `${displayHour}:00 ${currentPeriod} - ${displayNextHour}:00 ${nextPeriod}`,
        available: true // This will be updated when checking against booked slots
      });
      
      current24Hour = nextHour;
    }
    
    return slots;
  }

  // Function to get available time slots for a specific date
  function getAvailableTimeSlots(date, schedule, scheduledMeetings) {
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    const daySchedule = schedule[dayOfWeek];
    
    if (!daySchedule) return []; // No availability for this day
    
    const [startTime, endTime] = daySchedule.split(' - ');
    const allTimeSlots = generateTimeSlots(startTime, endTime);
    
    // Filter out booked slots
    return allTimeSlots.filter(slot => !isTimeSlotBooked(date, slot.time, scheduledMeetings));
  }

  // Add these variables to your existing script section
  let isEmailSending = false;
  let showEmailConfirmModal = false;
  let emailErrorMessage = '';
  let pendingAppointmentData = null;
</script>


<div class="mx-auto p-4 max-h-[80vh] w-full overflow-y-auto">
  <div class="bg-white rounded-lg p-6">
    <div class="flex justify-between items-center mb-2">
      <h2 class="text-xl font-semibold text-[#464646]">Book an Appointment</h2>
      <button on:click={handleCancel} class="text-gray-500 hover:text-gray-700">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    <p class="text-sm text-gray-500 mb-6">Please fill out this form to make an appointment</p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left Column - Personal Info -->
      <div class="space-y-4">
        <form use:form on:submit|preventDefault={handleSubmit}>
          <!-- First Name / Last Name Row -->
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label for="firstName" class="block text-sm mb-1">First Name</label>
              <input
                id="firstName"
                name="firstName"
                placeholder="First Name"
                bind:value={firstName}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                use:validators={[required]}
              />
              <HintGroup for="firstName">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                  <Hint on="required"><HintValidate>First Name is required</HintValidate></Hint>
                </div>
              </HintGroup>
            </div>
            <div>
              <label for="lastName" class="block text-sm mb-1">Last Name</label>
              <input
                id="lastName"
                name="lastName"
                placeholder="Last Name"
                bind:value={lastName}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                use:validators={[required]}
              />
              <HintGroup for="lastName">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                  <Hint on="required"><HintValidate>Last Name is required</HintValidate></Hint>
                </div>
              </HintGroup>
            </div>
          </div>

          <!-- Phone Number -->
          <div class="mb-4">
            <label for="phoneNumber" class="block text-sm mb-1">Phone Number</label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              placeholder="Enter you Number"
              bind:value={phoneNumber}
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              use:validators={[required]}
            />
            <HintGroup for="phoneNumber">
              <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                <Hint on="required"><HintValidate>Phone Number is required</HintValidate></Hint>
              </div>
            </HintGroup>
          </div>

          <!-- Email Address -->
          <div class="mb-4">
            <label for="email" class="block text-sm mb-1">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="example@mail.com"
              bind:value={email}
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              use:validators={[required, emailValidator]}
            />
            <HintGroup for="email">
              <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                <Hint on="required"><HintValidate>Email is required</HintValidate></Hint>
                <Hint on="email" hideWhenRequired><HintValidate>Email is not valid</HintValidate></Hint>
              </div>
            </HintGroup>
          </div>

          <!-- Full Address -->
          <div class="mb-4">
            <label class="block text-sm mb-1">Full Address</label>
            <input
              placeholder="Street Address"
              bind:value={address.street}
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-2"
            />
            
            <div class="grid grid-cols-2 gap-4 mb-2">
              <input
                placeholder="City"
                bind:value={address.city}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="State"
                bind:value={address.state}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <input
                placeholder="Zip Code"
                bind:value={address.zip}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Country"
                bind:value={address.country}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </form>
      </div>

      <!-- Right Column - Schedule -->
      <div class="space-y-4">
         <!-- Representative Selection -->
         <div class="mb-4">
          <label class="block text-sm mb-1">Select Representative *</label>
          {#if availableRepresentatives.length > 0}
            <select 
              id="representative"
              name="representative"
              bind:value={selectedRepresentative}
              required
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              use:validators={[required]}
              on:change={() => {
                if (selectedDate) {
                  fetchAvailableSlots(selectedRepresentative, selectedDate);
                }
              }}
            >
              <option value={null}>Select a representative</option>
              {#each availableRepresentatives as rep}
                <option value={rep} data-id={rep.id || getRepresentativeId(rep)}>
                  {rep.name || getParticipantName(rep)}
                </option>
              {/each}
            </select>
            <HintGroup for="representative">
              <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                <Hint on="required"><HintValidate>Please select a representative</HintValidate></Hint>
              </div>
            </HintGroup>
          {:else}
            <p class="text-red-500 text-sm">No representatives currently available</p>
          {/if}
        </div>
        
        <!-- Date Selection -->
        <div class="mb-4">
          <div class="flex justify-between items-center mb-1">
            <label class="block text-sm">Select Time and Date</label>
            <label class="block text-sm">
              <input
                type="text"
                placeholder="Appointment Title"
                bind:value={appointmentTitle}
                class="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div class="relative">
            <button 
              type="button"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-left flex items-center"
              class:border-red-500={!selectedDate && formError}
              on:click={() => {
                calendarVisible = !calendarVisible;
              }}
            >
              <svg class="mr-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              {selectedDate ? selectedDate.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'}) : 'Select a date'}
            </button>
            
            {#if !selectedDate && formError}
              <div class="text-red-500 text-xs mt-1">Please select a date</div>
            {/if}
            
            {#if calendarVisible}
              <div class="absolute z-10 mt-1 bg-white border border-gray-300 rounded-md shadow-lg w-full">
                <Calendar 
                  bind:value 
                  class="rounded-md w-full" 
                  isDateDisabled={isDateDisabled}
                  renderDate={customDateCell}
                  on:datechange={() => {
                    selectedDate = new Date(value.year, value.month - 1, value.day);
                    calendarVisible = false;
                    // Fetch slots after date selection
                    if (selectedRepresentative) {
                      fetchAvailableSlots(selectedRepresentative, selectedDate);
                    }
                  }}
                />
              </div>
            {/if}
          </div>
        </div>

        <!-- Display selected date and time slots -->
        {#if selectedDate}
          <div class="mb-4">
            <p class="text-sm font-medium mb-2">
              {selectedDate.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'})}
            </p>
            
            <!-- Add debug info to see what's happening -->
            <p class="text-xs text-gray-500 mb-2">Available slots: {availableSlots.length}</p>
            
            {#if availableSlots.length > 0}
              <div class="grid grid-cols-3 gap-2 mb-3">
                {#each availableSlots.slice(0, 6) as slot, i}
                  <button 
                    type="button"
                    disabled={!slot.available}
                    class="p-2 border rounded-md text-center text-xs relative
                          {selectedTimeSlot === slot.id ? 'bg-primary/80 text-white' : ''} 
                          {!slot.available ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'hover:bg-gray-100'}"
                    on:click={() => {
                      selectedTimeSlot = slot.id;
                      selectedSlot = slot;
                      console.log('Selected time slot:', slot);
                    }}
                  >
                    {#if slot.time}
                      <!-- Parse and display the actual time -->
                      {@const [startTime, endTime] = slot.time.split(' - ')}
                      <div>{startTime}</div>
                      <div>to</div>
                      <div>{endTime}</div>
                    {:else}
                      <div>Unknown</div>
                      <div>Time</div>
                      <div>Slot</div>
                    {/if}
                    
                    {#if !slot.available}
                      <div class="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-80 rounded-md">
                        <span class="text-xs font-medium text-gray-600">Booked</span>
                      </div>
                    {/if}
                  </button>
                {/each}
              </div>
              
              {#if availableSlots.length > 6}
                <div class="grid grid-cols-3 gap-2">
                  {#each availableSlots.slice(6) as slot, i}
                    <button 
                      type="button"
                      disabled={!slot.available}
                      class="p-2 border rounded-md text-center text-xs relative
                            {selectedTimeSlot === slot.id ? 'bg-primary/80 text-white' : ''} 
                            {!slot.available ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'hover:bg-gray-100'}"
                      on:click={() => {
                        selectedTimeSlot = slot.id;
                        selectedSlot = slot;
                        console.log('Selected time slot:', slot);
                      }}
                    >
                      {#if slot.time}
                        <!-- Parse and display the actual time -->
                        {@const [startTime, endTime] = slot.time.split(' - ')}
                        <div>{startTime}</div>
                        <div>to</div>
                        <div>{endTime}</div>
                      {:else}
                        <div>Unknown</div>
                        <div>Time</div>
                        <div>Slot</div>
                      {/if}
                      
                      {#if !slot.available}
                        <div class="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-80 rounded-md">
                          <span class="text-xs font-medium text-gray-600">Booked</span>
                        </div>
                      {/if}
                    </button>
                  {/each}
                </div>
              {/if}
            {:else}
              <p class="text-red-500 text-sm">No available time slots for this date. Please select another date.</p>
            {/if}
          </div>
        {/if}

        <!-- Set Reminder -->
        <div class="mb-4">
          <button 
            type="button"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-left flex items-center"
          >
            <svg class="mr-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            Set Reminder
          </button>
        </div>
      </div>
    </div>

    <!-- Footer Buttons -->
    <div class="flex justify-end space-x-4 mt-6">
      <button 
        type="button"
        on:click={handleCancel}
        class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
      >
        CANCEL
      </button>
      <button 
        type="button"
        on:click={handleButtonClick}
        class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/80"
      >
        SCHEDULE EVENT
      </button>
    </div>
  </div>
</div>

<!-- Email loading/error modal -->
{#if isEmailSending}
<div class="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
  <div class="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
    <h3 class="text-lg font-semibold mb-4">Sending Email Confirmation</h3>
    <div class="flex items-center justify-center mb-4">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>
    <p class="text-center text-gray-600">Please wait while we send the confirmation emails...</p>
  </div>
</div>
{/if}

<!-- Email failure confirmation modal -->
{#if showEmailConfirmModal}
<div class="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
  <div class="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
    <h3 class="text-lg font-semibold mb-4 text-red-600">Email Confirmation Failed</h3>
    <p class="mb-4 text-gray-700">We were unable to send the confirmation email. {emailErrorMessage}</p>
    <p class="mb-2">The appointment can still be created, but no email confirmation will be sent.</p>
    <p class="mb-6 text-sm text-gray-500">Note: The recipient will need to be informed manually about this appointment.</p>
    
    <div class="flex justify-end space-x-3">
      <button 
        class="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
        on:click={() => {
          showEmailConfirmModal = false;
          pendingAppointmentData = null;
        }}
      >
        Cancel Appointment
      </button>
      <button 
        class="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
        on:click={() => {
          showEmailConfirmModal = false;
          completeAppointmentWithoutEmail();
        }}
      >
        Schedule Without Email
      </button>
      <button 
        class="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/80"
        on:click={retryEmailSending}
      >
        Retry Sending Email
      </button>
    </div>
  </div>
</div>
{/if}

<style>
  /* Add custom styling for calendar cells with bookings */
  :global(.calendar-cell-with-bookings) {
    position: relative;
  }
  
  :global(.calendar-cell-with-bookings::after) {
    content: "•";
    color: orange;
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 18px;
  }
  
  :global(.calendar-cell-disabled.calendar-cell-with-bookings::after) {
    content: "Booked";
    font-size: 10px;
    color: #666;
  }
</style>