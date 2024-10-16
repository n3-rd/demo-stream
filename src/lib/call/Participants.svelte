<script lang="ts">
    export let participants: any[];
    import { ShareIcon, MicOff, Mic, UserRoundPlus, AudioLines } from 'lucide-svelte';
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from '$lib/components/ui/button';
	import { page } from '$app/stores';
  import Share from '$lib/components/room/share.svelte';
	import { activeSpeaker } from '$lib/callStores';

    export let isHost: boolean;
    export let name: string;
    export let users: any[] = []; // Provide a default empty array
    const pageName = $page.url.pathname.split('/').pop().split('-').pop();
    
    $: hostUser = users.length > 0 ? users.find((user) => user.id === pageName) || users[0] : null;
    const joinURL = $page.url.href;


    console.log('users', users);
    console.log('pageName', pageName);
    console.log('hostUser', hostUser);
</script>
<div class="flex justify-between items-center p-4 border-b bg-[#47484b]">
    <h2 class="text-xl font-bold text-white">Participants</h2>
</div>

<div class="max-h-full overflow-y-auto py-4 w-full flex flex-col justify-center px-4 text-white">

{#if isHost && hostUser}
    <Dialog.Root>
      <Dialog.Trigger>
          
    <Button class="bg-[#47484b] text-white mx-auto">
      <UserRoundPlus size={16} class="" />
        Invite People
    </Button>
      </Dialog.Trigger>
      <Dialog.Content class="p-4 rounded-lg shadow-lg">
          <Share {joinURL} representative={false} />
      </Dialog.Content>
  </Dialog.Root>
{/if}

    <div class="pt-4">
        <h2>In room</h2>
    </div>

<div class="space-y-2">

<div class="border border-[#47484b] rounded-md ">
    <div class="w-full flex justify-between p-2 border-b border-[#47484b]">
        <h3>All participants</h3>
        <span>({participants.length})</span>
    </div>
    <div class="p-2">
{#each participants as participant}
  <div class="flex items-center py-4">
    <img
      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(participant.user_name)}&background=random`}
      alt={`${participant.user_name}'s avatar`}
      class="w-8 h-8 rounded-full mr-2"
    />
    <div class="flex-grow flex flex-col">
      <span class="text-sm font-medium">
        {participant.user_name}
        {#if participant.user_name === name}
          <span class="text-gray-400"> (You)</span>
        {/if}
      </span>
      {#if isHost && hostUser && participant.user_name === hostUser.name}
        <span class="text-gray-100 text-xs">Demo room host</span>
      {/if}
    </div>
    <div class="flex flex-row gap-2 items-center">
    {#if $activeSpeaker === participant.session_id}
    <AudioLines size={16} class="text-green-500  animate-pulse" />
    {/if}
    {#if participant.isMuted}
      <MicOff size={16} class="text-gray-400" />
    {:else}
      <Mic size={16} class="text-green-500" />
    {/if}
    </div>
  </div>
    {/each}
</div>
    </div>
    </div>  
</div>

  