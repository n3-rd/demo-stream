<script>
    import { Button } from "$lib/components/ui/button";
    import { MessageCircleQuestion, ShareIcon } from "lucide-svelte";
    import * as Dialog from "$lib/components/ui/dialog";

    import Share from "$lib/components/room/share.svelte";
    import Notes from "$lib/components/room/notes.svelte";
    import { createEventDispatcher } from "svelte";
	import InviteRepresentative from "../room/invite-representative.svelte";
	import ScheduleMeeting from "../room/schedule-meeting.svelte";
	import CreateQuote from "../room/create-quote.svelte";
    const dispatch = createEventDispatcher();
    
    /**
     * @typedef {Object} Props
     * @property {any} scheduleOpen
     * @property {any} joinURL
     * @property {any} videoRepresentatives
     * @property {any} userId
     * @property {any} [availableRepresentatives]
     * @property {any} [room] - Add room data for filtering
     * @property {any} shareURL
     * @property {boolean} [showInviteRepresentative] - When false, hide the "Invite representative" button (e.g. host from embed).
     */

    /** @type {Props} */
    let {
        scheduleOpen,
        joinURL,
        videoRepresentatives,
        userId,
        availableRepresentatives = [],
        room = null,
        shareURL,
        showInviteRepresentative = true
    } = $props();
    
    // Add state variables for each dialog
    let representativeDialogOpen = $state(false);
    let quoteDialogOpen = false;
    
    // Calculate if scheduling should be enabled
    let canSchedule = $derived(availableRepresentatives.length > 0);
</script>
<div class="w-14 h-full bg-red flex flex-col gap-4">
    <!-- <Dialog.Root>
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
    </Dialog.Root> -->

    <!-- <Notes scale={1.3} color="#fff" /> -->

    <!-- <Button
    variant="ghost"
    size="icon"
    class="w-full hover:bg-red-700"
    id="virtual-assistant"
    >
      <img src="/icons/icon-question.svg" alt="virtual-assistant" class="w-7 h-7"/>
    </Button>  -->
    {#if showInviteRepresentative}
    <Dialog.Root bind:open={representativeDialogOpen}>
        <Dialog.Trigger>
            <Button
                variant="ghost"
                size="icon"
                class="w-full hover:bg-red-700"
                id="invite-representative"
            >
                <img
                    src="/icons/icon-representative.svg"
                    alt="user"
                    class="w-7 h-7"
                />
            </Button>
        </Dialog.Trigger>
        <Dialog.Content class="p-4 rounded-lg shadow-lg">
            <InviteRepresentative
                representatives={videoRepresentatives}
                shareURL={shareURL}
                room={room}
                on:close={() => representativeDialogOpen = false}
            />
        </Dialog.Content>
    </Dialog.Root>
    {/if}
    <!-- <Dialog.Root bind:open={scheduleOpen} class="max-w-[80vw]">
        <Dialog.Trigger>
            <Button
                variant="ghost"
                size="icon"
                class="w-full hover:bg-red-700 {!canSchedule ? 'opacity-50' : ''}"
                id="schedule-meeting"
                disabled={!canSchedule}
                title={canSchedule ? 'Schedule Meeting' : 'No representatives available for scheduling'}
            >
                <img
                    src="/icons/icon-calendar.svg"
                    alt="calendar"
                    class="w-7 h-7"
                />
            </Button>
        </Dialog.Trigger>
        <Dialog.Content
            class="p-4 rounded-lg w-full bg-transparent max-w-[90vw]"
        >
            <div class="w-full bg-transparent">
                <ScheduleMeeting
                    userId={userId || ''}
                    availableRepresentatives={videoRepresentatives}
                    roomData={room}
                    on:close={() =>{
                        dispatch("closeSchedule")
                        scheduleOpen = false
                    }}
                />
            </div>
        </Dialog.Content>
    </Dialog.Root> -->
    <!-- <Dialog.Root bind:open={quoteDialogOpen}>
        <Dialog.Trigger>
            <Button
                variant="ghost"
                size="icon"
                class="w-full hover:bg-red-700"
                id="create-quote"
            >
                <img
                    src="/icons/icon-quotes.svg"
                    alt="quote"
                    class="w-7 h-7"
                />
            </Button>
        </Dialog.Trigger>
        <Dialog.Content class="rounded-lg bg-transparent">
            <CreateQuote on:close={() => quoteDialogOpen = false} />
        </Dialog.Content>
    </Dialog.Root> -->
</div>