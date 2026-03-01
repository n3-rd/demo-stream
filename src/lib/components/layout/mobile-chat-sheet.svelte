<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import Chat from "$lib/call/Chat.svelte";

    
    interface Props {
        roomId?: string;
        /** Base room name for AI context (viewroom/assistant lookup). */
        roomName?: string | null;
        chatName?: string | null;
        userId?: string | null;
        userRole?: 'host' | 'guest' | 'representative';
    }

    let {
        roomId = "",
        roomName = null,
        chatName = null,
        userId = null,
        userRole = 'guest'
    }: Props = $props();

    const dispatch = createEventDispatcher();

    function handleClose() {
        dispatch("close");
    }
</script>

<div class="rounded-t-2xl overflow-hidden bg-white">
    <Chat
        {roomId}
        roomName={roomName}
        name={chatName}
        {userId}
        {userRole}
        variant="mobile"
        showClose
        on:close={handleClose}
    />
</div>

