<script lang="ts">
  import { ShareIcon, MicOff, Mic, UserRoundPlus, AudioLines } from 'lucide-svelte';
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from '$lib/components/ui/button';
import { page } from '$app/stores';
import Share from '$lib/components/room/share.svelte';

  
  interface Props {
    participants: any[];
    shareURL: string;
    isHost: boolean;
    name: string;
    localStreamId?: string;
    users?: any[]; // Provide a default empty array
    activeSpeaker?: string | null;
    /** When false, hide "Invite people" (e.g. anonymous users). */
    showInvitePeople?: boolean;
  }

  let {
    participants,
    shareURL,
    isHost,
    name,
    localStreamId = "",
    users = [],
    activeSpeaker = null,
    showInvitePeople = true
  }: Props = $props();
  const pageName = $page.url.pathname.split('/').pop().split('-').pop();
  // Create a clean URL without query parameters
  const joinURL = new URL($page.url.href).origin + new URL($page.url.href).pathname;

  let hostUser = $derived(users.length > 0 ? users.find((user) => user.id === pageName) || users[0] : null);

  function formatParticipantName(participant: any) {
    if (typeof participant === 'string') {
        const nameWithoutPrefix = participant.split('-').pop() || '';
        return nameWithoutPrefix.replace(/_+representative/g, '').replace(/__+/g, '_');
    } else if (participant && participant.streamId) {
        const nameWithoutPrefix = participant.streamId.split('-').pop() || '';
        return nameWithoutPrefix.replace(/_+representative/g, '').replace(/__+/g, '_');
    }
    return 'Unknown User';
  }

  // Helper function to get clean name for comparison
  function getCleanName(inputName: any): string {
    if (!inputName) return '';
    
    // Handle different input types
    let nameStr = '';
    if (typeof inputName === 'string') {
      nameStr = inputName;
    } else if (inputName && typeof inputName === 'object') {
      // If it's an object, try to get the name from streamId or other properties
      if (inputName.streamId) {
        nameStr = inputName.streamId.split('-').pop() || '';
      } else if (inputName.name) {
        nameStr = inputName.name;
      }
    }
    
    if (!nameStr) return '';
    return nameStr.replace(/_+representative/g, '').replace(/__+/g, '_');
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

  function isSpeaking(participant: any): boolean {
    if (!activeSpeaker) return false;
    const streamId = typeof participant === 'string' ? participant : participant?.streamId;
    return !!streamId && streamId === activeSpeaker;
  }
</script>

<div class="relative w-[340px] h-full bg-[rgba(32,33,36,0.44)] rounded-md text-white  flex flex-col">
  <!-- Header -->
  <div class="w-full h-12 bg-[rgba(32,33,36,0.44)] rounded-t-md flex items-center px-4">
    <h2 class="font-medium text-base leading-6 text-white">Participants</h2>
  </div>

  <!-- Invite People Button (only for host when allowed) -->
  {#if isHost && showInvitePeople}
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
            <div class="w-[50px] h-[50px] rounded-full overflow-hidden flex items-center justify-center" style="background: {(localStreamId && participant.streamId && participant.streamId.startsWith(localStreamId)) || getCleanName(participant) === getCleanName(name) ? '#A28585' : 'random'}">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(formatParticipantName(participant))}&background=random`}
                alt={`${formatParticipantName(participant)}'s avatar`}
                class="w-full h-full object-cover"
              />
            </div>
          {:else}
            <div class="w-[50px] h-[50px] rounded-full overflow-hidden flex items-center justify-center" style="background: {(localStreamId && participant.streamId && participant.streamId.startsWith(localStreamId)) || getCleanName(participant) === getCleanName(name) ? '#A28585' : 'random'}">
              <span class="font-medium text-2xl leading-[21px] text-white">{getInitials(formatParticipantName(participant))}</span>
            </div>
          {/if}
          
          <!-- Participant Info -->
          <div class="flex flex-col">
            <span class="font-medium text-base leading-[14px] text-white">
              {formatParticipantName(participant)}
              {#if isHost && (getCleanName(participant) === getCleanName(name) || (participant.streamId && participant.streamId.endsWith(`-${name}`)))}
                <span class="text-[#D1D1D1]"> (Host)</span>
              {:else if isRepresentative(participant)}
                <span class="text-[#D1D1D1]"> (Rep)</span>
              {/if}
              {#if (localStreamId && participant.streamId && participant.streamId.startsWith(localStreamId)) || getCleanName(participant) === getCleanName(name)}
                <span class="text-[#D1D1D1]"> (You)</span>
              {/if}
            </span>
          </div>
          {#if isSpeaking(participant)}
            <span class="ml-auto speaking-indicator" title="Speaking">
              <AudioLines size={18} color="#4ade80" />
            </span>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

