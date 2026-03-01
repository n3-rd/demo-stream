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
    }

    let {
        roomId,
        name,
        publishStreamId,
        userRole,
        baseRoomName
    }: Props = $props();

    const dispatch = createEventDispatcher();
</script>

<div
    class="w-0 lg:w-0 z-[99] md:z-auto fixed lg:relative inset-0 lg:inset-auto bg-[#666669] h-full overflow-y-auto flex flex-col transition-all duration-300 ease-in-out"
    id="chatPanel"
    style="transform: translateX(100%)"
>
    <div class="flex justify-between items-center h-full w-full p-4 border-b bg-[#9d9ca0] flex-col gap-3">
        <div class="flex items-center justify-between w-full bg-[#47484b] px-4 py-2 md:hidden">
            <div class="text-white text-lg font-semibold">Chat message</div>
            <Button variant="ghost" size="icon" on:click={() => dispatch('togglePanel', { id: 'chatPanel' })}>
                <X scale={1.3} color="#fff" />
            </Button>
        </div>
        <div class="h-full">
            <Chat roomId={roomId} {name} userId={publishStreamId} {userRole} roomName={baseRoomName} />
        </div>
    </div>
</div>
