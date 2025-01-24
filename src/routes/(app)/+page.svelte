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

  function handleJoinRoom() {
    goto(`/room/${room.id}`);
  }

  function handleRoomInfo() {
    goto(`/room/${room.id}/info`);
  }

  onMount(() => {
    loading = false;
  });
</script>

<div class="flex bg-gray-100 overflow-hidden">
  <Sidenav activePage="dashboard" />


</div>

<style>
  :global(body) {
    @apply bg-gray-100;
  }
</style>

