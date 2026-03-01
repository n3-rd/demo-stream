<script lang="ts">
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
  let { locations } = $derived(data);
  
  const form = useForm();
  
  // Custom validator for phone number (must start with +)
  function phoneValidator(value) {
    if (!value) return null; // Skip validation if empty (required will catch this)
    const phoneRegex = /^\+[0-9\-\s()]{6,14}$/;
    if (!phoneRegex.test(value)) {
      return { phone: true };
    }
    return null;
  }
  
  // Custom validator for image
  function imageValidator(value) {
    if (!value || value.length === 0) {
      return { image: true };
    }
    return null;
  }
  
  let formData = $state({
    name: '',
    email: '',
    phone: '',
    location: '',
    image: null as File | null,
    schedule: {
      monday: { start: '', end: '' },
      tuesday: { start: '', end: '' },
      wednesday: { start: '', end: '' },
      thursday: { start: '', end: '' },
      friday: { start: '', end: '' },
      saturday: { start: '', end: '' },
      sunday: { start: '', end: '' }
    }
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  let selectedLocation = $state('');
  let imagePreviewUrl = $state('');
  let hasImage = $state(false);
  let saving = $state(false);

  function handleLocationChange(e: any) {
    selectedLocation = e?.value || '';
    // Force form validation update
    setTimeout(() => {
      const locationInput = document.querySelector('input[name="location"]') as HTMLInputElement;
      if (locationInput) {
        const event = new Event('input', { bubbles: true });
        locationInput.dispatchEvent(event);
      }
    }, 0);
  }

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      formData.image = input.files[0];
      hasImage = true;
      
      // Create a preview URL for the selected image
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      imagePreviewUrl = URL.createObjectURL(input.files[0]);
    }
  }
  
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
        saving = true;
        return async ({ result }) => {
          try {
          if (!$form.valid) {
            toast.error('Please fix the validation errors');
            return;
          }
          
          if (result.type === 'success') {
            toast.success('Representative added successfully');
            invalidateAll();
            setTimeout(() => {
              goto('/representatives');
            }, 1000);
          } else if (result.type === 'failure') {
            const errorMessage = typeof result.data?.message === 'string' 
              ? result.data.message 
              : 'Failed to add representative';
            toast.error(errorMessage);
          }
          } finally {
            saving = false;
          }
        };
      }}>
        <div class="flex justify-between items-center mb-6 bg-white py-7 px-11">
          <h1 class="text-2xl font-medium text-[#737373]">Add Representatives</h1>
          <div class="flex gap-2">
            <Button 
              class="bg-[#E0E0E0] hover:bg-[#D0D0D0] text-[#737373]"
              href="/representatives"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              class="bg-[#4B77BE] hover:bg-[#4B77BE]/90 text-white"
              disabled={!$form.valid || saving}
            >
              {saving ? 'Saving...' : 'Save and Add'}
            </Button>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="grid grid-cols-2 gap-6">
            <div class="space-y-4">
              <div>
                <label for="first_name" class="block text-[14px] text-[#737373] mb-2">First Name</label>
                <input 
                  type="text" 
                  id="first_name" 
                  name="first_name"
                  placeholder="Enter first name"
                  class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2"
                  use:validators={[required]}
                />
                <HintGroup for="first_name">
                  <Hint on="required">First name is required</Hint>
                </HintGroup>
              </div>
              <div>
                <label for="last_name" class="block text-[14px] text-[#737373] mb-2">Last Name</label>
                <input 
                  type="text" 
                  id="last_name" 
                  name="last_name"
                  placeholder="Enter last name"
                  class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2"
                  use:validators={[required]}
                />
                <HintGroup for="last_name">
                  <Hint on="required">Last name is required</Hint>
                </HintGroup>
              </div>
              <div>
                <label for="email" class="block text-[14px] text-[#737373] mb-2">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email"
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
                  placeholder="Enter phone number"
                  class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2"
                  use:validators={[required, phoneValidator]}
                />
                <HintGroup for="phone">
                  <Hint on="required">Phone number is required</Hint>
                  <Hint on="phone" hideWhenRequired>Please enter a valid phone number eg(+1234567890)</Hint>
                </HintGroup>
              </div>
              <div>
                <label for="location" class="block text-[14px] text-[#737373] mb-2">Location</label>
                <Select.Root onSelectedChange={handleLocationChange}>
                  <Select.Trigger class="w-full border border-[#9E9E9E] bg-white rounded-[5px] h-[38px]">
                    <Select.Value placeholder="Select a location" />
                  </Select.Trigger>
                  <Select.Content>
                    {#each locations || [] as location}
                      <Select.Item value={location.id}>{location.name}</Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
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
                      class="w-[120.24px] h-[26px] bg-[#E0E8F5] border-none rounded-[3px] px-2 text-sm"
                    />
                    <input 
                      type="time" 
                      name="{day.toLowerCase()}_end"
                      class="w-[120.24px] h-[26px] bg-[#E0E8F5] border-none rounded-[3px] px-2 text-sm"
                    />
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-[18px] font-semibold text-[#737373] mb-4">Add Image</h2>
            
            {#if imagePreviewUrl}
              <div class="mb-4">
                <p class="text-sm text-[#737373] mb-2">Image Preview:</p>
                <div class="flex items-center gap-4">
                  <img 
                    src={imagePreviewUrl}
                    alt="Preview"
                    class="w-24 h-24 rounded-full object-cover border border-[#E0E8F5]"
                  />
                  <button 
                    type="button" 
                    class="text-sm text-[#4B77BE] hover:underline"
                    onclick={() => {
                      URL.revokeObjectURL(imagePreviewUrl);
                      imagePreviewUrl = '';
                      hasImage = false;
                      const fileInput = document.querySelector('input[type="file"]');
                      if (fileInput instanceof HTMLInputElement) {
                        fileInput.value = '';
                        formData.image = null;
                        // Trigger validation update
                        const event = new Event('input', { bubbles: true });
                        fileInput.dispatchEvent(event);
                      }
                    }}
                  >
                    Remove image
                  </button>
                </div>
              </div>
            {/if}
            
            <input 
              type="file" 
              id="avatar"
              name="avatar"
              accept="image/*"
              onchange={handleFileChange}
              class="w-full border border-dashed border-[#9E9E9E] bg-white rounded-[5px] px-3 py-6 text-sm"
              use:validators={[required]}
            />
            <HintGroup for="avatar">
              <Hint on="required">Image is required</Hint>
            </HintGroup>
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
  .page-container {
    padding: 2rem;
    max-width: 1106.74px;
    margin: 0 auto;
    position: relative;
  }

  .header h1 {
    width: 258px;
    height: 28px;
    font-family: 'Poppins', sans-serif;
    font-style: normal;
    font-weight: 700;
    font-size: 24px;
    line-height: 118%;
    display: flex;
    align-items: center;
    color: #808080;
    margin-bottom: 2rem;
  }

  .form-section {
    width: 100%;
    background: #FFFFFF;
    border-radius: 8px;
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .form-row {
    display: flex;
    gap: 2rem;
    margin-bottom: 1rem;
  }

  .form-group {
    flex: 1;
  }

  label {
    display: block;
    font-family: 'Poppins', sans-serif;
    font-style: normal;
    font-weight: 400;
    font-size: 14px;
    line-height: 21px;
    color: #737373;
    margin-bottom: 0.5rem;
  }

  input[type="text"],
  input[type="email"],
  input[type="tel"] {
    width: 100%;
    height: 38px;
    background: #FFFFFF;
    border: 1px solid #9E9E9E;
    border-radius: 5px;
    padding: 0 1rem;
    font-family: 'Poppins', sans-serif;
    box-sizing: border-box;
  }

  .bottom-section {
    display: flex;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .schedule-section,
  .image-section {
    width: 373px;
    background: #FFFFFF;
    border-radius: 8px;
    padding: 2rem;
  }

  h2 {
    font-family: 'Poppins', sans-serif;
    font-style: normal;
    font-weight: 600;
    font-size: 18px;
    line-height: 27px;
    color: #737373;
    margin-bottom: 1.5rem;
  }

  .schedule-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .schedule-row {
    display: flex;
    align-items: center;
  }

  .day-label {
    font-family: 'Poppins', sans-serif;
    font-style: normal;
    font-weight: 400;
    font-size: 14px;
    line-height: 256%;
    color: #808080;
    width: 84px;
  }

  .time-inputs {
    display: flex;
    gap: 1rem;
  }

  .time-inputs input {
    width: 101.24px;
    height: 26px;
    background: #E0E8F5;
    border-radius: 3px;
    border: none;
    padding: 0 0.5rem;
  }

  .file-input {
    width: 100%;
    padding: 1rem;
    border: 1px dashed #9E9E9E;
    border-radius: 5px;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }

  .save-button {
    width: 135.98px;
    height: 39px;
    background: #808080;
    border-radius: 3px;
    border: none;
    font-family: 'Inter', sans-serif;
    font-style: normal;
    font-weight: 600;
    font-size: 16px;
    line-height: 120%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    cursor: pointer;
  }

  .save-button:hover {
    opacity: 0.9;
  }
</style> 