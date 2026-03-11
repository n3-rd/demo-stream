<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { Button } from '$lib/components/ui/button';
    import { X } from 'lucide-svelte';
    import Chat from '$lib/call/Chat.svelte';

    interface Props {
        roomId: string;
        name: string;
        publishStreamId: string;
        userRole: 'host' | 'guest' | 'representative';
        baseRoomName: string;
        /** Whether the panel is currently visible.  When false the Chat component
         *  is unmounted so it doesn't trigger DOM mutations (transition:slide, etc.)
         *  for every incoming message — on mobile this would stall the WebRTC data
         *  channel and break media sync.  Messages are preserved in the global store. */
        open?: boolean;
    }

    let {
        roomId,
        name,
        publishStreamId,
        userRole,
        baseRoomName,
        open = false
    }: Props = $props();

    const dispatch = createEventDispatcher();
</script>

<div
    class="z-[99] md:z-auto fixed lg:relative inset-0 lg:inset-auto h-full flex flex-col transition-all duration-300 ease-in-out overflow-hidden"
    class:w-0={!open}
    class:lg:w-[22rem]={open}
    class:w-screen={open}
    id="chatPanel"
>
    <div class="flex justify-between items-center h-full w-[22rem] max-w-full p-4 border-b bg-[#202124] flex-col gap-3">
        <div class="flex items-center justify-between w-full bg-[#47484b] px-4 py-2 md:hidden">
            <div class="text-white text-lg font-semibold">Chat message</div>
            <Button variant="ghost" size="icon" on:click={() => dispatch('togglePanel', { id: 'chatPanel' })}>
                <X scale={1.3} color="#fff" />
            </Button>
        </div>
        <div class="h-full w-full">
            {#if open}
            <Chat roomId={roomId} {name} userId={publishStreamId} {userRole} roomName={baseRoomName} />
            {/if}
        </div>
    </div>
</div>
