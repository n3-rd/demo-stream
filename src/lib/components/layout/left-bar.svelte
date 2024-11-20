<script>
    export let scheduleOpen;
    export let joinURL;
    export let videoRepresentatives;
    export let userId;
    import { Button } from "$lib/components/ui/button";
    import { ShareIcon } from "lucide-svelte";
    import * as Dialog from "$lib/components/ui/dialog";

    import Share from "$lib/components/room/share.svelte";
    import Notes from "$lib/components/room/notes.svelte";
    import { createEventDispatcher } from "svelte";
	import InviteRepresentative from "../room/invite-representative.svelte";
	import ScheduleMeeting from "../room/schedule-meeting.svelte";
	import CreateQuote from "../room/create-quote.svelte";
    const dispatch = createEventDispatcher();
</script>
<div class="w-14 h-full bg-red flex flex-col gap-4">
    <Dialog.Root>
        <Dialog.Trigger>
            <Button
                variant="ghost"
                size="icon"
                class="w-full hover:bg-red-700"
            >
                <ShareIcon scale={1.3} color="#fff" />
            </Button>
        </Dialog.Trigger>
        <Dialog.Content class="p-4 rounded-lg shadow-lg">
            <Share {joinURL} scale={1.3} color="#fff" />
        </Dialog.Content>
    </Dialog.Root>
    <Dialog.Root>
        <Dialog.Trigger>
            <Button
                variant="ghost"
                size="icon"
                class="w-full hover:bg-red-700"
            >
                <img
                    src="/icons/icon-representative.svg"
                    alt="user"
                    class="w-5 h-5"
                />
            </Button>
        </Dialog.Trigger>
        <Dialog.Content class="p-4 rounded-lg shadow-lg">
            <InviteRepresentative
                representatives={videoRepresentatives}
            />
        </Dialog.Content>
    </Dialog.Root>
    <Dialog.Root bind:open={scheduleOpen}>
        <Dialog.Trigger>
            <Button
                variant="ghost"
                size="icon"
                class="w-full hover:bg-red-700"
            >
                <img
                    src="/icons/icon-calendar.svg"
                    alt="calendar"
                    class="w-5 h-5"
                />
            </Button>
        </Dialog.Trigger>
        <Dialog.Content
            class="p-4 rounded-lg w-auto bg-transparent"
        >
            <div class="w-full bg-transparent">
                <ScheduleMeeting
                    userId={userId || ''}
                    on:close={() => dispatch("closeSchedule")}
                />
            </div>
        </Dialog.Content>
    </Dialog.Root>
    <Notes scale={1.3} color="#fff" />
    <Dialog.Root>
        <Dialog.Trigger>
            <Button
                variant="ghost"
                size="icon"
                class="w-full hover:bg-red-700"
            >
                <img
                    src="/icons/icon-quotes.svg"
                    alt="quote"
                    class="w-5 h-5"
                />
            </Button>
        </Dialog.Trigger>
        <Dialog.Content class="rounded-lg bg-transparent">
            <CreateQuote />
        </Dialog.Content>
    </Dialog.Root>
</div>