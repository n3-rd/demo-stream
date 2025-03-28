<script lang="ts">
  import { Bell } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { getLocalTimeZone, today } from "@internationalized/date";
  import { Calendar } from "$lib/components/ui/calendar/index.js";
  import SveltyPicker from 'svelty-picker';
  import { createEventDispatcher } from 'svelte';
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Popover from "$lib/components/ui/popover";
  import { useForm, HintGroup, Hint, validators, required, email as emailValidator } from 'svelte-use-form';
  import HintValidate from '$lib/components/layout/hint-validate.svelte';
  import { slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  export let userId = null;

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
  let time: any;
  let roomName: string = '';
  let roomNameError: string = '';

  // Debug time value changes
  $: {
    if (time) {
      console.log('Time selected:', time);
      console.log('Time type:', typeof time);
      console.log('Time value:', time instanceof Date ? time.toString() : time);
    }
  }

  const form = useForm();

  // Reactive statement to update selectedDay, selectedMonth, and selectedYear when value changes
  $: {
    selectedDay = value.day;
    selectedMonth = value.month;
    selectedYear = value.year;
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
  $: isFormValid = firstName && lastName && phoneNumber && email && address.street && address.city && address.state && address.zip && address.country && time && roomName && !roomNameError;

  async function handleSubmit() {
    // Validate time is present
    if (!time) {
      console.error('Time is not selected');
      return;
    }
    
    try {
      console.log('Processing time:', time, 'Type:', typeof time);
      
      // Parse the time value - SveltyPicker with format="hh:ii" likely returns a string
      let hours = 0;
      let minutes = 0;
      
      if (typeof time === 'string') {
        // SveltyPicker with displayFormat="HH:ii P" might return something like "10:30 AM"
        const timeString = time.toString();
        console.log('Time string:', timeString);
        
        if (timeString.includes(':')) {
          // Extract hours and minutes
          const timeParts = timeString.replace(/[^0-9:APM\s]/g, '').trim().split(/[\s:]+/);
          console.log('Time parts:', timeParts);
          
          if (timeParts.length >= 2) {
            hours = parseInt(timeParts[0], 10);
            minutes = parseInt(timeParts[1], 10);
            
            // Check for AM/PM
            const isPM = timeParts.length > 2 && timeParts[2].toUpperCase() === 'PM';
            const isAM = timeParts.length > 2 && timeParts[2].toUpperCase() === 'AM';
            
            // Adjust hours for 12-hour format
            if (isPM && hours < 12) {
              hours += 12;
            } else if (isAM && hours === 12) {
              hours = 0;
            }
          }
        }
      } else if (time instanceof Date) {
        // If it's already a Date object
        hours = time.getHours();
        minutes = time.getMinutes();
      }
      
      console.log(`Parsed time: ${hours}:${minutes}`);
      
      // Create a new Date object with the selected date and parsed time
      const scheduleDate = new Date(
        selectedYear, 
        selectedMonth - 1,  // JS months are 0-based
        selectedDay,
        hours,
        minutes,
        0,
        0
      );
      
      // Verify the date is valid
      if (isNaN(scheduleDate.getTime())) {
        console.error('Invalid date created:', scheduleDate);
        throw new Error('Invalid date created');
      }
      
      // Format the schedule_time as required by the API
      const schedule_time = scheduleDate.toISOString();
      
      console.log('Final schedule time:', schedule_time);
      console.log('Schedule date components:', {
        year: selectedYear,
        month: selectedMonth - 1,
        day: selectedDay,
        hours,
        minutes
      });

      // Create the room data
      const formData = new FormData();
      formData.append('title', roomName);
      formData.append('is_active', 'true');
      
      // Add the scheduled properties
      formData.append('scheduled', 'true');
      formData.append('schedule_time', schedule_time);
      
      // If userId is provided, set it as the owner_company
      if (userId) {
        formData.append('owner_company', userId);
      }
      
      // Based on +page.server.ts, we need to add representatives, host_content, and rep_content
      // For now, add empty arrays or default values for required fields
      formData.append('representative[]', ''); // Empty array
      formData.append('host_content[]', '');  // Empty array
      formData.append('representative_content[]', ''); // Empty array
      
      // Send the request to create the room
      try {
        const response = await fetch('/room?/create-room', {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
          dispatch('scheduleMeeting', {
            firstName,
            lastName,
            phoneNumber,
            email,
            address,
            selectedDay,
            selectedMonth,
            selectedYear,
            time,
            roomName,
            schedule_time
          });
          
          dispatch('close'); // Close the dialog
        } else {
          console.error('Failed to create room:', result.error);
        }
      } catch (err) {
        console.error('Error creating room:', err);
      }
    } catch (error) {
      console.error('Error processing date/time:', error);
    }
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

  // Function to check if a time is in the past
  function isTimeInPast(date) {
    const now = new Date();
    const selectedDate = new Date(date);
    if (selectedDate.toDateString() === now.toDateString()) {
      return selectedDate < now; // Only disable past times on the current day
    }
    return false;
  }

  function handleButtonClick(event) {
    if (event.target.disabled) {
      console.log('Button is disabled. Please fill out all required fields.');
    } else {
      handleSubmit();
    }
  }
</script>

<div class="container mx-auto p-4">
  <div class="bg-white rounded-lg p-6">
    <h2 class="text-2xl font-semibold mb-4 text-[#464646]">Book an Appointment</h2>
    <p class="text-gray-400 mb-6">Please fill out this form to make an appointment</p>

    <Tabs.Root value="personal-info" class="w-full">
      <Tabs.List class="flex space-x-4 mb-6">
        <Tabs.Trigger value="personal-info" class="px-4 py-2 rounded">Personal Info</Tabs.Trigger>
        <Tabs.Trigger value="address" class="px-4 py-2 rounded">Address</Tabs.Trigger>
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

      <Tabs.Content value="address">
        <form use:form on:submit|preventDefault={handleSubmit}>
          <div class="mb-6">
            <label for="street">Street Address</label>
            <input
              id="street"
              name="street"
              placeholder="Street Address"
              bind:value={address.street}
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              use:validators={[required]}
            />
            <HintGroup for="street">
              <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                <Hint on="required"><HintValidate>Street Address is required</HintValidate></Hint>
              </div>
            </HintGroup>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="grid gap-2">
              <label for="city">City</label>
              <input
                id="city"
                name="city"
                placeholder="City"
                bind:value={address.city}
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                use:validators={[required]}
              />
              <HintGroup for="city">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                  <Hint on="required"><HintValidate>City is required</HintValidate></Hint>
                </div>
              </HintGroup>
            </div>
            <div class="grid gap-2">
              <label for="state">State</label>
              <input
                id="state"
                name="state"
                placeholder="State"
                bind:value={address.state}
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                use:validators={[required]}
              />
              <HintGroup for="state">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                  <Hint on="required"><HintValidate>State is required</HintValidate></Hint>
                </div>
              </HintGroup>
            </div>
            <div class="grid gap-2">
              <label for="zip">Zip Code</label>
              <input
                id="zip"
                name="zip"
                placeholder="Zip Code"
                bind:value={address.zip}
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                use:validators={[required]}
              />
              <HintGroup for="zip">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                  <Hint on="required"><HintValidate>Zip Code is required</HintValidate></Hint>
                </div>
              </HintGroup>
            </div>
            <div class="grid gap-2">
              <label for="country">Country</label>
              <input
                id="country"
                name="country"
                placeholder="Country"
                bind:value={address.country}
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                use:validators={[required]}
              />
              <HintGroup for="country">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                  <Hint on="required"><HintValidate>Country is required</HintValidate></Hint>
                </div>
              </HintGroup>
            </div>
          </div>
        </form>
      </Tabs.Content>

      <Tabs.Content value="schedule">
        <Card.Root class="mb-6">
          <Card.Header class="flex items-center">
            <h3 class="text-lg font-medium">Select Time and Date</h3>
          </Card.Header>
          <Card.Content class="w-full">
            <Calendar bind:value class="rounded-md border w-full" isDateDisabled={isDateInPast} />
          </Card.Content>
        </Card.Root>

        <div class="mb-6">
          <Popover.Root>
            <Popover.Trigger class="p-0 w-full">
              <Button class="w-full" on:click={() => console.log('Time selection opened')}>Select Time</Button>
            </Popover.Trigger>
            <Popover.Content class="p-4 rounded shadow-lg">
              <SveltyPicker 
                bind:value={time} 
                format="hh:ii" 
                displayFormat="HH:ii P" 
                pickerOnly 
                autocommit 
                disableDatesFn={isTimeInPast}
                on:change={(e) => console.log('SveltyPicker value changed:', e.detail, 'time value:', time)} 
              />
            </Popover.Content>
          </Popover.Root>
        </div>
      </Tabs.Content>
    </Tabs.Root>

    <div class="flex justify-end space-x-4 mt-6">
      <Button on:click={handleCancel} color="gray" variant="destructive">Cancel</Button>
      <Button on:click={handleButtonClick} color="blue" class="bg-primary text-white" disabled={!isFormValid}>Schedule Event</Button>
    </div>
  </div>
</div>

<style>
  .container {
    max-width: 800px;
  }
</style>