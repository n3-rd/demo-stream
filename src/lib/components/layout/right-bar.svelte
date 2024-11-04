<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { MessageSquareDashed, UsersRound } from "lucide-svelte";
    import { createEventDispatcher } from "svelte";
    import * as Sheet from "$lib/components/ui/sheet";
	import Participants from "$lib/call/Participants.svelte";
    const dispatch = createEventDispatcher();
    export let participants: any[];
    export let isHost: boolean;
    export let name: string;
</script>
<div class="flex flex-col gap-3 h-full justify-end">
    <!-- Right sidebar (Chat) -->
    <div
        class="w-14 h-auto bg-red flex flex-col gap-4 justify-end"
    >
    <Sheet.Root>
        <Sheet.Trigger>
            <Button
            variant="ghost"
            size="icon"
            class="w-full hover:bg-red-700"
        >
            <MessageSquareDashed scale={1.3} color="#fff" />
        </Button>
        </Sheet.Trigger>
        <Sheet.Content>
          <Sheet.Header>
            <Sheet.Title>Messages?</Sheet.Title>
            <Sheet.Description>
                Chat with your team
            </Sheet.Description>
          </Sheet.Header>
        </Sheet.Content>
      </Sheet.Root>
     
    </div>

    <div
        class="w-14 h-auto bg-red flex flex-col gap-4 justify-end"
    >
    <Sheet.Root>
        <Sheet.Trigger>
            <Button
            variant="ghost"
            size="icon"
            class="w-full hover:bg-red-700"
            on:click={() => dispatch("toggleParticipants")}
        >
            <UsersRound scale={1.3} color="#fff" />
        </Button>
        </Sheet.Trigger>
        <Sheet.Content class="bg-[#666669]">
         <Participants participants={participants} isHost={isHost} name={name} />
        </Sheet.Content>
      </Sheet.Root>
     
    </div>
</div>