<script lang="ts">
  export let participants: any[];
  import { ShareIcon, MicOff, Mic, UserRoundPlus, AudioLines } from 'lucide-svelte';
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from '$lib/components/ui/button';
  export let shareURL: string;
import { page } from '$app/stores';
import Share from '$lib/components/room/share.svelte';

  export let isHost: boolean;
  export let name: string;
  export let users: any[] = []; // Provide a default empty array
  const pageName = $page.url.pathname.split('/').pop().split('-').pop();
  // Create a clean URL without query parameters
  const joinURL = new URL($page.url.href).origin + new URL($page.url.href).pathname;

  $: hostUser = users.length > 0 ? users.find((user) => user.id === pageName) || users[0] : null;

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

  function getInitials(name: string): string {
    if (!name) return 'UN';
    const parts = name.split(/[_\s-]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
</script>

<div class="relative w-[340px] h-full bg-[rgba(32,33,36,0.44)] rounded-md text-white  flex flex-col">
  <!-- Header -->
  <div class="w-full h-12 bg-[rgba(32,33,36,0.44)] rounded-t-md flex items-center px-4">
    <h2 class="font-medium text-base leading-6 text-white">Participants</h2>
  </div>

  <!-- Invite People Button (only for host) -->
  {#if isHost}
    <div class="p-4">
      <Dialog.Root>
        <Dialog.Trigger>
          <button class="w-[138px] h-[29px] bg-[rgba(32,33,36,0.44)] rounded-[18px] flex items-center justify-center gap-2 cursor-pointer border-none text-white"
          id="invite-people-button"
          >
            <UserRoundPlus size={18} />
            <span class="font-medium text-sm leading-[21px]">Invite people</span>
          </button>
        </Dialog.Trigger>
        <Dialog.Content class="p-4 rounded-lg shadow-lg">
          <Share {shareURL} representative={false} />
        </Dialog.Content>
      </Dialog.Root>
    </div>
  {/if}

  <!-- In Room Section -->
  <div class="px-4 py-2">
    <h3 class="font-medium text-base leading-[18px] text-white">In room</h3>
  </div>

  <!-- Participants List -->
  <div class="px-4">
    <div class="box-border w-full bg-[#666669] border border-[#47484B] rounded-t-[3px] flex justify-between items-center p-2">
      <span class="font-medium leading-[14px] text-white">All participants</span>
      <span class="font-medium leading-[14px] text-white">({participants.length})</span>
    </div>
    
    <div class="bg-[rgba(32,33,36,0.44)] border border-[#47484B] border-t-0 rounded-b-[3px] p-2">
      {#each participants as participant}
        <div class="flex items-center mb-3 gap-2">
          <!-- Avatar -->
          {#if formatParticipantName(participant).length > 2}
            <div class="w-[50px] h-[50px] rounded-full overflow-hidden flex items-center justify-center" style="background: {participant === name ? '#A28585' : 'random'}">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(formatParticipantName(participant))}&background=random`}
                alt={`${formatParticipantName(participant)}'s avatar`}
                class="w-full h-full object-cover"
              />
            </div>
          {:else}
            <div class="w-[50px] h-[50px] rounded-full overflow-hidden flex items-center justify-center" style="background: {participant === name ? '#A28585' : 'random'}">
              <span class="font-medium text-2xl leading-[21px] text-white">{getInitials(formatParticipantName(participant))}</span>
            </div>
          {/if}
          
          <!-- Participant Info -->
          <div class="flex flex-col">
            <span class="font-medium text-base leading-[14px] text-white">
              {formatParticipantName(participant)}
              {#if isRepresentative(participant)}
                <span class="text-[#D1D1D1]"> (Rep)</span>
              {/if}
              {#if participant === name || (participant.streamId && participant.streamId === name)}
                <span class="text-[#D1D1D1]"> (You)</span>
              {/if}
            </span>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

