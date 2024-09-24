<script lang="ts">
    export let participants: any;
    import { Calendar, CircleUser, Quote, ShareIcon, MicOff, Settings, Clapperboard, MessageSquareDashed, SendHorizontal, UsersRound, Mic, UserRoundPlus } from 'lucide-svelte';
    import { Button } from '$lib/components/ui/button';
    export let host;


</script>
<div class="flex justify-between items-center p-4 border-b bg-[#47484b]">
    <h2 class="text-xl font-bold text-white">Participants</h2>
</div>

<div class="max-h-full overflow-y-auto py-4 w-full flex flex-col justify-center px-4 text-white">

    <Button class="bg-[#47484b] text-white mx-auto">
        <UserRoundPlus size={16} class="" />
        Invite People
    </Button>

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
{#each participants as participant (participant.id)}
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
      {#if host}
        <span class="text-gray-100 text-xs">Demo room host</span>
      {/if}
    </div>
    {#if participant.isMuted}
      <MicOff size={16} class="text-gray-400" />
    {:else}
      <Mic size={16} class="text-green-500" />
    {/if}
  </div>
    {/each}
</div>
    </div>
</div>
</div>

  