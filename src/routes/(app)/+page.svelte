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
  import { Mic, Code, FileVideo, FileText, FilePen, Trash2, Pencil, Play, Image } from 'lucide-svelte';
	import Embed from '$lib/components/room/embed.svelte';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

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
    library_type?: string | string[];
  }

  export let data: {
    room: Room;
    hostContent: ContentItem[];
    representativeContent: ContentItem[];
    contentLibrary: ContentItem[];
    user?: any;
  };
  
  let loading = true;
  let { room, hostContent, representativeContent, contentLibrary, user } = data;

  console.log(data);

  // Content library functionality
  let selectedTab = 'host';
  let contentTypes = ['video', 'pdf', 'document', 'image'];
  let contentTypeLabels = {
      'video': 'Videos',
      'pdf': 'PDF Files',
      'document': 'Word Document Files',
      'image': 'Images'
  };
  
  // Store references to carousel containers
  let carouselContainers = {};
  // Track scroll position for each carousel
  let carouselScrollState = {};
  
  // Delete confirmation dialog
  let showDeleteDialog = false;
  let contentToDelete = null;

  function handleTabChange(tab: string) {
      selectedTab = tab;
  }

  // All content and grouping by type - mirror content-library filtering
  $: allContent = (() => {
      const byId = new Map<string, any>();
      (hostContent || []).forEach((item: any) => {
          byId.set(item.id, { ...item });
      });
      (representativeContent || []).forEach((item: any) => {
          if (!byId.has(item.id)) {
              byId.set(item.id, { ...item });
          } else {
              const existing = byId.get(item.id);
              const toArray = (v: any) => Array.isArray(v) ? v : (v ? [v] : []);
              const mergedTypes = Array.from(new Set([...toArray(existing.library_type), ...toArray(item.library_type)]));
              byId.set(item.id, { ...existing, library_type: mergedTypes.length <= 1 ? (mergedTypes[0] || existing.library_type) : mergedTypes });
          }
      });
      return Array.from(byId.values());
  })();
  $: contentByType = contentTypes.map(type => ({
      type,
      label: contentTypeLabels[type],
      items: allContent.filter(item => {
          const libraryTypeMatch = selectedTab === 'host'
              ? item.library_type === 'host' || (Array.isArray(item.library_type) && item.library_type.includes('host'))
              : item.library_type === 'representative' || (Array.isArray(item.library_type) && item.library_type.includes('representative'));
          return libraryTypeMatch && item.type === type;
      })
  }));

  function getIcon(type: string) {
      switch (type) {
          case 'video':
              return FileVideo;
          case 'pdf':
              return FilePen;
          case 'document':
              return FileText;
          case 'image':
              return Image;
          default:
              return FileText;
      }
  }

  function getFileUrl(file: ContentItem) {
    if (!file?.file) return '';
    return `/api/files/${file.collectionId || 'content_library'}/${file.id}/${file.file}`;
  }

  function getThumbnailUrl(content: ContentItem) {
    if (!content?.thumbnail) return '';
    return `/api/files/${content.collectionId || 'content_library'}/${content.id}/${content.thumbnail}`;
  }

  function handleContentClick(item) {
            window.open(`${item.file}`, '_blank');
    }
  
  function scrollCarousel(type: string, direction: 'left' | 'right') {
      const container = carouselContainers[type];
      if (!container) return;
      
      const scrollAmount = 230; // Slightly wider than card width to account for gap
      const scrollLeft = direction === 'left' 
          ? container.scrollLeft - scrollAmount 
          : container.scrollLeft + scrollAmount;
          
      container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
      });
  }
  
  function bindCarouselContainer(node, type) {
      carouselContainers[type] = node;
      
      // Initialize scroll state
      if (!carouselScrollState[type]) {
          carouselScrollState[type] = {
              canScrollLeft: false,
              canScrollRight: node.scrollWidth > node.clientWidth
          };
      }
      
      // Add scroll event listener
      const handleScroll = () => {
          carouselScrollState[type] = {
              canScrollLeft: node.scrollLeft > 0,
              canScrollRight: node.scrollLeft + node.clientWidth < node.scrollWidth - 10
          };
          carouselScrollState = {...carouselScrollState};
      };
      
      node.addEventListener('scroll', handleScroll);
      
      // Initial check
      setTimeout(handleScroll, 100);
      
      return {
          destroy() {
              node.removeEventListener('scroll', handleScroll);
              delete carouselContainers[type];
          }
      };
  }
  
  // Check if carousel needs navigation
  function needsNavigation(type, items) {
      if (!items || items.length <= 4) return false;
      return true;
  }
  
  // Handle delete content
  function openDeleteDialog(item, event) {
      event.stopPropagation();
      contentToDelete = item;
      showDeleteDialog = true;
  }
  
  async function deleteContent() {
      if (!contentToDelete) return;
      
      try {
          const response = await fetch(`/api/content-library/${contentToDelete.id}`, {
              method: 'DELETE',
          });
          
          if (response.ok) {
              // Remove from underlying arrays
              let idx = hostContent.findIndex(i => i.id === contentToDelete.id);
              if (idx !== -1) {
                  hostContent.splice(idx, 1);
                  hostContent = [...hostContent];
              }
              idx = representativeContent.findIndex(i => i.id === contentToDelete.id);
              if (idx !== -1) {
                  representativeContent.splice(idx, 1);
                  representativeContent = [...representativeContent];
              }
              toast.success('Content deleted successfully');
          } else {
              const error = await response.json();
              toast.error(`Failed to delete: ${error.message || 'Unknown error'}`);
          }
      } catch (error) {
          console.error('Error deleting content:', error);
          toast.error('An error occurred while deleting');
      } finally {
          showDeleteDialog = false;
          contentToDelete = null;
      }
  }

  function handleJoinRoom() {
    goto(`/room/${room.id}`);
  }

  function handleRoomInfo() {
    goto(`/room/${room.id}/info`);
  }

  onMount(() => {
    if (browser && !user) {
      console.log('User not authenticated, redirecting to login page');
      goto('/login');
      return;
    }
    
    // If no content is available, add some mock data
    if (allContent.length === 0) {
      console.log('No content available, adding mock data');
      
 
      
      // Update content array
      // content = selectedTab === 'host' ? [...hostContent] : [...representativeContent]; // This line is removed
    }
    
    loading = false;
  });
