<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import Chat from "$lib/call/Chat.svelte";

    export let roomId = "";
    export let chatName: string | null = null;
    export let userId: string | null = null;
    export let userRole: 'host' | 'guest' | 'representative' = 'guest';

    const dispatch = createEventDispatcher();

    function handleClose() {
        dispatch("close");
    }
</script>

<div class="rounded-t-2xl overflow-hidden bg-white">
    <Chat
        {roomId}
        name={chatName}
        {userId}
        {userRole}
        variant="mobile"
        showClose
        on:close={handleClose}
    />
</div>

