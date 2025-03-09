<script lang="ts">
  /** @type {import('./$types').PageData} */
  import Sidenav from '$lib/components/layout/sidenav.svelte';
  import { Button } from "$lib/components/ui/button";
  import { enhance } from "$app/forms";
  import { toast } from "svelte-sonner";
  import * as Select from "$lib/components/ui/select";
  import { goto, invalidateAll } from "$app/navigation";
  import { PUBLIC_POCKETBASE_INSTANCE } from "$env/static/public";
  
  export let data;
  $: ({ representative, parsedSchedule, locations } = data);
  
  let selectedLocation = representative?.location || '';
  
  function handleLocationChange(e: any) {
    selectedLocation = e?.value || '';
  }

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      // File selected
    }
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
</script>

<div class="flex h-screen bg-[#F5F5F5]">
  <Sidenav activePage="representatives" />

  <div class="flex-1 overflow-auto">
    <div class="p-6">
      <form method="POST" enctype="multipart/form-data" class="space-y-6" use:enhance={() => {
        return async ({ result }) => {
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
                  required
                  value={representative?.name || ''}
                  placeholder="Enter name"
                  class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2"
                />
              </div>
              <div>
                <label for="email" class="block text-[14px] text-[#737373] mb-2">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email"
                  required
                  value={representative?.email || ''}
                  placeholder="Enter email"
                  class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2"
                />
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
                />
              </div>
              <div>
                <label for="location" class="block text-[14px] text-[#737373] mb-2">Location</label>
                <Select.Root onSelectedChange={handleLocationChange} value={selectedLocation}>
                  <Select.Trigger class="w-full border border-[#9E9E9E] bg-white rounded-[5px] h-[38px]">
                    <Select.Value placeholder="Select a location" />
                  </Select.Trigger>
                  <Select.Content>
                    {#each locations || [] as location}
                      <Select.Item value={location.id}>{location.name}</Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
                <input type="hidden" name="location" value={selectedLocation} />
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-6">
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-[18px] font-semibold text-[#737373] mb-4">Schedule</h2>
            <div class="space-y-4">
              {#each days as day}
                <div class="flex items-center">
                  <span class="w-24 text-[14px] text-[#808080]">{day}</span>
                  <div class="flex gap-4">
                    <input 
                      type="time" 
                      name="{day.toLowerCase()}_start"
                      value={parsedSchedule?.[day.toLowerCase()]?.start || ''}
                      class="w-[101.24px] h-[26px] bg-[#E0E8F5] border-none rounded-[3px] px-2 text-sm"
                    />
                    <input 
                      type="time" 
                      name="{day.toLowerCase()}_end"
                      value={parsedSchedule?.[day.toLowerCase()]?.end || ''}
                      class="w-[101.24px] h-[26px] bg-[#E0E8F5] border-none rounded-[3px] px-2 text-sm"
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
                  src={`${PUBLIC_POCKETBASE_INSTANCE}api/files/representatives/${representative.id}/${representative.avatar}`}
                  alt={representative.name}
                  class="w-24 h-24 rounded-full object-cover"
                />
              </div>
            {/if}
            
            <div>
              <p class="text-sm text-[#737373] mb-2">Upload New Image:</p>
              <input 
                type="file" 
                name="avatar"
                accept="image/*"
                on:change={handleFileChange}
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