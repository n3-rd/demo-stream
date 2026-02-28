<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { Button } from '$lib/components/ui/button';
    import { X } from 'lucide-svelte';
    import Participants from '$lib/call/Participants.svelte';

    export let meetingParticipants: any[];
    export let isHost: boolean;
    export let name: string;
    export let users: any[];
    export let shareURL: string;
    export let publishStreamId: string;
    export let activeSpeakerStreamId: string | null;
    /** When false, hide "Invite people" (e.g. anonymous users). */
    export let showInvitePeople = true;

    const dispatch = createEventDispatcher();
</script>

<div
    class="w-0 lg:w-0 z-[99] md:z-auto fixed lg:relative inset-0 lg:inset-auto bg-[#666669] h-full overflow-y-auto flex flex-col transition-all duration-300 ease-in-out"
    id="participantsPanel"
    style="transform: translateX(100%)"
>
    <div class="flex items-center h-full w-full p-4 border-b bg-[#9d9ca0] flex-col gap-3">
        <div class="flex items-center justify-between w-full bg-[#47484b] px-4 py-2 md:hidden">
            <div class="text-white text-lg font-semibold">Participants</div>
            <Button variant="ghost" size="icon" on:click={() => dispatch('togglePanel', { id: 'participantsPanel' })}>
                <X scale={1.3} color="#fff" />
            </Button>
        </div>
        <Participants
            participants={meetingParticipants}
            {isHost}
            {name}
            {users}
            {shareURL}
            {showInvitePeople}
            localStreamId={publishStreamId}
            activeSpeaker={activeSpeakerStreamId}
        />
    </div>
</div>
