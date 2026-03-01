<script lang="ts">
  import { run } from 'svelte/legacy';

  /** @type {import('./$types').PageData} */
  import Sidenav from '$lib/components/layout/sidenav.svelte';
  import { Button } from "$lib/components/ui/button";
  import { enhance } from "$app/forms";
  import { toast } from "svelte-sonner";
  import * as Select from "$lib/components/ui/select";
  import { goto, invalidateAll } from "$app/navigation";
  import { useForm, HintGroup, Hint, validators, required, email } from 'svelte-use-form';
  import { onMount } from 'svelte';
  
  let { data } = $props();
  let { representative, parsedSchedule, locations } = $derived(data);
  
  const form = useForm();
  
  let selectedLocation = $state(representative?.location || '');
  
  // Reactive statement to ensure location is set
  run(() => {
    if (representative?.location) {
      selectedLocation = representative.location;
    }
  });

  // Custom location select state
  let isLocationDropdownOpen = $state(false);
  let locationSearchTerm = $state('');

  // Filtered and sorted locations
  let filteredLocations = $derived(locations
    .filter(loc => 
      loc.name.toLowerCase().includes(locationSearchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name)));

  // Function to handle location selection
  function selectLocation(locationId: string) {
    selectedLocation = locationId;
    isLocationDropdownOpen = false;
    locationSearchTerm = '';

    // Trigger validation
    const locationInput = document.querySelector('input[name="location"]') as HTMLInputElement;
    if (locationInput) {
      locationInput.value = selectedLocation;
      locationInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // Close dropdown when clicking outside
  function handleOutsideClick(event: MouseEvent) {
    const dropdown = document.getElementById('location-dropdown');
    const trigger = document.getElementById('location-select-trigger');
    
    if (dropdown && trigger && 
        !dropdown.contains(event.target as Node) && 
        !trigger.contains(event.target as Node)) {
      isLocationDropdownOpen = false;
      locationSearchTerm = '';
    }
  }

  // Add and remove event listener
  onMount(() => {
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  });

  function handleLocationChange(e: any) {
    selectedLocation = e?.value || '';
    
    // Immediately update the hidden input
    const locationInput = document.querySelector('input[name="location"]') as HTMLInputElement;
    if (locationInput) {
      locationInput.value = selectedLocation;
      locationInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      // File selected
    }
  }

  // Custom validator for phone number
  function phoneValidator(value) {
    if (!value) return null; // Skip validation if empty (required will catch this)
    const phoneRegex = /^[0-9+\-\s()]{7,15}$/;
    if (!phoneRegex.test(value)) {
      return { phone: true };
    }
    return null;
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Force validation check after component is mounted
  onMount(() => {
    // Add a small delay to ensure the form is fully initialized
    setTimeout(() => {
      const inputs = document.querySelectorAll('input[name]');
      inputs.forEach(input => {
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
      });
    }, 100);
  });
</script>

<div class="flex bg-[#eceef3]">
  <Sidenav activePage="representatives" />

  <div class="flex-1 overflow-auto mt-[6rem]">
    <div class="p-6">
      <form method="POST" enctype="multipart/form-data" class="space-y-6" use:form use:enhance={() => {
        return async ({ result }) => {
          if (!$form.valid) {
            toast.error('Please fix the validation errors');
            return;
          }
          
          if (result.type === 'success') {
            toast.success('Representative updated successfully');
            invalidateAll();
            setTimeout(() => {
              goto('/representatives');
            }, 1000);
          } else if (result.type === 'failure') {
            const errorMessage = typeof result.data?.message === 'string' 
              ? result.data.message 
              : 'Failed to update representative';
            toast.error(errorMessage);
          }
        };
      }}>
        <div class="flex justify-between items-center mb-6 bg-white py-7 px-11">
          <h1 class="text-2xl font-medium text-[#737373]">Edit Representative</h1>
          <div class="flex gap-2">
          
            <Button 
              type="submit" 
              class="bg-[#4B77BE] hover:bg-[#4B77BE]/90 text-white"
              disabled={!$form.valid}
            >
              Update
            </Button>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="grid grid-cols-2 gap-6">
            <div class="space-y-4">
              <div>
                <label for="name" class="block text-[14px] text-[#737373] mb-2">Name</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name"
                  value={representative?.name || ''}
                  placeholder="Enter name"
                  class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2"
                  use:validators={[required]}
                />
                <HintGroup for="name">
                  <Hint on="required">Name is required</Hint>
                </HintGroup>
              </div>
              <div>
                <label for="email" class="block text-[14px] text-[#737373] mb-2">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email"
                  value={representative?.email || ''}
                  placeholder="Enter email"
                  class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2"
                  use:validators={[required, email]}
                />
                <HintGroup for="email">
                  <Hint on="required">Email is required</Hint>
                  <Hint on="email" hideWhenRequired>Please enter a valid email address</Hint>
                </HintGroup>
              </div>
            </div>
            <div class="space-y-4">
              <div>
                <label for="phone" class="block text-[14px] text-[#737373] mb-2">Phone Number</label>
                <input 
                  type="tel" 
                  id="phone" 
                  name="phone"
                  value={representative?.phone || ''}
                  placeholder="Enter phone number"
                  class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2"
                  use:validators={[required, phoneValidator]}
                />
                <HintGroup for="phone">
                  <Hint on="required">Phone number is required</Hint>
                  <Hint on="phone" hideWhenRequired>Please enter a valid phone number</Hint>
                </HintGroup>
              </div>
              <div>
                <label for="location" class="block text-[14px] text-[#737373] mb-2">Location</label>
                <div class="relative w-full">
                  <button 
                    type="button"
                    id="location-select-trigger"
                    class="w-full border border-[#9E9E9E] bg-white rounded-[5px] h-[38px] flex items-center justify-between px-3 cursor-pointer"
                    onclick={() => isLocationDropdownOpen = !isLocationDropdownOpen}
                    onkeydown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        isLocationDropdownOpen = !isLocationDropdownOpen;
                      }
                    }}
                    aria-haspopup="listbox"
                    aria-expanded={isLocationDropdownOpen}
                    aria-labelledby="location-label"
                  >
                    <span class="text-sm">
                      {locations.find(loc => loc.id === selectedLocation)?.name || 'Select a location'}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-gray-500">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>

                  {#if isLocationDropdownOpen}
                    <div 
                      id="location-dropdown"
                      role="listbox"
                      aria-labelledby="location-label"
                      class="absolute z-10 w-full mt-1 bg-white border border-[#9E9E9E] rounded-[5px] shadow-lg max-h-60 overflow-y-auto"
                    >
                      <div class="p-2">
                        <input 
                          type="text" 
                          placeholder="Search locations..." 
                          class="w-full border border-[#9E9E9E] rounded-[3px] px-2 py-1 text-sm mb-2"
                          bind:value={locationSearchTerm}
                          aria-label="Search locations"
                        />
                      </div>
                      
                      {#if filteredLocations.length === 0}
                        <div class="px-3 py-2 text-sm text-gray-500">
                          No locations found
                        </div>
                      {:else}
                        <ul role="presentation">
                          {#each filteredLocations as location, index}
                            <li 
                              role="option"
                              tabindex="0"
                              aria-selected={location.id === selectedLocation}
                              class="px-3 py-2 text-sm hover:bg-[#E0E8F5] cursor-pointer {location.id === selectedLocation ? 'bg-[#E0E8F5] font-semibold' : ''}"
                              onclick={() => selectLocation(location.id)}
                              onkeydown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  selectLocation(location.id);
                                }
                              }}
                            >
                              {location.name}
                            </li>
                          {/each}
                        </ul>
                      {/if}
                    </div>
                  {/if}
                </div>
                <input 
                  type="hidden" 
                  name="location" 
                  value={selectedLocation}
                  use:validators={[required]}
                />
                <HintGroup for="location">
                  <Hint on="required">Location is required</Hint>
                </HintGroup>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-6">
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-[18px] font-semibold text-[#737373] mb-4">Schedule - Time Zone: EST (Eastern Standard Time)</h2>
            <div class="space-y-4">
              {#each days as day}
                <div class="flex items-center">
                  <span class="w-24 text-[14px] text-[#808080]">{day}</span>
                  <div class="flex gap-4">
                    <input 
                      type="time" 
                      name="{day.toLowerCase()}_start"
                      value={parsedSchedule?.[day.toLowerCase()]?.start || ''}
                      placeholder=" "
                      class="w-[120.24px] h-[26px] bg-[#E0E8F5] border-none rounded-[3px] px-2 text-sm"
                    />
                    <input 
                      type="time" 
                      name="{day.toLowerCase()}_end"
                      value={parsedSchedule?.[day.toLowerCase()]?.end || ''}
                      placeholder=" "
                      class="w-[120.24px] h-[26px] bg-[#E0E8F5] border-none rounded-[3px] px-2 text-sm"
                    />
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-[18px] font-semibold text-[#737373] mb-4">Representative Image</h2>
            
            {#if representative?.avatar}
              <div class="mb-4">
                <p class="text-sm text-[#737373] mb-2">Current Image:</p>
                <img 
                  src={`/api/files/representatives/${representative.id}/${representative.avatar}`}
                  alt={representative.name}
                  class="w-24 h-24 rounded-full object-cover"
                />
              </div>
            {/if}
            
            <div>
              <p class="text-sm text-[#737373] mb-2">Upload New Image (Optional):</p>
              <input 
                type="file" 
                id="avatar"
                name="avatar"
                accept="image/*"
                onchange={handleFileChange}
                class="w-full border border-dashed border-[#9E9E9E] bg-white rounded-[5px] px-3 py-6 text-sm"
              />
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <!-- Remove the bottom button since we now have it at the top -->
        </div>
      </form>
    </div>
  </div>
</div> 

<style>


  
</style>