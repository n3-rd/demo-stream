<script lang="ts">
    import CreateQuote from "$lib/components/room/create-quote.svelte";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    function handleClose() {
        dispatch("close");
    }
</script>

<div class="rounded-t-2xl bg-white p-0">
    <CreateQuote on:close={handleClose} />
</div>