</script>

<div class="flex bg-[#eceef3] overflow-hidden">
  <Sidenav activePage="dashboard" />
  
  <div class="flex-1 overflow-auto mt-[6rem]">
      <div class="p-6 mx-auto">
          <!-- Header Section -->
          <div class="bg-white rounded-[8px] p-4 mb-6 flex justify-between items-center">
              <div class="flex space-x-8">
                  <button 
                      class="text-[24px] leading-[118%] {selectedTab === 'host' ? 'text-[#577AB7] font-bold' : 'text-[#737373]'}"
                      on:click={() => handleTabChange('host')}
                  >
                      Host Content
                  </button>
                  <button 
                      class="text-[24px] leading-[118%] {selectedTab === 'representative' ? 'text-[#577AB7] font-bold' : 'text-[#737373]'}"
                      on:click={() => handleTabChange('representative')}
                  >
                      Representative Content
                  </button>
              </div>
              <div class="flex space-x-4">
                  <Button 
                      class="bg-[#577AB7] hover:bg-[#577AB7]/90 h-[39px] rounded-[3px] font-semibold text-[16px] text-white"
                      on:click={() => goto('/upload')}
                  >
                      Upload a Content
                  </Button>
                  <Button 
                      class="bg-[#577AB7] hover:bg-[#577AB7]/90 h-[39px] rounded-[3px] font-semibold text-[16px] text-white"
                      on:click={() => {
                          goto('/room');
                          setTimeout(() => {
                              const addRoomButton = document.querySelector('button[data-add-room-dialog]');
                              if (addRoomButton) addRoomButton.click();
                          }, 100);
                      }}
                  >
                      Create Room
                  </Button>
              </div>
          </div>

          <!-- Content Carousels -->
          {#each contentByType as contentGroup}
              {#if contentGroup.items.length > 0}
                  <div class="mb-8">
                      <h2 class="text-[16px] font-medium text-[#737373] mb-4">{contentGroup.label}</h2>
                      
                      <div class="relative bg-white rounded-lg p-4 shadow-sm">
                          <!-- Left Navigation Button -->
                          {#if needsNavigation(contentGroup.type, contentGroup.items) && carouselScrollState[contentGroup.type]?.canScrollLeft}
                              <button 
                                  class="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center hover:bg-gray-100 border border-gray-100"
                                  on:click={() => scrollCarousel(contentGroup.type, 'left')}
                              >
                              <img src="/icons/icon-carousel-back.svg" class="w-6 h-6 text-[#737373]" />
                              </button>
                          {/if}
                          
                          <!-- Content Cards -->
                          <div class="overflow-hidden px-8">
                              <div 
                                  class="flex gap-6 py-2 overflow-x-auto scrollbar-hide" 
                                  use:bindCarouselContainer={contentGroup.type}
                                  style="scroll-behavior: smooth; -ms-overflow-style: none; scrollbar-width: none;"
                              >
                                  {#each contentGroup.items as item}
                                      <div class="bg-[#ECEFF3] rounded-[2px] p-2 flex-shrink-0 shadow-sm hover:shadow-md transition-shadow duration-200 w-[221.66px]">
                                          <div class="relative">
                                              {#if item.thumbnail}
                                                  <img
                                                      src={getThumbnailUrl(item)}
                                                      alt={item.title}
                                                      class="w-[217.66px] h-[128.22px] object-cover rounded-[1px]"
                                                  />
                                              {:else}
                                                  <div class="w-[217.66px] h-[128.22px] bg-[#ECEFF3] rounded-[1px] flex items-center justify-center">
                                                      <svelte:component 
                                                          this={getIcon(item.type)} 
                                                          class="w-12 h-12 text-[#666666]"
                                                      />
                                                  </div>
                                              {/if}
                                              {#if item.type === 'video'}
                                                  <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                                                  on:click={()=>{
                                                      handleContentClick(item);
                                                  }}
                                                  >
                                                      <div class="w-[37.16px] h-[35.04px] bg-white rounded-full flex items-center justify-center shadow-md">
                                                         <Play class="w-[17px] h-[27.53px] text-[#577AB7]" 
                                                         />
                                                      </div>
                                                  </div>
                                              {/if}
                                              <div class="absolute top-2 right-2 flex gap-2">
                                                  <button 
                                                      class="w-[21.23px] h-[19.11px] bg-[#577AB7] rounded-full flex items-center justify-center shadow-sm"
                                                      on:click|stopPropagation={() => goto(`/content-library/${item.id}/edit`)}
                                                  >
                                                      <Pencil class="w-[14.16px] h-[12.74px] text-[#ECEFF3]" />
                                                  </button>
                                                  <button 
                                                      class="w-[21.23px] h-[19.11px] bg-[#EB3223] rounded-full flex items-center justify-center shadow-sm"
                                                      on:click|stopPropagation={(e) => openDeleteDialog(item, e)}
                                                  >
                                                      <Trash2 class="w-[14.16px] h-[12.74px] text-[#ECEFF3]" />
                                                  </button>
                                              </div>
                                          </div>
                                          <div class="mt-2">
                                              <h3 class="font-semibold text-[14px] leading-[120%] text-[#577AB7] truncate">{item.title}</h3>
                                              <p class="font-light text-[11px] leading-[120%] text-black/50">ID {item.id}</p>
                                          </div>
                                      </div>
                                  {/each}
                              </div>
                          </div>
                          
                          <!-- Right Navigation Button -->
                          {#if needsNavigation(contentGroup.type, contentGroup.items) && carouselScrollState[contentGroup.type]?.canScrollRight}
                              <button 
                                  class="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center hover:bg-gray-100 border border-gray-100"
                                  on:click={() => scrollCarousel(contentGroup.type, 'right')}
                              >
                                  <img src="/icons/icon-carousel-front.svg" class="w-6 h-6 text-[#737373]" />
                              </button>
                          {/if}
                      </div>
                  </div>
              {/if}
          {/each}

          {#if contentByType.every(group => group.items.length === 0)}
              <div class="text-center py-12 bg-white rounded-[8px]">
                  <p class="text-[#737373]">No content found in this category</p>
              </div>
          {/if}
      </div>
  </div>
</div>

<!-- Delete Confirmation Dialog -->
<Dialog.Root bind:open={showDeleteDialog}>
  <Dialog.Content class="sm:max-w-[425px]">
      <Dialog.Header>
          <Dialog.Title>Delete Content</Dialog.Title>
          <Dialog.Description>
              Are you sure you want to delete this content? This action cannot be undone.
          </Dialog.Description>
      </Dialog.Header>
      
      {#if contentToDelete}
          <div class="py-4">
              <div class="flex items-center gap-3">
                  {#if contentToDelete.thumbnail}
                      <img 
                          src={getThumbnailUrl(contentToDelete)} 
                          alt={contentToDelete.title} 
                          class="w-16 h-16 object-cover rounded"
                      />
                  {:else}
                      <div class="w-16 h-16 bg-[#ECEFF3] rounded flex items-center justify-center">
                          <svelte:component 
                              this={getIcon(contentToDelete.type)} 
                              class="w-8 h-8 text-[#666666]"
                          />
                      </div>
                  {/if}
                  <div>
                      <h3 class="font-semibold">{contentToDelete.title}</h3>
                      <p class="text-sm text-gray-500">ID: {contentToDelete.id}</p>
                  </div>
              </div>
          </div>
      {/if}
      
      <Dialog.Footer>
          <Button variant="outline" on:click={() => showDeleteDialog = false}>
              Cancel
          </Button>
          <Button variant="destructive" on:click={deleteContent}>
              Delete
          </Button>
      </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  :global(body) {
    @apply bg-[#F5F5F5];
  }
  
  /* Hide scrollbar for Chrome, Safari and Opera */
  .scrollbar-hide::-webkit-scrollbar {
      display: none;
  }
</style>

