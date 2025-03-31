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
    selectedDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
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
                  roomName && !roomNameError &&
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

  // Fix the fetchAvailableSlots function to correctly handle days with existing bookings
  async function fetchAvailableSlots(rep, date) {
    try {
      // Format date to YYYY-MM-DD
      const formattedDate = new Date(date).toISOString().split('T')[0];
      
      // First get the representative details to access their schedule
      if (!representativeDetails) {
        await fetchRepresentativeDetails(rep);
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
            console.log(`Schedule for ${dayName}: ${hours}`);
            
            // Check if the schedule is empty
            if (!hours || hours === "") {
              console.log(`No schedule for ${dayName}`);
              return; // No slots to generate
            }
            
            // Parse start and end times (format: "8:00AM - 5:00PM")
            const [startStr, endStr] = hours.split(' - ');
            
            if (startStr && endStr) {
              // Parse times to generate hourly slots
              const parseTime = (timeStr) => {
                const match = timeStr.match(/(\d+):(\d+)([AP]M)/);
                if (match) {
                  let [_, hours, minutes, ampm] = match;
                  hours = parseInt(hours);
                  if (ampm === 'PM' && hours < 12) hours += 12;
                  if (ampm === 'AM' && hours === 12) hours = 0;
                  return { hours, minutes: parseInt(minutes) };
                }
                return null;
              };
              
              const formatTime = (hours, minutes) => {
                let period = 'AM';
                let displayHours = hours;
                
                if (hours >= 12) {
                  period = 'PM';
                  if (hours > 12) {
                    displayHours = hours - 12;
                  }
                }
                
                if (displayHours === 0) {
                  displayHours = 12;
                }
                
                return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
              };
              
              const startTime = parseTime(startStr);
              const endTime = parseTime(endStr);
              
              if (startTime && endTime) {
                // Handle times that cross midnight
                let endTimeAdjusted = endTime.hours;
                if (endTime.hours < startTime.hours) {
                  endTimeAdjusted = endTime.hours + 24; // Add 24 hours if end time is next day
                }
                
                // Generate hourly slots from start time to end time 
                let slotId = 1;
                let currentHour = startTime.hours;
                let currentMinutes = startTime.minutes;
                
                // Get existing scheduled meetings for this date
                let existingMeetings = [];
                if (representativeDetails.scheduled_meetings) {
                  try {
                    const scheduledMeetings = typeof representativeDetails.scheduled_meetings === 'string'
                      ? JSON.parse(representativeDetails.scheduled_meetings)
                      : representativeDetails.scheduled_meetings;
                      
                    if (scheduledMeetings[formattedDate]) {
                      existingMeetings = scheduledMeetings[formattedDate];
                      console.log(`Found ${existingMeetings.length} existing meetings for ${formattedDate}:`, existingMeetings);
                    }
                  } catch (e) {
                    console.error('Error parsing scheduled meetings:', e);
                  }
                }
                
                // Fill in slots
                while ((currentHour < endTimeAdjusted) || 
                      (currentHour === endTimeAdjusted && currentMinutes < endTime.minutes)) {
                  
                  // Handle wrapping around midnight
                  let displayHour = currentHour;
                  if (displayHour >= 24) {
                    displayHour -= 24;
                  }
                  
                  const startTimeStr = formatTime(displayHour, currentMinutes);
                  
                  // Calculate end time for this slot (1 hour later)
                  let endHour = currentHour + 1;
                  let endMinutes = currentMinutes;
                  
                  // Handle wrapping for end time display
                  let displayEndHour = endHour;
                  if (displayEndHour >= 24) {
                    displayEndHour -= 24;
                  }
                  
                  const endTimeStr = formatTime(displayEndHour, endMinutes);
                  const timeSlot = `${startTimeStr} - ${endTimeStr}`;
                  
                  // Check if this SPECIFIC slot overlaps with any existing meetings
                  const isBooked = existingMeetings.some(meeting => {
                    // Direct match
                    if (meeting.time === timeSlot) {
                      return true;
                    }
                    
                    // Parse the meeting time to compare start times
                    if (meeting.time && meeting.time.includes(' - ')) {
                      try {
                        const meetingTimeStart = meeting.time.split(' - ')[0];
                        const meetingTimeStartParsed = parseTime(meetingTimeStart);
                        
                        if (meetingTimeStartParsed) {
                          // Compare start times
                          return meetingTimeStartParsed.hours === displayHour && 
                                 meetingTimeStartParsed.minutes === currentMinutes;
                        }
                      } catch (err) {
                        console.error('Error parsing meeting time:', err);
                      }
                    }
                    
                    return false;
                  });
                  
                  generatedSlots.push({
                    id: slotId++,
                    time: timeSlot,
                    startHour: displayHour,
                    startMinutes: currentMinutes,
                    endHour: displayEndHour,
                    endMinutes: endMinutes,
                    available: !isBooked
                  });
                  
                  // Move to next hour
                  currentHour++;
                }
              }
            }
          }
        } catch (error) {
          console.error('Error parsing schedule hours:', error);
        }
      }
      
      // Update available slots
      availableSlots = generatedSlots;
      console.log('Generated slots:', availableSlots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      availableSlots = [];
    }
  }

  async function handleSubmit() {
    // Clear previous error
    formError = '';
    
    // Detailed validation with specific error messages
    if (!firstName || !lastName) {
      formError = 'Please enter your full name (first and last name)';
      return;
    }
    
    if (!email) {
      formError = 'Please enter your email address';
      return;
    }
    
    if (!phoneNumber) {
      formError = 'Please enter your phone number';
      return;
    }
    
    if (!roomName) {
      formError = 'Please enter a room name';
      return;
    }
    
    if (!selectedRepresentative) {
      formError = 'Please select a representative';
      activeTab = 'schedule';
      return;
    }
    
    if (!selectedDate) {
      formError = 'Please select a date';
      activeTab = 'schedule';
      return;
    }
    
    if (!selectedTimeSlot) {
      formError = 'Please select a time slot';
      activeTab = 'schedule';
      return;
    }
    
    try {
      // Get the representative info including their email
      if (!representativeDetails) {
        await fetchRepresentativeDetails(selectedRepresentative);
      }
      
      // If we couldn't get representative details, show an error
      if (!representativeDetails) {
        formError = 'Could not find representative details. Please try again.';
        return;
      }
      
      const selectedSlot = availableSlots.find(slot => slot.id === selectedTimeSlot);
      const slotTime = selectedSlot ? selectedSlot.time : '';
      
      // Format the date for storing in the database
      const bookingDate = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = days[selectedDate.getDay()];
      
      // Create booking record
      const bookingData = {
        customer_name: fullName,
        customer_email: email,
        customer_phone: phoneNumber,
        representative: representativeDetails.id, // Reference to the representative
        booking_date: bookingDate,
        booking_time: slotTime,
        status: 'pending',
        notes: `Booking created from room session by ${fullName}`,
        room_name: roomName
      };
      
      console.log('Booking data to submit:', bookingData);
      
      // Update the representative's scheduled_meetings field
      try {
        // Get current scheduled meetings or initialize empty object
        let scheduledMeetings = {};
        if (representativeDetails.scheduled_meetings) {
          try {
            scheduledMeetings = typeof representativeDetails.scheduled_meetings === 'string' 
              ? JSON.parse(representativeDetails.scheduled_meetings) 
              : representativeDetails.scheduled_meetings;
          } catch (e) {
            console.error('Error parsing existing scheduled meetings:', e);
          }
        }
        
        // Create date key in format YYYY-MM-DD
        if (!scheduledMeetings[bookingDate]) {
          scheduledMeetings[bookingDate] = [];
        }
        
        // Add new meeting to this date
        scheduledMeetings[bookingDate].push({
          time: slotTime,
          customer_name: fullName,
          customer_email: email,
          customer_phone: phoneNumber,
          room_name: roomName
        });
        
        // Update the representative record with new scheduled meetings
        const updateData = {
          scheduled_meetings: JSON.stringify(scheduledMeetings)
        };
        
        console.log('Updating representative with scheduled meetings:', updateData);
        
        // Actually update the database
        if (pb && representativeDetails.id) {
          try {
            const updatedRep = await pb.collection('representatives')
              .update(representativeDetails.id, updateData);
            console.log('Representative record updated:', updatedRep);
          } catch (updateError) {
            console.error('Error updating representative record:', updateError);
            throw new Error('Failed to update representative schedule');
          }
        } else {
          throw new Error('Missing representative ID or database connection');
        }
      } catch (updateError) {
        console.error('Error updating representative scheduled meetings:', updateError);
        throw updateError;
      }
      
      // Send email notifications
      await sendEmailNotifications({
        customerName: fullName,
        customerEmail: email,
        customerPhone: phoneNumber,
        repName: representativeDetails.name,
        repEmail: representativeDetails.email,
        bookingDate: bookingDate,
        bookingTime: slotTime,
        roomName: roomName,
        dayOfWeek: dayOfWeek
      });
      
      // Show confirmation dialog with rep's info instead of alert
      showConfirmationToast(representativeDetails.name, bookingDate, slotTime, representativeDetails.location || 'Online');
      
      // Close the dialog
      dispatch('close');
    } catch (error) {
      console.error('Error submitting booking:', error);
      formError = 'There was an error scheduling your appointment. Please try again.';
      
      // Show error toast
      toast.error('There was an error scheduling your appointment. Please try again.');
    }
  }

  async function sendEmailNotifications(data) {
    try {
      // This would typically be a server API endpoint to handle email sending
      // const response = await fetch('/api/send-booking-notifications', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify(data)
      // });
      
      // For now, just log the data that would be sent
      console.log('Email notification data:', data);
      console.log('your email:', data.customerEmail)
      console.log('rep email:', data.repEmail)
      
      return true;
    } catch (error) {
      console.error('Error sending email notifications:', error);
      return false;
    }
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
      // Check which fields are missing and show appropriate errors
      if (!firstName || !lastName) {
        formError = 'Please enter your full name (first and last name)';
        activeTab = 'personal-info';
      } else if (!email) {
        formError = 'Please enter your email address';
        activeTab = 'personal-info';
      } else if (!phoneNumber) {
        formError = 'Please enter your phone number';
        activeTab = 'personal-info';
      } else if (!roomName) {
        formError = 'Please enter a room name';
        activeTab = 'personal-info';
      } else if (!selectedRepresentative) {
        formError = 'Please select a representative';
        activeTab = 'schedule';
      } else if (!selectedDate) {
        formError = 'Please select a date';
        activeTab = 'schedule';
      } else if (!selectedTimeSlot) {
        formError = 'Please select a time slot';
        activeTab = 'schedule';
      }
    } else {
      handleSubmit();
    }
  }

  // Add a function to show confirmation toast
  function showConfirmationToast(repName, date, time, location) {
    // Format the date in a more readable way
    const readableDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    
    toast.success(`Your appointment with ${repName} is scheduled for ${readableDate} at ${time}. ${location ? `Location: ${location}` : ''}`);
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
</script>


<div class="container mx-auto p-4 max-h-[80vh] overflow-y-auto">
  <div class="bg-white rounded-lg p-6">
    <h2 class="text-2xl font-semibold mb-4 text-[#464646]">Book an Appointment</h2>
    <p class="text-gray-400 mb-6">Please fill out this form to make an appointment</p>

    {#if formError}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {formError}
      </div>
    {/if}

    <Tabs.Root value={activeTab} class="w-full">
      <Tabs.List class="flex space-x-4 mb-6">
        <Tabs.Trigger value="personal-info" class="px-4 py-2 rounded">Personal Info</Tabs.Trigger>
        <Tabs.Trigger value="schedule" class="px-4 py-2 rounded">Schedule</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="personal-info">
        <form use:form on:submit|preventDefault={handleSubmit}>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div class="grid gap-2">
              <label for="firstName">First Name</label>
              <input
                id="firstName"
                name="firstName"
                placeholder="First Name"
                bind:value={firstName}
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                use:validators={[required]}
              />
              <HintGroup for="firstName">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                  <Hint on="required"><HintValidate>First Name is required</HintValidate></Hint>
                </div>
              </HintGroup>
            </div>
            <div class="grid gap-2">
              <label for="lastName">Last Name</label>
              <input
                id="lastName"
                name="lastName"
                placeholder="Last Name"
                bind:value={lastName}
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                use:validators={[required]}
              />
              <HintGroup for="lastName">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                  <Hint on="required"><HintValidate>Last Name is required</HintValidate></Hint>
                </div>
              </HintGroup>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div class="grid gap-2">
              <label for="phoneNumber">Phone Number</label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                placeholder="Phone Number"
                bind:value={phoneNumber}
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                use:validators={[required]}
              />
              <HintGroup for="phoneNumber">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                  <Hint on="required"><HintValidate>Phone Number is required</HintValidate></Hint>
                </div>
              </HintGroup>
            </div>
            <div class="grid gap-2">
              <label for="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Email Address"
                bind:value={email}
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                use:validators={[required, emailValidator]}
              />
              <HintGroup for="email">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                  <Hint on="required"><HintValidate>Email is required</HintValidate></Hint>
                  <Hint on="email" hideWhenRequired><HintValidate>Email is not valid</HintValidate></Hint>
                </div>
              </HintGroup>
            </div>
            <div class="grid gap-2">
              <label for="roomName">Room name</label>
              <input
                id="roomName"
                name="roomName"
                type="text"
                placeholder="Room Name"
                bind:value={roomName}
                on:input={handleRoomNameChange}
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                use:validators={[required]}
              />
              <HintGroup for="roomName">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                  <Hint on="required"><HintValidate>Room name is required</HintValidate></Hint>
                  {#if roomNameError}
                    <HintValidate>{roomNameError}</HintValidate>
                  {/if}
                </div>
              </HintGroup>
            </div>
          </div>
        </form>
      </Tabs.Content>

      <Tabs.Content value="schedule">
          <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-1">Select Representative *</label>
          {#if availableRepresentatives.length > 0}
            <select 
              bind:value={selectedRepresentative}
              required
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <option value={null}>Select a representative</option>
              {#each availableRepresentatives as rep}
                <option value={rep} data-id={rep.id || getRepresentativeId(rep)}>
                  {rep.name || getParticipantName(rep)}
                </option>
              {/each}
            </select>
          {:else}
            <p class="text-red-500">No representatives currently available</p>
          {/if}
          </div>

        <Card.Root class="mb-6">
          <Card.Header class="flex items-center">
            <h3 class="text-lg font-medium">Select Date</h3>
          </Card.Header>
          <Card.Content class="w-full">
            <Calendar 
              bind:value 
              class="rounded-md border w-full" 
              isDateDisabled={isDateDisabled}
              renderDate={customDateCell}
            />
          </Card.Content>
        </Card.Root>

        {#if availableSlots.length > 0}
        <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">Select a Time Slot *</label>
            <div class="grid grid-cols-3 gap-2">
              {#each availableSlots as slot}
                <button 
                  type="button"
                  disabled={!slot.available}
                  class="p-2 border rounded-md transition-colors relative
                        {selectedTimeSlot === slot.id ? 'bg-blue-500 text-white' : ''} 
                        {!slot.available ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'hover:bg-gray-100'}"
                  on:click={() => selectedTimeSlot = slot.id}
                >
                  {slot.time}
                  {#if !slot.available}
                    <div class="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-80 rounded-md">
                      <span class="text-xs font-medium text-gray-600">Booked</span>
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
        </div>
        {:else}
          <p class="text-red-500">No time slots available for this date</p>
        {/if}
      </Tabs.Content>
    </Tabs.Root>

    <div class="flex justify-end space-x-4 mt-6">
      <Button 
        on:click={() => handleCancel()} 
        variant="destructive"
      >
        Cancel
      </Button>
      <Button 
        on:click={handleButtonClick} 
        class="bg-primary text-white" 
      >
        Schedule Event
      </Button>
    </div>
  </div>
</div>

<style>
  .container {
    max-width: 800px;
  }

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