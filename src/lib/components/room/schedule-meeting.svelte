<script lang="ts">
  import { run, preventDefault } from 'svelte/legacy';

  import { ArrowLeft, Clock, MapPin, Globe } from 'lucide-svelte';
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
  import { page } from '$app/stores';
  
  interface Props {
    userId?: any;
    availableRepresentatives?: any;
    roomData?: any; // Optional room data to filter representatives
  }

  let { userId = null, availableRepresentatives = [], roomData = null }: Props = $props();


  
  const MEETING_DURATION = '30 minutes';
  const TIME_ZONE_LABEL = 'Eastern time - US & Canada';
  
  

  let value = $state(today(getLocalTimeZone()));
  const dispatch = createEventDispatcher();

  // Form State
  let firstName = $state('');
  let lastName = $state('');
  let phoneNumber = $state('');
  let email = $state('');
  let address = $state({ street: '', city: '', state: '', zip: '', country: '' });
  let selectedDay = $state(value.day);
  let selectedMonth = $state(value.month);
  let selectedYear = $state(value.year);
  let roomName = ''; // This will be used for the room name
  let roomNameError: string = '';
  let selectedRepresentative = $state(null);
  let selectedDate = $state(null);
  let selectedTimeSlot = $state(null);
  let availableSlots = $state([]);
  let representativeDetails = $state(null);
  let formError = '';
  let activeTab = 'personal-info';
  let selectedSlot = $state(null);
  let calendarVisible = false;
  let appointmentTitle = '';
  let additionalInformation = $state('');

  
  


  const form = useForm();


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


  let lastFetchedKey = $state(''); // rep id + date string to avoid clearing selection on re-runs



  async function fetchRepresentativeDetails(rep) {
    if (!rep) return;
    
    try {
      
      // If the rep is already the full representative object
      if (typeof rep === 'object' && rep.id) {
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
          
          // Try to find by name first
          try {
            const response = await fetch(`/api/representatives?name=${encodeURIComponent(cleanName)}`);
            if (response.ok) {
              const data = await response.json();
              if (data.representatives && data.representatives.length > 0) {
                representativeDetails = data.representatives[0];
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
          
          // Try to find by name first
          try {
            const response = await fetch(`/api/representatives?name=${encodeURIComponent(cleanName)}`);
            if (response.ok) {
              const data = await response.json();
              if (data.representatives && data.representatives.length > 0) {
                representativeDetails = data.representatives[0];
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
      try {
        const response = await fetch('/api/representatives');
        if (response.ok) {
          const data = await response.json();
          const allRepresentatives = data.representatives || [];
          
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
                return;
              }
            }
            
            // If all else fails, just use the first representative
            // You might want to remove this in production and show an error instead
            representativeDetails = allRepresentatives[0];
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
    todayDate.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date.year, date.month - 1, date.day);
    selectedDate.setHours(0, 0, 0, 0);
    
    // 1. Hide past dates
    if (selectedDate.getTime() < todayDate.getTime()) {
      return true;
    }
    
    // 2. Check representative's schedule
    if (representativeDetails && representativeDetails.schedule) {
      try {
        const scheduleData = typeof representativeDetails.schedule === 'string' 
          ? JSON.parse(representativeDetails.schedule) 
          : representativeDetails.schedule;
        
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = days[selectedDate.getDay()];
        
        const daySchedule = scheduleData[dayName];
        if (!daySchedule || daySchedule === "") {
          return true; // No hours scheduled for this day
        }

        // 3. Hide fully booked dates
        // If we have access to already booked slots, we could check if all slots are taken
        // But since this runs synchronously for the calendar, we'll check the representative's 
        // scheduled_meetings property if it's available.
        if (representativeDetails.scheduled_meetings) {
           const formattedDate = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
           const meetings = typeof representativeDetails.scheduled_meetings === 'string'
             ? JSON.parse(representativeDetails.scheduled_meetings)
             : representativeDetails.scheduled_meetings;
           
           if (meetings && meetings[formattedDate]) {
             // If we have many meetings for this date, let's see if we should consider it full
             // For now, let's keep it simple: if there's a record for this date and we want to be safe, 
             // but ideally we'd compare count of meetings vs count of possible slots.
             // We'll leave it simple for now to avoid over-blocking.
           }
        }
      } catch (error) {
        console.error('Error parsing schedule data:', error);
      }
    }
    
    return false;
  }

  // Generate time slots based on representative's schedule
  function generateTimeSlots(startTime, endTime, dateForSlots = null) {
    const slots = [];
    
    // Get current time in EST - multiple approaches for debugging
    const nowUTC = new Date();
    
    // Method 1: Direct timezone offset calculation
    const nowEST = new Date(nowUTC.getTime() + (nowUTC.getTimezoneOffset() * 60000) + (-5 * 3600000)); // EST is UTC-5
    
    // Method 2: Intl API approach
    const estOptions = { timeZone: 'America/New_York', hour12: false };
    const estString = nowUTC.toLocaleString('en-US', estOptions);
    const [estDate, estTime] = estString.split(', ');
    const [estHour, estMinute] = estTime.split(':').map(Number);
    

    
    // Use the Intl API result as it's more reliable
    const currentHourEST = estHour;
    const currentMinutesEST = estMinute;
    
    // Check if the slot date is today in EST
    let isToday = false;
    if (dateForSlots) {
      // Get current date/time in EST using a more direct approach
      const nowUTC = new Date();
      const todayInESTStr = nowUTC.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
      const slotDateInESTStr = dateForSlots.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
      
      // Simple string comparison should work for same-day check
      isToday = todayInESTStr === slotDateInESTStr;
      
      
      
      // Alternative approach: Extract date components directly from the selected date
      // Since selectedDate is created from calendar selection (year: 2025, month: 8, day: 25)
      // Let's also try comparing with current EST date components
      const estDateComponents = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      }).formatToParts(nowUTC);
      
      const currentESTYear = parseInt(estDateComponents.find(p => p.type === 'year').value);
      const currentESTMonth = parseInt(estDateComponents.find(p => p.type === 'month').value);
      const currentESTDay = parseInt(estDateComponents.find(p => p.type === 'day').value);
      
      // Also try using the selected date's UTC components
      const selectedYear = dateForSlots.getUTCFullYear();
      const selectedMonth = dateForSlots.getUTCMonth() + 1; // Convert to 1-based
      const selectedDay = dateForSlots.getUTCDate();
      
      const isToday2 = (currentESTYear === selectedYear && currentESTMonth === selectedMonth && currentESTDay === selectedDay);
      
      
      
      // Use either method if they detect today
      isToday = isToday || isToday2;
    }
    
    // Parse start and end times
    const [startHourStr, startPeriod] = startTime.replace(/([AP]M)/, ' $1').split(' ');
    const [endHourStr, endPeriod] = endTime.replace(/([AP]M)/, ' $1').split(' ');
    
    // Convert to 24-hour format
    const startHourArr = startHourStr.split(':');
    let scheduleStartHour = parseInt(startHourArr[0]);
    if (startPeriod === 'PM' && scheduleStartHour !== 12) scheduleStartHour += 12;
    if (startPeriod === 'AM' && scheduleStartHour === 12) scheduleStartHour = 0;

    const endHourArr = endHourStr.split(':');
    let scheduleEndHour = parseInt(endHourArr[0]);
    if (endPeriod === 'PM' && scheduleEndHour !== 12) scheduleEndHour += 12;
    if (endPeriod === 'AM' && scheduleEndHour === 12) scheduleEndHour = 0;
    
    // Generate all slots first, then filter
    const allSlots = [];
    let currentHour = scheduleStartHour;
    
    while (currentHour < scheduleEndHour) {
      const nextHour = currentHour + 1;
      
      // Convert back to 12-hour for display
      const displayHour = currentHour % 12 || 12;
      const displayNextHour = nextHour % 12 || 12;
      const currentPeriod = currentHour >= 12 ? 'PM' : 'AM';
      const nextPeriod = nextHour >= 12 ? 'PM' : 'AM';
      
      const timeSlot = `${displayHour}:00 ${currentPeriod} - ${displayNextHour}:00 ${nextPeriod}`;
      
      allSlots.push({
        id: allSlots.length + 1,
        time: timeSlot,
        startHour: currentHour,
        available: true
      });
      
      currentHour = nextHour;
    }
    
    // Now filter for today if applicable
    return allSlots.map(slot => {
      if (!isToday) return slot;
      
      // If today, mark as unavailable if the slot has already passed or is too close
      if (slot.startHour <= currentHourEST) {
        return { ...slot, available: false };
      }
      return slot;
    });
  }

  // Update the fetchAvailableSlots function to use the representative's schedule
  async function fetchAvailableSlots(rep, date) {
    
    try {
      // Format date to YYYY-MM-DD
      // Format date to YYYY-MM-DD using local time to avoid timezone shifts
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      
      // First get the representative details to access their schedule
      if (!representativeDetails) {
        // Fetch fresh data to make sure we have the latest representative details
        const repId = typeof rep === 'object' && rep.id ? rep.id : null;
        if (repId) {
          try {
            const response = await fetch(`/api/representatives/${repId}`);
            if (response.ok) {
              const repData = await response.json();
              representativeDetails = repData.representative;
              
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
              // Generate the time slots based on the schedule, passing the date for time filtering
              generatedSlots = generateTimeSlots(startStr, endStr, date);
              
              // Get actual scheduled rooms for this representative and date
              const repId = representativeDetails.id;
              let actualScheduledRooms = [];
              
              try {
                const scheduledResponse = await fetch(`/api/schedule-room?representative_id=${repId}&date=${formattedDate}`);
                if (scheduledResponse.ok) {
                  const scheduledData = await scheduledResponse.json();
                  actualScheduledRooms = scheduledData.scheduled_rooms || [];
               
                }
              } catch (error) {
                console.error('Error fetching scheduled rooms:', error);
              }
              
              // Also check legacy scheduled_meetings format for backward compatibility
              let legacyScheduledMeetings = {};
              if (representativeDetails.scheduled_meetings) {
                try {
                  legacyScheduledMeetings = typeof representativeDetails.scheduled_meetings === 'string'
                    ? JSON.parse(representativeDetails.scheduled_meetings)
                    : representativeDetails.scheduled_meetings;
                  
                } catch (e) {
                  console.error('Error parsing legacy scheduled meetings:', e);
                  legacyScheduledMeetings = {};
                }
              }
                
              // Mark slots as booked if they're already scheduled
              for (const slot of generatedSlots) {
                // Check both actual scheduled rooms and legacy format
                const isBookedInActualRooms = checkTimeSlotBookedInScheduledRooms(slot.time, actualScheduledRooms);
                const isBookedInLegacy = checkTimeSlotBooked(formattedDate, slot.time, legacyScheduledMeetings);
                const isBooked = isBookedInActualRooms || isBookedInLegacy;
                
                slot.available = !isBooked;
              }
            }
          }
        } catch (error) {
          console.error('schedule console: Error parsing schedule hours:', error);
        }
      }
      
      // Update available slots
      availableSlots = generatedSlots;
    } catch (error) {
      console.error('Error fetching available slots:', error);
      availableSlots = [];
    }
  }

  // Function to check if a time slot is booked in actual scheduled rooms
  function checkTimeSlotBookedInScheduledRooms(timeSlot, scheduledRooms) {
    if (!scheduledRooms || !scheduledRooms.length) {
      return false;
    }
    
    
    for (const room of scheduledRooms) {
      if (!room.scheduleTime) continue;
      
      // Parse the schedule time to get the hour and create time slot format
      const scheduleDate = new Date(room.scheduleTime);
      const hours = scheduleDate.getHours();
      const minutes = scheduleDate.getMinutes();
      
      // Convert to 12-hour format to match time slot format
      let displayHour = hours % 12 || 12;
      const period = hours >= 12 ? 'PM' : 'AM';
      const nextHour = ((hours + 1) % 12) || 12;
      const nextPeriod = (hours + 1) >= 12 ? 'PM' : 'AM';
      
      // Create the time slot format: "9:00 AM - 10:00 AM"
      const roomTimeSlot = `${displayHour}:00 ${period} - ${nextHour}:00 ${nextPeriod}`;
      
      // Normalize both time slots for comparison
      const normalizedTimeSlot = timeSlot.replace(/\s+/g, '').toUpperCase();
      const normalizedRoomTimeSlot = roomTimeSlot.replace(/\s+/g, '').toUpperCase();
      
      
      if (normalizedTimeSlot === normalizedRoomTimeSlot) {
        return true;
      }
    }
    
    return false;
  }

  // Improved function to check if a time slot is booked (legacy format)
  function checkTimeSlotBooked(dateStr, timeSlot, scheduledMeetings) {
    if (!scheduledMeetings || !scheduledMeetings[dateStr] || !scheduledMeetings[dateStr].length) {
      return false;
    }
    
    // Clean up the time slot format (remove all whitespace and make uppercase)
    const normalizedTimeSlot = timeSlot.replace(/\s+/g, '').toUpperCase();
    
    
    // Check each existing meeting on this date
    for (const meeting of scheduledMeetings[dateStr]) {
      if (!meeting || !meeting.time) continue;
      
      // Normalize meeting time format
      const normalizedMeetingTime = meeting.time.replace(/\s+/g, '').toUpperCase();
      
      
      if (normalizedTimeSlot === normalizedMeetingTime) {
        return true;
      }
    }
    
    return false;
  }

  // Add these variables to your existing script section
  let isEmailSending = $state(false);
  let showEmailConfirmModal = $state(false);
  let emailErrorMessage = $state('');
  let pendingAppointmentData = $state(null);
  let showAppointmentConfirmation = false;
  let appointmentDetails = null;

  // Add state for success confirmation dialog
  let showSuccessConfirmation = $state(false);
  let createdRoomId = '';
  let createdRoomUrl = '';

  // Add this to your script section at the top
  let showConfirmationPopup = false;
  let roomUrl = ""; // This will store the meeting URL

  // Update handleSubmit to show confirmation first
  async function handleSubmit() {
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
      try {
        const response = await fetch(`/api/representatives/${representativeDetails.id}`);
        if (response.ok) {
          const repData = await response.json();
          const currentRep = repData.representative;
          
          // Parse existing meetings
          let scheduledMeetings = {};
          if (currentRep.scheduled_meetings) {
            try {
              scheduledMeetings = typeof currentRep.scheduled_meetings === 'string' 
                ? JSON.parse(currentRep.scheduled_meetings) 
                : { ...currentRep.scheduled_meetings };
            } catch (e) {
              console.error('schedule console: Error parsing existing meetings:', e);
            }
          }

          const bookingDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;

          if (!scheduledMeetings[bookingDate]) {
            scheduledMeetings[bookingDate] = [];
          }

          // Make sure we have a selected slot
          if (!selectedSlot) {
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

          await confirmAppointment();
        }
      } catch (error) {
        console.error('Error fetching representative details:', error);
        toast.error('Failed to fetch representative details. Please try again.');
        return;
      }
      
    } catch (error) {
      console.error('Error in scheduling process:', error);
      toast.error('Failed to schedule the meeting. Please try again.');
    }
  }
  
  // Update the confirmAppointment function to properly include the UID in the room URL
  async function confirmAppointment() {
    if (!pendingAppointmentData) {
      toast.error('Missing appointment data for confirmation');
      return;
    }
    
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
      roomUrl: roomUrl, // Now uses consistent URL
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
    
    try {
    isEmailSending = true;
      const emailSuccess = await sendEmailNotifications(emailData);
        isEmailSending = false;
        
        if (emailSuccess) {
        await createAppointment();
        } else {
          showEmailConfirmModal = true;
          emailErrorMessage = 'The server could not send the confirmation email.';
        }
    } catch (error) {
        isEmailSending = false;
        console.error('schedule console: Error in email sending process:', error);
        showEmailConfirmModal = true;
        emailErrorMessage = 'The server could not send the confirmation email.';
    }
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
    
    // Use the server-side email endpoint to avoid exposing API keys client-side
    showEmailConfirmModal = false;
    isEmailSending = true;
    
    try {
      const resp = await fetch('/api/send-brevo-email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json'
        },
        body: JSON.stringify(emailData)
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
      
      // Create a proper date object for the schedule time in local time
      const [year, month, day] = bookingDate.split('-').map(Number);
      const scheduleDate = new Date(year, month - 1, day);
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
      console.log('Formatted schedule time (ISO):', scheduleTimeIso);
      console.log('Scheduled Room URL:', roomUrl);
      
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
            createdRoomId = roomId;
            createdRoomUrl = roomUrl;
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
      
      showSuccessConfirmation = true;
      currentStep = 1;
      selectedTimeSlot = null;
      selectedSlot = null;
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
        
        // Use the server-side email endpoint to avoid exposing API keys client-side
        const resp = await fetch('/api/send-brevo-email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json'
          },
          body: JSON.stringify(data)
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
    dispatch('close');
    currentStep = 1;
    selectedTimeSlot = null;
    selectedSlot = null;
    lastFetchedKey = '';
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
    showSuccessConfirmation = true;
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
    const allTimeSlots = generateTimeSlots(startTime, endTime, date);
    
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
  }
    

  let currentStep = $state(1);



  function handleBack() {
    if (currentStep === 1) {
      handleCancel();
    } else {
      currentStep = Math.max(1, currentStep - 1);
    }
  }

  async function handleNextStep() {
    if (currentStep === 1) {
      if (!selectedRepresentative) {
        toast.error('Please select a representative');
        return;
      }
      if (!selectedDate) {
        toast.error('Please select a date');
        return;
      }
      currentStep = 2;
      return;
    }

    if (currentStep === 2) {
      if (!selectedTimeSlot) {
        toast.error('Please select a time slot');
        return;
      }
      currentStep = 3;
      return;
    }

    await handleSubmit();
  }

  async function confirmBooking() {}
  // Get company ID from page data for filtering
  let companyId = $derived($page.data?.user?.id || $page.data?.owner_company || roomData?.owner_company);
  // Filter representatives by the current user's company
  // Only filter if we have a companyId, otherwise show all passed representatives
  let filteredRepresentatives = $derived(companyId 
      ? availableRepresentatives.filter(rep => rep.company === companyId || rep.company === String(companyId))
      : availableRepresentatives);
  let hostDisplayName = $derived(roomData?.title ?? 'Name of Host');
  let repDisplayName = $derived(representativeDetails?.name 
      ?? (typeof selectedRepresentative === 'object' && selectedRepresentative?.name)
      ?? 'Select a representative');
  let representativeAvatarUrl = $derived(representativeDetails?.avatar
      ? `/api/files/${representativeDetails.collectionId || 'representatives'}/${representativeDetails.id}/${representativeDetails.avatar}`
      : null);
  let representativeLocation = $derived(representativeDetails?.expand?.location?.name
      ?? representativeDetails?.location
      ?? 'Location to be confirmed');
  let representativeAddress = $derived(representativeDetails?.expand?.location?.address
      ?? representativeDetails?.address
      ?? '');
  // Reactive statement to update selectedDay, selectedMonth, and selectedYear when value changes
  run(() => {
    selectedDay = value.day;
    selectedMonth = value.month;
    selectedYear = value.year;
    
    // Convert to date object for the scheduling (local midnight to avoid timezone day-of-week shifts)
    selectedDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
    
  });
  let selectedDateFormatted = $derived(selectedDate
      ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : '');
  // Sync fullName with firstName + lastName 
  let fullName = $derived(`${firstName} ${lastName}`.trim());
  // Sync phone with phoneNumber
  let phone = $derived(phoneNumber);
  // Reactive statement to update available time slots and disable unavailable slots
  run(() => {
    if (selectedRepresentative && selectedDate) {
      const repId = typeof selectedRepresentative === 'object' && selectedRepresentative?.id != null
        ? String(selectedRepresentative.id)
        : '';
      const dateKey = selectedDate.toISOString ? selectedDate.toISOString().slice(0, 10) : '';
      const key = `${repId}-${dateKey}`;
      if (key !== lastFetchedKey) {
        lastFetchedKey = key;
        selectedTimeSlot = null;
        selectedSlot = null;
        fetchAvailableSlots(selectedRepresentative, selectedDate);
      }
    }
  });
  // Reactive statement to check if all required fields are filled
  let isFormValid = $derived(firstName && lastName && phoneNumber && email && 
                  selectedRepresentative && selectedDate && selectedTimeSlot);
  // Reactive statement to fetch representative details when selection changes
  run(() => {
    if (selectedRepresentative) {
      fetchRepresentativeDetails(selectedRepresentative);
    }
  });
  // Reactive statement to properly sort and process time slots for display
  let processedSlots = $derived([...availableSlots].sort((a, b) => {
    const parseTime = (timeStr) => {
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + (minutes || 0);
    };
    return parseTime(a.time) - parseTime(b.time);
  }));
  // Log the selection for debugging
  run(() => {
    if (selectedTimeSlot) {
      console.log('Time slot selected:', {
        selectedTimeSlot,
        selectedSlot
      });
    }
  });
  let canAdvance = $derived(currentStep === 1
      ? Boolean(selectedRepresentative && selectedDate)
      : currentStep === 2
        ? Boolean(selectedTimeSlot)
        : Boolean(isFormValid));
  let primaryActionLabel = $derived(currentStep === 3 ? 'Book an Appointment' : 'Continue');
</script>


<div class="max-h-[80vh] w-[90vw] overflow-y-auto bg-bgdefault md:bg-transparent">
  <div class="mx-auto w-full space-y-6 px-4 py-6">
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow"
        onclick={handleBack}
        aria-label="Go back"
      >
        <ArrowLeft size={18} />
      </button>
      <h1 class="text-xl font-semibold text-white md:text-[#1f2933]">Book Appointment</h1>
      </div>

    <form class="space-y-6" use:form onsubmit={preventDefault(handleSubmit)}>
      <section class="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
           <p class="text-xs font-semibold uppercase text-primary">Book Appointment for "{hostDisplayName}"</p>
           <div class="mt-4 flex items-center gap-4">
             <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[#e2e8f0] bg-[#f1f5f9]">
               {#if representativeAvatarUrl}
                 <img src={representativeAvatarUrl} alt={repDisplayName} class="h-full w-full object-cover" />
               {:else}
                 <span class="text-base font-semibold text-primary">{repDisplayName?.charAt(0)}</span>
               {/if}
             </div>
             <div class="text-sm text-[#475569]">
               <div class="font-semibold text-[#1f2933]">{repDisplayName}</div>
               <div class="mt-1 flex items-center gap-2 text-xs text-[#63718c]">
                 <Clock size={14} /> {MEETING_DURATION}
               </div>
               <div class="mt-1 flex items-center gap-2 text-xs text-[#63718c]">
                 <MapPin size={14} /> {representativeLocation}
               </div>
               {#if representativeAddress}
                 <p class="mt-1 text-xs text-[#94a3b8]">{representativeAddress}</p>
               {/if}
             </div>
           </div>
         </section>

      {#if currentStep === 1}
        <section class="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm space-y-5">
            <div>
            <label class="block text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Representative</label>
            {#if filteredRepresentatives.length > 0}
              <select
                id="representative"
                name="representative"
                bind:value={selectedRepresentative}
                class="mt-2 w-full rounded-xl border border-[#d4dae7] bg-[#f8fafc] px-3 py-2 text-sm text-[#1f2933]"
                use:validators={[required]}
                onchange={() => {
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
            {:else}
              <p class="mt-2 text-sm text-red-500">No representatives currently available.</p>
            {/if}
          </div>

          <div>
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-[#1f2933]">Select a Date</h3>
              <p class="text-xs text-[#64748b]">{selectedDateFormatted || 'Choose a date'}</p>
            </div>
            <div class="mt-3 rounded-2xl border border-[#e2e8f0] bg-white p-2 shadow-sm">
              {#key representativeDetails?.id || 'no-rep'}
                <Calendar
                  bind:value
                  class="w-full rounded-xl"
                  isDateDisabled={isDateDisabled}
                  on:change={() => {
                    selectedDate = new Date(value.year, value.month - 1, value.day);
                    if (selectedRepresentative) {
                      fetchAvailableSlots(selectedRepresentative, selectedDate);
                    }
                  }}
                />
              {/key}
            </div>
            <div class="mt-4 flex items-center justify-between text-xs text-[#64748b]">
              <span>Time zone</span>
              <span class="flex items-center gap-1"><Globe size={14} /> {TIME_ZONE_LABEL}</span>
            </div>
          </div>
        </section>
      {:else if currentStep === 2}
        <section class="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-[#1f2933]">Select a Time</h3>
              <p class="text-xs text-[#64748b]">{selectedDateFormatted}</p>
            </div>
            {#if processedSlots.filter(s => s.available).length > 0}
              <span class="text-xs text-[#94a3b8]">{processedSlots.filter(s => s.available).length} slots</span>
            {/if}
          </div>

          {#if selectedDate && availableSlots.length > 0}
            <div class="mt-4 grid gap-2">
              {#each processedSlots as slot (slot.time)}
                <button
                  type="button"
                  id={`time-slot-${slot.id}`}
                  disabled={!slot.available}
                  class="relative w-full rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200 shadow-sm cursor-pointer"
                  class:border-[#4B77BE]={selectedTimeSlot === slot.id || (selectedSlot && selectedSlot.time === slot.time)}
                  class:bg-[#4B77BE]={selectedTimeSlot === slot.id || (selectedSlot && selectedSlot.time === slot.time)}
                  class:text-white={selectedTimeSlot === slot.id || (selectedSlot && selectedSlot.time === slot.time)}
                  class:ring-2={selectedTimeSlot === slot.id || (selectedSlot && selectedSlot.time === slot.time)}
                  class:ring-[#4B77BE]={selectedTimeSlot === slot.id || (selectedSlot && selectedSlot.time === slot.time)}
                  class:ring-offset-2={selectedTimeSlot === slot.id || (selectedSlot && selectedSlot.time === slot.time)}
                  class:border-[#e2e8f0]={!slot.available}
                  class:bg-[#f5f7fa]={!slot.available}
                  class:text-[#a0aec0]={!slot.available}
                  class:opacity-70={!slot.available}
                  class:cursor-not-allowed={!slot.available}
                  class:border-[#d4dae7]={slot.available && !(selectedTimeSlot === slot.id || (selectedSlot && selectedSlot.time === slot.time))}
                  class:bg-white={slot.available && !(selectedTimeSlot === slot.id || (selectedSlot && selectedSlot.time === slot.time))}
                  class:text-[#3f4c5a]={slot.available && !(selectedTimeSlot === slot.id || (selectedSlot && selectedSlot.time === slot.time))}
                  class:hover:border-[#4B77BE]={slot.available && !(selectedTimeSlot === slot.id || (selectedSlot && selectedSlot.time === slot.time))}
                  class:hover:bg-[#e7eeff]={slot.available && !(selectedTimeSlot === slot.id || (selectedSlot && selectedSlot.time === slot.time))}
                  onclick={() => selectTimeSlot(slot)}
                >
                  {slot.time}
                </button>
              {/each}
            </div>
          {:else}
            <div class="mt-6 rounded-xl bg-[#f8fafc] p-6 text-center text-sm text-[#64748b]">
              {selectedDate ? 'No available time slots for this date. Try a different day.' : 'Select a date to view available time slots.'}
            </div>
          {/if}
        </section>
      {:else}
        <section class="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <h3 class="text-sm font-semibold text-[#1f2933]">Your Information</h3>
          <div class="mt-4 space-y-4">
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label for="firstName" class="block text-xs font-medium text-[#64748b]">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  placeholder="First Name"
                  bind:value={firstName}
                  class="mt-1 w-full rounded-lg border border-[#d4dae7] bg-[#f8fafc] px-3 py-2 text-sm text-[#1f2933]"
                  use:validators={[required]}
                />
                <HintGroup for="firstName">
                  <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                    <Hint on="required"><HintValidate>First Name is required</HintValidate></Hint>
                  </div>
                </HintGroup>
              </div>
              <div>
                <label for="lastName" class="block text-xs font-medium text-[#64748b]">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  placeholder="Last Name"
                  bind:value={lastName}
                  class="mt-1 w-full rounded-lg border border-[#d4dae7] bg-[#f8fafc] px-3 py-2 text-sm text-[#1f2933]"
                  use:validators={[required]}
                />
                <HintGroup for="lastName">
                  <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                    <Hint on="required"><HintValidate>Last Name is required</HintValidate></Hint>
                  </div>
                </HintGroup>
              </div>
            </div>

            <div>
              <label for="phoneNumber" class="block text-xs font-medium text-[#64748b]">Phone Number</label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                placeholder="Enter phone number"
                bind:value={phoneNumber}
                class="mt-1 w-full rounded-lg border border-[#d4dae7] bg-[#f8fafc] px-3 py-2 text-sm text-[#1f2933]"
                use:validators={[required]}
              />
              <HintGroup for="phoneNumber">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                  <Hint on="required"><HintValidate>Phone Number is required</HintValidate></Hint>
                </div>
              </HintGroup>
            </div>

            <div>
              <label for="email" class="block text-xs font-medium text-[#64748b]">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="example@mail.com"
                bind:value={email}
                class="mt-1 w-full rounded-lg border border-[#d4dae7] bg-[#f8fafc] px-3 py-2 text-sm text-[#1f2933]"
                use:validators={[required, emailValidator]}
              />
              <HintGroup for="email">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                  <Hint on="required"><HintValidate>Email is required</HintValidate></Hint>
                  <Hint on="email" hideWhenRequired><HintValidate>Email is not valid</HintValidate></Hint>
                </div>
              </HintGroup>
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-medium text-[#64748b]">Full Address</label>
              <input
                placeholder="Street Address"
                bind:value={address.street}
                class="w-full rounded-lg border border-[#d4dae7] bg-[#f8fafc] px-3 py-2 text-sm text-[#1f2933]"
              />
              <div class="grid gap-3 md:grid-cols-2">
                <input
                  placeholder="City"
                  bind:value={address.city}
                  class="rounded-lg border border-[#d4dae7] bg-[#f8fafc] px-3 py-2 text-sm text-[#1f2933]"
                />
                <input
                  placeholder="State / Province"
                  bind:value={address.state}
                  class="rounded-lg border border-[#d4dae7] bg-[#f8fafc] px-3 py-2 text-sm text-[#1f2933]"
                />
                <input
                  placeholder="Zip Code / Postal Code"
                  bind:value={address.zip}
                  class="rounded-lg border border-[#d4dae7] bg-[#f8fafc] px-3 py-2 text-sm text-[#1f2933]"
                />
                <input
                  placeholder="Country"
                  bind:value={address.country}
                  class="rounded-lg border border-[#d4dae7] bg-[#f8fafc] px-3 py-2 text-sm text-[#1f2933]"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-[#64748b]">Additional Information</label>
              <textarea
                placeholder="Add any additional context for the appointment"
                bind:value={additionalInformation}
                rows="3"
                class="mt-1 w-full rounded-lg border border-[#d4dae7] bg-[#f8fafc] px-3 py-2 text-sm text-[#1f2933]"
              ></textarea>
            </div>
            </div>
        </section>
      {/if}

    <div class="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
      <button 
        type="button"
        onclick={handleCancel}
        class="w-full rounded-xl border border-[#d4dae7] bg-white py-3 text-sm font-semibold text-[#4a5562] transition hover:bg-[#f1f3f9] md:w-auto md:px-6"
      >
        {currentStep === 1 ? 'Cancel' : 'Cancel booking'}
      </button>
      <button 
        type="button"
        onclick={handleNextStep}
        class="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-[#2a4283] disabled:cursor-not-allowed disabled:bg-[#a7b4dd] md:w-auto md:px-6"
        disabled={!canAdvance}
      >
        {primaryActionLabel}
      </button>
    </div>
  </form>
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
        class="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 text-primary"
        onclick={() => {
          showEmailConfirmModal = false;
          pendingAppointmentData = null;
        }}
      >
        Cancel Appointment
      </button>
      <button 
        class="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 text-primary"
        onclick={() => {
          showEmailConfirmModal = false;
          completeAppointmentWithoutEmail();
        }}
      >
        Schedule Without Email
      </button>
      <button 
        class="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/80"
        onclick={retryEmailSending}
      >
        Retry Sending Email
      </button>
    </div>
  </div>
</div>
{/if}

<!-- Success confirmation dialog -->
{#if showSuccessConfirmation}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div class="w-full max-w-xs rounded-2xl bg-white p-8 text-center shadow-xl">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-[#f2f6ff] text-primary">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-7 w-7">
          <path d="M5 13l4 4L19 7" />
        </svg>
    </div>
      <h3 class="mt-6 text-lg font-semibold text-[#1f2933]">Booking confirmed!</h3>
      <p class="mt-2 text-sm text-[#64748b]">
        Email has been sent. A reminder will be sent 24 hours prior.
      </p>
        <button 
        type="button"
        class="mt-6 w-full rounded-xl border border-[#d4dae7] py-3 text-sm font-semibold text-[#4a5562] transition hover:bg-[#f1f3f9]"
          onclick={() => {
          showSuccessConfirmation = false;
            dispatch('close');
          }}
        >
        Close window
        </button>
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