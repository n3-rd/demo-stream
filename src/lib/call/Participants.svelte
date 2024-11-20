<script lang="ts">
    export let participants: any[];
    import { ShareIcon, MicOff, Mic, UserRoundPlus, AudioLines } from 'lucide-svelte';
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from '$lib/components/ui/button';
	import { page } from '$app/stores';
  import Share from '$lib/components/room/share.svelte';

    export let isHost: boolean;
    export let name: string;
    export let users: any[] = []; // Provide a default empty array
    const pageName = $page.url.pathname.split('/').pop().split('-').pop();
    
    $: hostUser = users.length > 0 ? users.find((user) => user.id === pageName) || users[0] : null;
    const joinURL = $page.url.href;


    // console.log('users', users);
    // console.log('pageName', pageName);
    // console.log('hostUser', hostUser);
    // console.log('isHost', isHost);
</script>
<div class="flex justify-between items-center p-4 border-b bg-[#666669]">
    <h2 class="text-xl font-bold text-white">Participants</h2>
</div>

<div class="max-h-full overflow-y-auto py-4 w-full flex flex-col justify-center px-4 text-white">

{#if isHost}
    <Dialog.Root>
      <Dialog.Trigger>
          
    <Button class="bg-[#47484b] text-white mx-auto flex flex-row gap-2">
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
      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(participant.split('-').pop())}&background=random`}
      alt={`${participant.split('-').pop()}'s avatar`}
      class="w-8 h-8 rounded-full mr-2"
    />
    <div class="flex-grow flex flex-col">
      <span class="text-sm font-medium capitalize">
        {#if participant.includes('Representative')}
          {participant.split('-').pop().replace('Representative', '').replace(/_/g, ' ')} (Representative)
        {:else}
          {participant.split('-').pop().replace(/_/g, ' ')}
        {/if}
        {#if participant === name}
          <span class="text-gray-400"> (You)</span>
        {/if}
      </span>
      {#if isHost && hostUser && participant === hostUser.name}
        <span class="text-gray-100 text-xs">Demo room host</span>
      {/if}
    </div>
    <div class="flex flex-row gap-2 items-center">
    </div>
  </div>
    {/each}
</div>
    </div>
    </div>  
</div>

  