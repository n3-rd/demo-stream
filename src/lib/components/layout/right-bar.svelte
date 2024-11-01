<script>
    import { Button } from "$lib/components/ui/button";
    import { MessageSquareDashed, UsersRound } from "lucide-svelte";
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();
</script>
<div class="flex flex-col gap-3 h-full justify-end">
    <!-- Right sidebar (Chat) -->
    <div
        class="w-14 h-auto bg-red flex flex-col gap-4 justify-end"
    >
        <Button
            variant="ghost"
            size="icon"
            class="w-full hover:bg-red-700"
            on:click={() => dispatch("toggleChat")}
        >
            <MessageSquareDashed scale={1.3} color="#fff" />
        </Button>
    </div>

    <div
        class="w-14 h-auto bg-red flex flex-col gap-4 justify-end"
    >
        <Button
            variant="ghost"
            size="icon"
            class="w-full hover:bg-red-700"
            on:click={() => dispatch("toggleParticipants")}
        >
            <UsersRound scale={1.3} color="#fff" />
        </Button>
    </div>
</div>