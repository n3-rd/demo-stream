<script lang="ts">
  import { Bell, Download, ClipboardCopy } from 'lucide-svelte';
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
	import { toast } from "svelte-sonner";
  import { onMount } from 'svelte';
  import { PUBLIC_SMTP_FROM, PUBLIC_BREVO_API_KEY } from '$env/static/public';
  import { page } from '$app/stores';
  
  export let userId = null;
  export let availableRepresentatives = [];

  // Filter representatives by the current user's company
  $: filteredRepresentatives = availableRepresentatives.filter(rep => 
    rep.company === $page.data?.user?.id && rep.is_active
  );

  let value = today(getLocalTimeZone());
  const dispatch = createEventDispatcher();

  // Form State
  let firstName = 'Test';
  let lastName = 'Test';
  let phoneNumber = '1234567890';
  let email = 'studioblopp@gmail.com';
  let address = { street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345', country: 'USA' };
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
  let additionalInformation = '';

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

  // Reactive statement to update available time slots and disable unavailable slots
  $: {
    if (selectedRepresentative && selectedDate) {
      console.log('Fetching available slots for:', { 
        representative: selectedRepresentative, 
        date: selectedDate 
      });
      
      // Reset time slot selection when representative or date changes
      selectedTimeSlot = null;
      selectedSlot = null;
      
      fetchAvailableSlots(selectedRepresentative, selectedDate);
    }
  }

  // Reactive statement to fetch representative details when selection changes
  $: {
    if (selectedRepresentative) {
      fetchRepresentativeDetails(selectedRepresentative);
    }
  }

  async function fetchRepresentativeDetails(rep) {
    if (!rep) return;
    
    try {
      console.log('Fetching details for representative:', rep);
      
      // If the rep is already the full representative object
      if (typeof rep === 'object' && rep.id) {
        console.log('Using direct representative object from selection:', rep);
        representativeDetails = rep;
        return;
      }
      
      // If rep has a direct ID, fetch from the API
      if (typeof rep === 'object' && rep.id) {
        try {
          const response = await fetch(`/api/representatives/${rep.id}`);
          if (response.ok) {
            const repData = await response.json();
            representativeDetails = repData.representative;
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
            const response = await fetch(`/api/representatives?name=${encodeURIComponent(cleanName)}`);
            if (response.ok) {
              const data = await response.json();
              if (data.representatives && data.representatives.length > 0) {
                representativeDetails = data.representatives[0];
                console.log('Found representative by name:', representativeDetails);
                return;
              }
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
            const response = await fetch(`/api/representatives?name=${encodeURIComponent(cleanName)}`);
            if (response.ok) {
              const data = await response.json();
              if (data.representatives && data.representatives.length > 0) {
                representativeDetails = data.representatives[0];
                console.log('Found representative by name:', representativeDetails);
                return;
              }
            }
          } catch (nameError) {
            console.error('Error finding representative by name:', nameError);
          }
        }
      }
      
      // As a fallback, if we've selected a representative from the dropdown, 
      // we can try to get all representatives and find a match
      console.log('Attempting fallback lookup for all representatives');
      try {
        const response = await fetch('/api/representatives');
        if (response.ok) {
          const data = await response.json();
          const allRepresentatives = data.representatives || [];
          console.log('All representatives:', allRepresentatives);
          
          if (allRepresentatives.length > 0) {
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
        }
      } catch (error) {
        console.error('Error fetching representatives:', error);
        representativeDetails = null;
      }
      
    } catch (error) {
      console.error('Error fetching representative details:', error);
      representativeDetails = null;
    }
  }

  // Update the isDateDisabled function to check properly
  function isDateDisabled(date) {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0); // Reset hours to start of day
    const selectedDate = new Date(Date.UTC(date.year, date.month - 1, date.day));
    
    // Check if selected date is in the past
    if (selectedDate.getTime() < todayDate.getTime()) {
      return true; // Disable past dates
    }
    
    // If it's today's date, apply additional time restrictions
    if (selectedDate.toDateString() === todayDate.toDateString()) {
      const currentTimeEST = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
      const currentHourEST = new Date(currentTimeEST).getHours();
      const currentMinutesEST = new Date(currentTimeEST).getMinutes();
      
      // Restrict times within one hour of the current time
      const oneHourAgo = new Date(currentTimeEST);
      oneHourAgo.setHours(currentHourEST - 1, currentMinutesEST, 0, 0);
      
      const selectedTime = new Date(Date.UTC(date.year, date.month - 1, date.day));
      selectedTime.setHours(currentHourEST, currentMinutesEST, 0, 0);
      
      if (selectedTime.getTime() < oneHourAgo.getTime()) {
        return true; // Disable times more than one hour in the past
      }
    }
    
    // Additional existing checks (representative's schedule)
    if (representativeDetails && representativeDetails.schedule) {
      try {
        const scheduleData = typeof representativeDetails.schedule === 'string' 
          ? JSON.parse(representativeDetails.schedule) 
          : representativeDetails.schedule;
        
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = days[selectedDate.getDay()];
        
        return !scheduleData[dayName] || scheduleData[dayName] === "";
      } catch (error) {
        console.error('Error parsing schedule data:', error);
        return false;
      }
    }
    
    return false;
  }

  // Generate time slots based on representative's schedule
  function generateTimeSlots(startTime, endTime) {
    console.log('schedule console: Generating time slots between:', { startTime, endTime });
    const slots = [];
    
    // Get current time in EST
    const currentTimeEST = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    const currentHourEST = new Date(currentTimeEST).getHours();
    const currentMinutesEST = new Date(currentTimeEST).getMinutes();
    
    // Parse start and end times
    const [startHour, startPeriod] = startTime.replace(/([AP]M)/, ' $1').split(' ');
    const [endHour, endPeriod] = endTime.replace(/([AP]M)/, ' $1').split(' ');
    
    // Convert to 24-hour format
    let currentHour = parseInt(startHour.split(':')[0]);
    const startPM = startPeriod === 'PM' && currentHour !== 12;
    const endHourNum = parseInt(endHour.split(':')[0]) + (endPeriod === 'PM' && endHour.split(':')[0] !== '12' ? 12 : 0);
    
    // Convert to 24-hour for easier calculation
    let current24Hour = startPM ? currentHour + 12 : currentHour;
    if (startPeriod === 'AM' && currentHour === 12) current24Hour = 0;
    
    // Adjust start time for today to respect one-hour window
    const oneHourAgo = currentHourEST - 1;
    if (current24Hour < oneHourAgo) {
      current24Hour = oneHourAgo;
    }
    
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
        available: true
      });
      
      current24Hour = nextHour;
    }
    
    return slots;
  }

  // Update the fetchAvailableSlots function to use the representative's schedule
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
          try {
            const response = await fetch(`/api/representatives/${repId}`);
            if (response.ok) {
              const repData = await response.json();
              representativeDetails = repData.representative;
              console.log('schedule console: Fetched fresh representative details:', representativeDetails);
            }
          } catch (error) {
            console.error('Error fetching representative details:', error);
          }
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
          
          // If this day exists in the schedule and has hours
          if (scheduleData[dayName] && scheduleData[dayName] !== "") {
            const hours = scheduleData[dayName];
            console.log(`schedule console: Schedule for ${dayName}: ${hours}`);
            
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
              // Generate the time slots based on the schedule
              generatedSlots = generateTimeSlots(startStr, endStr);
                
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

  // Add these variables to your existing script section
  let isEmailSending = false;
  let showEmailConfirmModal = false;
  let emailErrorMessage = '';
  let pendingAppointmentData = null;
  let showAppointmentConfirmation = false;
  let appointmentDetails = null;

  // Add state for success confirmation dialog
  let showSuccessConfirmation = false;
  let createdRoomId = '';
  let createdRoomUrl = '';

  // Add this to your script section at the top
  let showConfirmationPopup = false;
  let roomUrl = ""; // This will store the meeting URL

  // Update handleSubmit to show confirmation first
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
      try {
        const response = await fetch(`/api/representatives/${representativeDetails.id}`);
        if (response.ok) {
          const repData = await response.json();
          const currentRep = repData.representative;
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
            additional_information: additionalInformation || '',
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
          
          // Show the confirmation dialog first
          const urlParams = new URLSearchParams(window.location.search);
          const uid = urlParams.get('uid') || generateUniqueRoomId();
          const roomId = roomName || generateUniqueRoomId();

          // Store the roomId for consistent usage
          pendingAppointmentData.roomId = roomId;
          pendingAppointmentData.uid = uid;

          // Use the same domain in both places
          const domain = window.location.hostname === 'localhost' ? 'https://viewroom.ca' : window.location.origin;
          const roomUrl = `${domain}/room/${roomId}?uid=${uid}`;

          appointmentDetails = {
            date: selectedDate.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'}),
            time: selectedSlot.time,
            representativeName: representativeDetails.name,
            location: representativeDetails.location || 'Online',
            roomUrl: roomUrl
          };
          showAppointmentConfirmation = true;
        }
      } catch (error) {
        console.error('Error fetching representative details:', error);
        toast.error('Failed to fetch representative details. Please try again.');
        return;
      }
      
    } catch (error) {
      console.error('schedule console: Error in scheduling process:', error);
      toast.error('Failed to schedule the meeting. Please try again.');
    }
  }
  
  // Update the confirmAppointment function to properly include the UID in the room URL
  function confirmAppointment() {
    showAppointmentConfirmation = false;
    
    // Use the same roomId that was shown in the confirmation
    const roomId = pendingAppointmentData.roomId || roomName || generateUniqueRoomId();
    const uid = pendingAppointmentData.uid || new URLSearchParams(window.location.search).get('uid') || generateUniqueRoomId();
    
    // Use the same domain for consistency
    const domain = window.location.hostname === 'localhost' ? 'https://viewroom.ca' : window.location.origin;
    const roomUrl = `${domain}/room/${roomId}?uid=${uid}`;
    
    // Prepare email data
    const emailData = {
      customerName: fullName,
      customerEmail: email,
      customerPhone: phoneNumber,
      appointmentTitle: appointmentTitle || 'Meeting with ' + pendingAppointmentData.representativeDetails.name,
      repName: pendingAppointmentData.representativeDetails.name,
      repEmail: pendingAppointmentData.representativeDetails.email,
      bookingDate: pendingAppointmentData.bookingDate,
      bookingTime: selectedSlot.time,
      roomName: roomId,
      roomUrl: roomUrl,  // Now uses consistent URL
      dayOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][selectedDate.getDay()],
      additionalInformation: additionalInformation || 'No additional information provided.',
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
    sendEmailNotifications(emailData)
      .then(emailSuccess => {
        isEmailSending = false;
        
        if (emailSuccess) {
          // Email sent successfully, create the appointment
          return createAppointment();
        } else {
          // Email failed, show confirmation popup
          showEmailConfirmModal = true;
          emailErrorMessage = 'The server could not send the confirmation email.';
        }
      })
      .catch(error => {
        isEmailSending = false;
        console.error('schedule console: Error in email sending process:', error);
        showEmailConfirmModal = true;
        emailErrorMessage = 'The server could not send the confirmation email.';
      });
  }

  // Also update the retryEmailSending function to use the same URL format
  async function retryEmailSending() {
    if (!pendingAppointmentData) {
      toast.error('Missing appointment data for retry');
      showEmailConfirmModal = false;
      return;
    }
    
    // Use the same roomId and uid that was used in confirmation
    const roomId = pendingAppointmentData.roomId || roomName || generateUniqueRoomId();
    const uid = pendingAppointmentData.uid || new URLSearchParams(window.location.search).get('uid') || generateUniqueRoomId();
    
    // Use consistent domain
    const domain = window.location.hostname === 'localhost' ? 'https://viewroom.ca' : window.location.origin;
    const roomUrl = `${domain}/room/${roomId}?uid=${uid}`;
    
    const emailData = {
      customerName: fullName,
      customerEmail: email,
      customerPhone: phoneNumber,
      appointmentTitle: appointmentTitle || 'Meeting with ' + pendingAppointmentData.representativeDetails.name,
      repName: pendingAppointmentData.representativeDetails.name,
      repEmail: pendingAppointmentData.representativeDetails.email,
      bookingDate: pendingAppointmentData.bookingDate,
      bookingTime: selectedSlot.time,
      roomName: roomId,
      roomUrl: roomUrl,
      dayOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][selectedDate.getDay()],
      additionalInformation: additionalInformation || 'No additional information provided.',
      customerAddress: {
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        zip: address.zip || '',
        country: address.country || ''
      }
    };
    
    // Prepare email payload for Brevo API
    const emailPayload = {
      sender: {
        name: emailData.repName || "Meeting Scheduler",
        email: PUBLIC_SMTP_FROM
      },
      to: [
        {
          email: emailData.customerEmail,
          name: emailData.customerName
        }
      ],
      cc: [
        {
          email: emailData.repEmail,
          name: emailData.repName
        }
      ],
      subject: `Appointment Confirmation: ${emailData.appointmentTitle || 'Meeting Scheduled'}`,
      htmlContent: `
        <html>
          <body>
            <h2>Appointment Confirmation</h2>
            <p>Dear ${emailData.customerName},</p>
            <p>Your appointment has been scheduled with ${emailData.repName}.</p>
            <p>Date: ${emailData.bookingDate}</p>
            <p>Time: ${emailData.bookingTime}</p>
            <p>Room Link: <a href="${emailData.roomUrl}">${emailData.roomUrl}</a></p>
            <p>Additional Information: ${emailData.additionalInformation || 'None'}</p>
          </body>
        </html>
      `,
      tags: ["appointment", "booking"]
    };
    
    // Show loading state and try to send email again
    showEmailConfirmModal = false;
    isEmailSending = true;
    
    try {
      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': PUBLIC_BREVO_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      });
      
      const responseText = await resp.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { text: responseText };
        console.error('Failed to parse response as JSON:', responseText);
      }
      
      isEmailSending = false;
      
      if (!resp.ok) {
        console.error('Brevo API error:', resp.status, responseData);
        showEmailConfirmModal = true;
        emailErrorMessage = 'We still could not send the confirmation email after retrying.';
        return false;
      } else {
        // Email sent successfully, create the appointment
        await createAppointment();
        return true;
      }
    } catch (error) {
      console.error('Error in email sending process:', error);
      isEmailSending = false;
      showEmailConfirmModal = true;
      emailErrorMessage = 'We still could not send the confirmation email after retrying.';
      return false;
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
    
    try {
      // First update the representative's scheduled meetings
      scheduledMeetings[bookingDate].push(newMeeting);
      console.log('schedule console: Updated meetings for date:', scheduledMeetings[bookingDate]);

      const updateData = {
        scheduled_meetings: JSON.stringify(scheduledMeetings)
      };
// rep meetings should be updated in the database
      
      // Create a unique room ID if not provided
      const roomId = pendingAppointmentData.roomId || roomName || generateUniqueRoomId();
      const uid = pendingAppointmentData.uid || new URLSearchParams(window.location.search).get('uid') || generateUniqueRoomId();
      
      // Construct the room URL with uid parameter
      const domain = window.location.hostname === 'localhost' ? 'https://viewroom.ca' : window.location.origin;
      const roomUrl = `${domain}/room/${roomId}?uid=${uid}`;
      
      // Parse the time slot properly
      const timeSlotParts = selectedSlot.time.split(' - ')[0].trim().split(' ');
      const timePart = timeSlotParts[0];
      const amPm = timeSlotParts[1];
      
      // Create a proper date object for the schedule time
      const scheduleDate = new Date(bookingDate);
      const [hours, minutes] = timePart.split(':').map(Number);
      let hour = hours;
      
      // Convert to 24-hour format
      if (amPm.toLowerCase() === 'pm' && hour < 12) {
        hour += 12;
      } else if (amPm.toLowerCase() === 'am' && hour === 12) {
        hour = 0;
      }
      
      scheduleDate.setHours(hour, minutes, 0, 0);
      
      // Format as ISO string for the API
      const scheduleTimeIso = scheduleDate.toISOString();
      console.log('Formatted schedule time:', scheduleTimeIso);
      
      // Create proper scheduled room data structure
      const scheduledRoomData = {
        title: appointmentTitle || `Meeting with ${representativeDetails.name}`,
        representative_ids: [representativeDetails.id], // Array of representative IDs
        schedule_time: scheduleTimeIso,
        customer_name: fullName,
        customer_email: email,
        customer_phone: phoneNumber,
        room_id: roomId,
        additional_information: additionalInformation || '',
        meeting_duration: 60, // Default to 60 minutes
        join_before_minutes: 15 // Allow joining 15 minutes before
      };

      // For debugging - log the final scheduled room data    
      console.log('Creating scheduled room record:', scheduledRoomData);
      
      // Create the scheduled room using the new API
      try {
        const response = await fetch('/api/schedule-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scheduledRoomData)
        });
        
        if (response.ok) {
          const scheduledRoom = await response.json();
          console.log('Successfully created scheduled room record:', scheduledRoom);
          
          // Add the scheduled room ID to the confirmation data
          if (scheduledRoom.scheduled_room && scheduledRoom.scheduled_room.id) {
            pendingAppointmentData.scheduledRoomId = scheduledRoom.scheduled_room.id;
            
            // Set variables for the success dialog
            createdRoomId = roomId;
            createdRoomUrl = roomUrl;
            
            // Show confirmation popup
            showConfirmationPopup = true;
            
            // REDIRECT OPTION: After confirmation is closed, user will be redirected to waiting room
            // This code can be triggered when the confirmation is closed if preferred
            setTimeout(() => {
              // In a real implementation, you would use a proper navigation method
              // window.location.href = roomUrl;
              // Or if you're using SvelteKit:
              // import { goto } from '$app/navigation';
              // goto(roomUrl);
            }, 5000); // Optional delay before redirect
          }
        } else {
          const errorData = await response.json();
          console.error('Error creating scheduled room record:', errorData);
          
          // Show detailed error message
          if (errorData.error) {
            toast.error(`Failed to create meeting record: ${errorData.error}`);
          } else {
            toast.error(`Failed to create meeting record: ${response.statusText}`);
          }
        }
      } catch (scheduledRoomError) {
        console.error('Error creating scheduled room record:', scheduledRoomError);
        toast.error(`Failed to create meeting record: ${scheduledRoomError.message}`);
      }
      
      // Show confirmation popup
      showConfirmationToast(representativeDetails.name, bookingDate, newMeeting.time, representativeDetails.location || 'Online', roomId);
      
      return roomId;
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to schedule the meeting. Please try again.');
      throw error;
    }
  }

  // Helper function to generate a unique room ID
  function generateUniqueRoomId() {
    // Generate a random string of 10 characters (alphanumeric)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Format the date and time for PocketBase
  function formatScheduleDateTime(date, timeSlot) {
    // Example timeSlot: "9:00 AM - 10:00 AM"
    const [startTime] = timeSlot.split(' - ');
    const [hourStr, minutePeriod] = startTime.split(':');
    const [minuteStr, period] = minutePeriod.split(' ');
    
    let hour = parseInt(hourStr);
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    
    // Parse the date string (format: YYYY-MM-DD)
    const [year, month, day] = date.split('-').map(Number);
    
    // Create a UTC date object
    const dateObj = new Date(Date.UTC(year, month - 1, day, hour, parseInt(minuteStr)));
    
    // Return ISO string
    return dateObj.toISOString();
  }

  async function sendEmailNotifications(data, maxRetries = 2) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        console.log('schedule console: Attempt', attempt + 1, 'sending email');
        
        // Prepare email payload for Brevo API
        const emailPayload = {
          sender: {
            name: data.repName || "Meeting Scheduler",
            email: PUBLIC_SMTP_FROM
          },
          to: [
            {
              email: data.customerEmail,
              name: data.customerName
            }
          ],
          cc: [
            {
              email: data.repEmail,
              name: data.repName
            }
          ],
          subject: `Appointment Confirmation: ${data.appointmentTitle || 'Meeting Scheduled'}`,
          htmlContent: `
            <html>
              <body>
                <h2>Appointment Confirmation</h2>
                <p>Dear ${data.customerName},</p>
                <p>Your appointment has been scheduled with ${data.repName}.</p>
                <p>Date: ${data.bookingDate}</p>
                <p>Time: ${data.bookingTime}</p>
                <p>Room Link: <a href="${data.roomUrl}">${data.roomUrl}</a></p>
                <p>Additional Information: ${data.additionalInformation || 'None'}</p>
              </body>
            </html>
          `,
          tags: ["appointment", "booking"]
        };
        
        // Use the Brevo API endpoint directly
        const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': PUBLIC_BREVO_API_KEY,
            'content-type': 'application/json'
          },
          body: JSON.stringify(emailPayload)
        });
        
        // Get the full response text first to ensure we can handle any response format
        const responseText = await resp.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          responseData = { text: responseText };
          console.error('Failed to parse response as JSON:', responseText);
        }
        
        if (!resp.ok) {
          console.error('schedule console: Brevo API error:', resp.status, responseData);
          
          if (attempt === maxRetries - 1) {
            toast.error(`Email service error: ${responseData.error || resp.statusText}`);
            return false;
          }
        } else {
          console.log('schedule console: Email sent successfully:', responseData);
          toast.success('Appointment confirmation email sent successfully');
          return true;
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
  function getParticipantName(participant: any) {
    if (typeof participant === 'string') {
      const nameWithoutPrefix = participant.split('-').pop() || '';
      return nameWithoutPrefix.replace(/_+representative/g, '');
    } else if (participant && typeof participant === 'object' && 'streamId' in participant) {
      const nameWithoutPrefix = (participant.streamId as string).split('-').pop() || '';
      return nameWithoutPrefix.replace(/_+representative/g, '');
    }
    return 'Unknown User';
  }

  function handleCancel() {
    dispatch('close'); // Dispatch close event to close the dialog
    
    // Also directly close/reset state if parent doesn't handle event
    calendarVisible = false;
    pendingAppointmentData = null;
    showEmailConfirmModal = false;
    showAppointmentConfirmation = false;
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

  // Update the showConfirmationToast function to include uid in the URL
  function showConfirmationToast(repName, date, time, location, roomId) {
    // Format the date in a more readable way
    const readableDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    
    // Get unique ID from URL or generate one
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get('uid') || generateUniqueRoomId();
    
    // Set values for the confirmation popup with complete URL including uid
    roomUrl = `${origin}/room/${roomId}?uid=${uid}`;
    
    // Store the appointment details for the popup
    pendingAppointmentData = {
      ...pendingAppointmentData,
      bookingDate: date,
      formattedDate: readableDate,
      representativeName: repName,
      timeSlot: time,
      roomId: roomId,
      uid: uid
    };
    
    // Show the confirmation popup
    showConfirmationPopup = true;
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
  function formatSchedule(schedule: Record<string, string | null>) {
    const formattedSchedule: Record<string, string> = {};
    
    for (const [day, timeRange] of Object.entries(schedule)) {
      if (!timeRange) {
        formattedSchedule[day] = "";
        continue;
      }
      
      // Add type guard to ensure timeRange is a string
      if (typeof timeRange === 'string' && timeRange.includes(' - ')) {
        const [start, end] = timeRange.split(' - ');
        const formattedStart = roundToHour(start);
        const formattedEnd = roundToHour(end);
        
        formattedSchedule[day] = `${formattedStart} - ${formattedEnd}`;
      } else {
        // Handle cases where timeRange is not a string or doesn't contain ' - '
        formattedSchedule[day] = "";
      }
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

  // Add this function to your script section
  function generateICSFile(roomId) {
    if (!selectedDate || !selectedSlot || !representativeDetails) {
      toast.error('Please complete scheduling your appointment first');
      return;
    }
    
    // Construct the room URL
    const origin = window.location.origin;
    const roomUrl = `${origin}/room/${roomId}`;
    
    // Parse the time slot
    const [startTimeStr, endTimeStr] = selectedSlot.time.split(' - ');
    
    // Create start and end date objects
    const startDate = new Date(selectedDate);
    const endDate = new Date(selectedDate);
    
    // Parse start time
    const [startHour, startMinPeriod] = startTimeStr.split(':');
    const [startMin, startPeriod] = startMinPeriod.split(' ');
    let startHour24 = parseInt(startHour);
    if (startPeriod === 'PM' && startHour24 < 12) startHour24 += 12;
    if (startPeriod === 'AM' && startHour24 === 12) startHour24 = 0;
    
    startDate.setHours(startHour24, parseInt(startMin) || 0, 0);
    
    // Parse end time
    const [endHour, endMinPeriod] = endTimeStr.split(':');
    const [endMin, endPeriod] = endMinPeriod.split(' ');
    let endHour24 = parseInt(endHour);
    if (endPeriod === 'PM' && endHour24 < 12) endHour24 += 12;
    if (endPeriod === 'AM' && endHour24 === 12) endHour24 = 0;
    
    endDate.setHours(endHour24, parseInt(endMin) || 0, 0);
    
    // Format dates for ICS
    const formatDateForICS = (date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };
    
    const title = appointmentTitle || `Meeting with ${representativeDetails.name}`;
    const location = representativeDetails.location || 'Online';
    const description = `Appointment with ${representativeDetails.name}.\nContact: ${phoneNumber}\nRoom Link: ${roomUrl}\n\nAdditional Information: ${additionalInformation || 'None provided.'}\n\nJoin the meeting at the scheduled time using the link above.`;
    
    // Create ICS content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DTSTART:${formatDateForICS(startDate)}`,
      `DTEND:${formatDateForICS(endDate)}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
      'STATUS:CONFIRMED',
      `ORGANIZER;CN=${representativeDetails.name}:mailto:${representativeDetails.email || 'noreply@example.com'}`,
      `ATTENDEE;CN=${fullName}:mailto:${email}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    // Create and download the file
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Calendar file with meeting link downloaded successfully');
  }

  // Helper functions for formatting
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  function formatTimeRange(timeRange) {
    // If timeRange is already formatted, return it
    if (typeof timeRange === 'string') {
      return timeRange;
    }
    // Handle other formats as needed
    return timeRange;
  }

  // Reactive statement to filter and sort time slots
  $: sortedAvailableSlots = availableSlots
    .filter(slot => slot.available)
    .sort((a, b) => {
      // Convert time to 24-hour format for accurate sorting
      const parseTime = (timeStr) => {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        
        // Adjust hours for 12-hour format
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return hours * 60 + minutes;
      };
      
      return parseTime(a.time) - parseTime(b.time);
    });

  // Improved time slot selection logic
  function selectTimeSlot(slot) {
    // If the slot is already selected, deselect it
    if (selectedTimeSlot === slot.id) {
      selectedTimeSlot = null;
      selectedSlot = null;
    } else {
      // Only select if the slot is available
      if (slot.available) {
        selectedTimeSlot = slot.id;
        selectedSlot = slot;
        
        // Optional: Scroll to the selected slot if it's out of view
        const slotElement = document.getElementById(`time-slot-${slot.id}`);
        if (slotElement) {
          slotElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      } else {
        toast.warning('This time slot is not available.');
      }
    }
    
    // Log the selection for debugging
    console.log('Time slot selected:', {
      selectedSlot,
      availableSlots
    });
  }

  // Enhanced time slot rendering with more information
  function renderTimeSlotClass(slot) {
    let baseClasses = 'w-full p-3 border rounded-md text-center text-sm relative transition-colors duration-150';
    
    if (selectedTimeSlot === slot.id) {
      return `${baseClasses} time-slot-selected bg-primary text-white border-primary`;
    }
    
    if (!slot.available) {
      return `${baseClasses} bg-gray-100 text-gray-400 cursor-not-allowed opacity-50`;
    }
    
    return `${baseClasses} hover:bg-gray-50 hover:border-primary border-gray-300`;
  }
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
          {#if filteredRepresentatives.length > 0}
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
              {#each filteredRepresentatives as rep}
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
            <p class="text-red-500 text-sm">No representatives currently available for your company</p>
          {/if}
        </div>

        <!-- Date and Appointment Title -->
        <div class="mb-4">
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm">Select Time and Date</label>
            <div>
              <input
                type="text"
                placeholder="Appointment Title"
                bind:value={appointmentTitle}
                class="rounded-md border border-gray-300 px-3 py-2 text-sm w-[180px]"
              />
            </div>
          </div>

          <!-- Selected Date Display -->
          {#if selectedDate}
            <p class="text-sm font-medium mb-4">
              {selectedDate.toLocaleDateString('en-US', {weekday: 'short', month: 'long', day: 'numeric', year: 'numeric'})}
            </p>
          {/if}

          <div class="flex calender-and-time-slots">
              <!-- Calendar UI -->
          <div class="relative mb-4 w-1/2">
            <div class="calendar-container bg-white rounded-md shadow-sm border border-gray-200">
              {#key representativeDetails?.id || 'no-rep'}
              <Calendar 
                bind:value 
                class="rounded-md w-full" 
                isDateDisabled={isDateDisabled}
                on:keydown={() => {
                  console.log('Calendar keydown event triggered');
                  selectedDate = new Date(value.year, value.month - 1, value.day);
                  
                  // Fetch slots after date selection
                  if (selectedRepresentative) {
                    fetchAvailableSlots(selectedRepresentative, selectedDate);
                  }
                }}
              />
              {/key}
            </div>
          </div>

          <!-- Time Slots Section -->
          {#if selectedDate && availableSlots.length > 0}
            <div class="time-slots-container w-1/2">
              <div class="flex justify-between items-center mb-2">
                <p class="text-sm font-medium">
                  {#if sortedAvailableSlots.length > 0}
                    Available time slots: {sortedAvailableSlots.length} / {availableSlots.length}
                  {:else}
                    No available time slots
                  {/if}
                </p>
                {#if selectedTimeSlot}
                  <button 
                    class="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                    on:click={() => {
                      selectedTimeSlot = null;
                      selectedSlot = null;
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Clear selection
                  </button>
                {/if}
              </div>
              
              <div class="time-slots-grid">
                <!-- Time slots as vertical list -->
                <div class="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                  {#each availableSlots.sort((a, b) => {
                    // Convert time to 24-hour format for accurate sorting
                    const parseTime = (timeStr) => {
                      const [time, period] = timeStr.split(' ');
                      let [hours, minutes] = time.split(':').map(Number);
                      
                      // Adjust hours for 12-hour format
                      if (period === 'PM' && hours !== 12) hours += 12;
                      if (period === 'AM' && hours === 12) hours = 0;
                      
                      return hours * 60 + minutes;
                    };
                    
                    return parseTime(a.time) - parseTime(b.time);
                  }) as slot, i}
                    <button 
                      type="button"
                      id={`time-slot-${slot.id}`}
                      disabled={!slot.available}
                      class={renderTimeSlotClass(slot)}
                      on:click={() => {
                        selectTimeSlot(slot);
                      }}
                    >
                      {slot.time}
                      
                      {#if !slot.available}
                        <div class="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-80 rounded-md">
                          <span class="text-xs font-medium text-gray-500">Booked</span>
                        </div>
                      {/if}
                    </button>
                  {/each}
                </div>
              </div>
            </div>
          {:else if selectedDate}
            <div class="w-1/2 flex items-center justify-center text-center p-4  rounded-md">
              <p class="text-yellow-800 text-sm">
                {#if !selectedRepresentative}
                  Please select a representative first.
                {:else}
                  No available time slots for this date. 
                  Try selecting a different date or representative.
                {/if}
              </p>
            </div>
          {/if}
        </div>
          </div>
        

        <!-- Set Reminder -->
        <div class="mt-4 mb-4">
          <button 
            type="button"
            class="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
          >
            <Bell size={16} />
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
        on:click={() => {
          console.log("Schedule event clicked, isFormValid:", isFormValid);
          
          if (!isFormValid) {
            // Show validation errors
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
            // Skip handleButtonClick and go straight to showing confirmation
            handleSubmit();
          }
        }} 
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

<!-- Appointment confirmation modal -->
{#if showAppointmentConfirmation && appointmentDetails}
<div class="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
  <div class="bg-white p-6 rounded-lg shadow-lg max-w-3xl w-full">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left Column - Meeting Details -->
      <div class="border-r pr-6">
        <div class="flex items-center mb-4">
          <button on:click={() => { showAppointmentConfirmation = false; }} class="text-primary hover:text-primary/80 mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
        </div>
        
        {#if representativeDetails}
        <div class="flex items-center mb-5">
          <div class="mr-3 w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {#if representativeDetails.avatar}
              <img 
                src={`/api/files/${representativeDetails.collectionId || 'representatives'}/${representativeDetails.id}/${representativeDetails.avatar}`} 
                alt="{representativeDetails.name}'s Avatar" 
                class="w-full h-full object-cover object-center"
              />
            {:else}
              <img 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(representativeDetails.name)}&background=random`} 
                alt="{representativeDetails.name}'s Avatar" 
                class="w-full h-full object-cover object-center"
              />
            {/if}
          </div>
          <div>
            <p class="font-medium">{representativeDetails.name || "Representative"}</p>
          </div>
        </div>
        {/if}
        
        <h2 class="text-xl font-bold mb-5">{appointmentTitle || "60 minute meeting"}</h2>
        
        <div class="space-y-4">
          <div class="flex items-start">
            <div class="mr-3 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div>
              <p class="text-sm text-gray-700">60 min</p>
            </div>
          </div>
          
          <!-- Virtual meeting info with room link -->
          <div class="flex items-start">
            <div class="mr-3 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            </div>
            <div>
              <p class="text-sm text-gray-700">
                Virtual meeting
                <br />
                <span class="text-primary break-all text-xs">{appointmentDetails.roomUrl || `${origin}/${roomName}`}</span>
              </p>
            </div>
          </div>
          
          <div class="flex items-start">
            <div class="mr-3 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
            <div>
              <p class="text-sm text-gray-700">{appointmentDetails.time}</p>
              <p class="text-sm text-gray-700">{appointmentDetails.date}</p>
            </div>
          </div>
          
          <div class="flex items-start">
            <div class="mr-3 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            </div>
            <div>
              <p class="text-sm text-gray-700">Eastern Time - US & Canada</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Right Column - Confirmation Details -->
      <div class="pl-2">
        <h3 class="text-lg font-semibold mb-4">Confirm Appointment</h3>
        
        <div class="space-y-4 mb-6">
          <div>
            <label class="block text-sm mb-1">Email</label>
            <div class="py-2 px-3 border border-gray-300 rounded-md bg-gray-50">
              {email}
            </div>
          </div>
          
          <div>
            <label class="block text-sm mb-1">Additional Information</label>
            <textarea 
              placeholder="Please share anything that will help prepare for our meeting." 
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm h-24"
              bind:value={additionalInformation}
            ></textarea>
          </div>
        </div>
        
        <div class="text-xs text-gray-500 mb-4">
          By proceeding, you confirm that you have read and agree to our 
          <a href="#" class="text-primary">Terms of Use</a> and 
          <a href="#" class="text-primary">Privacy Notice</a>.
        </div>
        
        <button 
          class="w-full py-2 bg-primary text-white rounded-md hover:bg-primary/80 font-medium"
          on:click={confirmAppointment}
        >
          Schedule Event
        </button>
      </div>
    </div>
  </div>
</div>
{/if}

<!-- Success confirmation dialog -->
{#if showSuccessConfirmation}
<div class="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
  <div class="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
    <div class="mb-4 flex items-center justify-between text-[#464646]">
      <h2 class="text-lg font-semibold">Appointment Scheduled</h2>
      <button on:click={() => { showSuccessConfirmation = false; }} class="text-gray-500 hover:text-gray-700">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    
    <p class="text-sm text-gray-600 mb-4">
      Your appointment has been successfully scheduled. Please save the meeting link to join at the scheduled time.
    </p>
    
    <!-- Link Input -->
    <div class="mb-4">
      <label class="mb-2 block text-sm text-gray-700">
        Meeting Link
      </label>
      <div class="flex items-center rounded-lg bg-gray-100 p-2 w-full">
        <input
          type="text"
          value={createdRoomUrl}
          class="flex-1 border-none bg-transparent text-gray-700 outline-none text-sm overflow-x-auto"
          readonly
        />
        <Button
          class="ml-2 shrink-0"
          on:click={() => {
            navigator.clipboard.writeText(createdRoomUrl);
            toast.success('Link copied to clipboard');
          }}
        >
          <ClipboardCopy size={16} />
        </Button>
      </div>
      <p class="text-xs text-gray-500 mt-1">Share this link with participants to join the meeting</p>
    </div>
    
    <div class="flex justify-between mt-6">
      <Button
        variant="outline"
        on:click={() => {
          generateICSFile(createdRoomId);
        }}
      >
        <Download size={16} class="mr-2" />
        Download Calendar
      </Button>
      
      <Button
        on:click={() => {
          showSuccessConfirmation = false;
        }}
      >
        Done
      </Button>
    </div>
  </div>
</div>
{/if}

<!-- Replace the existing showConfirmationPopup dialog -->
{#if showConfirmationPopup && pendingAppointmentData}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-[400px] max-w-full shadow-xl">
      <h2 class="text-xl font-semibold mb-4">Appointment Confirmation</h2>
      
      <div class="space-y-2 mb-5">
        <p class="font-medium">DATE: {pendingAppointmentData.formattedDate || formatDate(pendingAppointmentData.bookingDate)}</p>
        <p>Time Slot: {selectedSlot?.time || pendingAppointmentData.timeSlot}</p>
        <p>Representative Name: {pendingAppointmentData.representativeName || representativeDetails?.name || 'Representative'}</p>
        {#if pendingAppointmentData.location}
          <p>Location: {pendingAppointmentData.location}</p>
        {/if}
      </div>
      
      <!-- Add the room link section -->
      <div class="mt-3 mb-5 pt-3 border-t border-gray-200">
        <p class="text-sm font-medium mb-2">Room Link:</p>
        <a href={roomUrl} target="_blank" class="text-primary underline text-sm break-all">{roomUrl}</a>
        <Button
          class="ml-2 shrink-0"
          on:click={() => {
            navigator.clipboard.writeText(roomUrl);
            toast.success('Link copied to clipboard');
          }}
        >
          <ClipboardCopy size={16} />
        </Button>
      </div>
      
      <div class="flex justify-between items-center pt-3 border-t border-gray-200">
        <button 
          class="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
          on:click={() => {
            showConfirmationPopup = false;
            dispatch('close');
          }}
        >
          Close
        </button>
        
        <!-- Add this new button for immediate entry to the waiting room -->
        <button 
          class="bg-primary text-white px-4 py-2 rounded hover:bg-primary/80"
          on:click={() => {
            showConfirmationPopup = false;
            // Redirect to the room URL with the correct parameters
            window.location.href = roomUrl;
          }}
        >
          Go to Waiting Room
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
  
  /* New styles for time slots */
  .time-slots-container {
    background-color: #f9f9f9;
    border-radius: 0.5rem;
    padding: 1rem;
  }
  
  .time-slots-grid {
    display: flex;
    flex-direction: column;
  }
  
  /* Style for selected time slot */
  :global(.time-slot-selected) {
    background-color: #577AB7 !important;
    color: white !important;
    border-color: #577AB7 !important;
    font-weight: 500;
    box-shadow: 0 2px 4px rgba(87, 122, 183, 0.3);
  }
  
  :global(.time-slot-selected:hover) {
    background-color: #4a6aa3 !important;
    border-color: #4a6aa3 !important;
  }
</style>