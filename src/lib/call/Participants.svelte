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
  // export const user;
  
  $: hostUser = users.length > 0 ? users.find((user) => user.id === pageName) || users[0] : null;
  const joinURL = $page.url.href;

  console.log('participants from participants.svelte', participants);
  // console.log('users', users);
  // console.log('pageName', pageName);
  // console.log('hostUser', hostUser);
  // console.log('isHost', isHost);

  function formatParticipantName(participant: any) {
    if (typeof participant === 'string') {
        // Handle string format (e.g., "65bhhny6e38-Blopp_Studios")
        const nameWithoutPrefix = participant.split('-').pop() || '';
        return nameWithoutPrefix.replace(/_+representative/g, '').replace(/__+/g, '_');
    } else if (participant && participant.streamId) {
        // Handle object format with streamId
        const nameWithoutPrefix = participant.streamId.split('-').pop() || '';
        return nameWithoutPrefix.replace(/_+representative/g, '').replace(/__+/g, '_');
    }
    return 'Unknown User';
  }

  function isRepresentative(participant: any) {
    if (typeof participant === 'string') {
        return participant.includes('_representative');
    } else if (participant && participant.streamId) {
        return participant.streamId.includes('_representative');
    }
    return false;
  }
</script>
<div class="flex justify-between items-center p-4 border-b bg-[#666669] hidden">
  <h2 class="text-xl font-bold text-white">Participants</h2>
</div>

<div class="max-h-full overflow-y-auto py-4 w-full flex flex-col justify-center px-4 text-white bg-[#47484b]">

{#if isHost}
  <Dialog.Root>
    <Dialog.Trigger>
        
  <Button class="bg-[#9e9ba0] text-white mx-auto flex flex-row gap-2">
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

<div class="border border-[#9e9ba0] rounded-md ">
  <div class="w-full flex justify-between p-2 border-b border-[#9e9ba0]">
      <h3>All participants</h3>
      <span>({participants.length})</span>
  </div>
  <div class="p-2">
{#each participants as participant}
{console.log("participant", participant)}
<div class="flex items-center py-4">
  <img
    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(formatParticipantName(participant))}&background=random`}
    alt={`${formatParticipantName(participant)}'s avatar`}
    class="w-8 h-8 rounded-full mr-2"
  />
  <div class="flex-grow flex flex-col">
    <span class="text-sm font-medium capitalize">
      {#if isRepresentative(participant)}
        {formatParticipantName(participant)} (Representative)
      {:else}
        {formatParticipantName(participant)}
      {/if}
      {#if participant === name || (participant.streamId && participant.streamId === name)}
        <span class="text-gray-400"> (You)</span>
      {/if}
    </span>
    {#if isHost && hostUser && (participant === hostUser.name || (participant.streamId && participant.streamId === hostUser.name))}
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

