<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { Button } from '$lib/components/ui/button';
    import { X } from 'lucide-svelte';
    import Participants from '$lib/call/Participants.svelte';

    
    interface Props {
        meetingParticipants: any[];
        isHost: boolean;
        name: string;
        users: any[];
        shareURL: string;
        publishStreamId: string;
        activeSpeakerStreamId: string | null;
        /** When false, hide "Invite people" (e.g. anonymous users). */
        showInvitePeople?: boolean;
        open?: boolean;
    }

    let {
        meetingParticipants,
        isHost,
        name,
        users,
        shareURL,
        publishStreamId,
        activeSpeakerStreamId,
        showInvitePeople = true,
        open = false
    }: Props = $props();

    const dispatch = createEventDispatcher();
</script>

<div
    class="z-[99] md:z-auto fixed lg:relative inset-0 lg:inset-auto h-full flex flex-col transition-all duration-300 ease-in-out overflow-hidden"
    class:w-0={!open}
    class:lg:w-[22rem]={open}
    class:w-screen={open}
    id="participantsPanel"
>
    <div class="flex items-center h-full w-[22rem] max-w-full p-4 border-b bg-[#202124] flex-col gap-3">
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
