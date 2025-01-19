<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from "$lib/components/ui/dialog";
  import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import { currentVideoUrl } from '$lib/callStores';
  import { invalidateAll } from '$app/navigation';
  import Sidenav from '$lib/components/layout/sidenav.svelte';
  import { Mic, Code } from 'lucide-svelte';
	import Embed from '$lib/components/room/embed.svelte';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  interface Room {
    id: string;
    title: string;
    is_active: boolean;
    owner_company: string;
    expand?: {
      host_content: ContentItem[];
      representative_content: ContentItem[];
    };
  }

  interface ContentItem {
    id: string;
    title: string;
    collectionId: string;
    thumbnail?: string;
    type?: string;
    file?: string;
  }

  export let data: {
    room: Room;
    hostContent: ContentItem[];
    representativeContent: ContentItem[];
    contentLibrary: ContentItem[];
  };
  
  let loading = true;
  let { room, hostContent, representativeContent, contentLibrary } = data;

  console.log(data)

  function getFileUrl(file: ContentItem) {
    if (!file?.file) return '';
    return `${PUBLIC_POCKETBASE_INSTANCE}/api/files/${file.collectionId}/${file.id}/${file.file}`;
  }

  function getThumbnailUrl(content: ContentItem) {
    if (!content?.thumbnail) return '';
    return `${PUBLIC_POCKETBASE_INSTANCE}/api/files/${content.collectionId}/${content.id}/${content.thumbnail}`;
  }

  onMount(() => {
    loading = false;
  });
</script>

<div class="flex bg-gray-100 overflow-hidden">
  <Sidenav activePage="dashboard" />

  <div class="flex-1 flex flex-col">
    <!-- Header -->
    <header class="border-b border-gray-200 bg-white px-6 py-4 flex-shrink-0">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold text-gray-800">View Room</h1>
        <div class="flex items-center space-x-4">
          <button class="text-primary bg-blue-50 px-4 py-2 rounded font-medium">
            Analytics
          </button>
          <button class="text-primary bg-blue-50 px-4 py-2 rounded font-medium">
            Virtual AI
          </button>
          <button class="bg-primary text-white px-4 py-2 rounded font-medium">
            Enter View Room
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto p-6">
      <!-- Host View Section -->
      <section class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-gray-700">{room.title} (Host View)</h2>
          <button class="text-primary text-sm">Add More</button>
        </div>
        <div class="grid grid-cols-5 gap-4">
          {#each hostContent as content}
            <div class="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
              {#if content.thumbnail}
                <img 
                  src={getThumbnailUrl(content)} 
                  alt={content.title}
                  class="w-full h-full object-cover"
                />
              {:else}
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-gray-400">No thumbnail</span>
                </div>
              {/if}
              <div class="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                <p class="text-white text-sm truncate">{content.title || 'Untitled'}</p>
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- Representative View Section -->
      <section class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-gray-700">{room.title} (Representative View)</h2>
          <button class="text-primary text-sm">Add More</button>
        </div>
        <div class="grid grid-cols-5 gap-4">
          {#each representativeContent as content}
            <div class="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
              {#if content.thumbnail}
                <img 
                  src={getThumbnailUrl(content)} 
                  alt={content.title}
                  class="w-full h-full object-cover"
                />
              {:else}
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-gray-400">No thumbnail</span>
                </div>
              {/if}
              <div class="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                <p class="text-white text-sm truncate">{content.title || 'Untitled'}</p>
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- Host Content Table -->
      <section>
        <table class="w-full bg-white">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Number</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each contentLibrary as content, i}
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {content.title || `Sample Title ${i + 1}`}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {content.id || `43532-212`}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-2.5 w-2.5 rounded-full bg-green-400 mr-2"></div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {i + 1}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button class="text-gray-400 hover:text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    </main>
  </div>
</div>

<style>
  :global(body) {
    @apply bg-gray-100;
  }
</style>

