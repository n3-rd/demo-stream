<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { UsersRound, ShareIcon, AlertTriangle, Mic, MicOff, CameraIcon, CameraOffIcon } from "lucide-svelte";
    import { createEventDispatcher } from "svelte";
    import type { ComponentType } from "svelte";
    import * as Sheet from "$lib/components/ui/sheet";
    import * as Dialog from "$lib/components/ui/dialog";
    import Share from "../room/share.svelte";
    import MediaSelector from "$lib/components/room/MediaSelector.svelte";
    import InviteRepresentative from "../room/invite-representative.svelte";
    import ScheduleMeeting from "../room/schedule-meeting.svelte";
    import CreateQuote from "../room/create-quote.svelte";
    const MobileChatSheet = import('$lib/components/layout/mobile-chat-sheet.svelte');
    const MobileParticipantsSheet = import("$lib/components/layout/mobile-participants-sheet.svelte");
    const MobileQuoteSheet = import("$lib/components/layout/mobile-quote-sheet.svelte");
    const MobileNotesSheet = import("$lib/components/layout/mobile-notes-sheet.svelte");
	import Separator from "../ui/separator/separator.svelte";


    export let mobileSheetOpen = false;
    export let roomIdentityName: string;
    export let isMicMuted: boolean;
    export let isCameraOff: boolean;
    export let isScreenSharing = false;
    export let joinURL: string;
    export let scheduleOpen;
    export let userId: string;
    export let videoRepresentatives: string[];
    export let isHost = false;
    export let isRepresentative = false;
    export let room: any;
    export let roomName = "";
    export let roomId = "";
    /** Base room name for AI context (viewroom lookup). Same as desktop Chat roomName. */
    export let baseRoomName = "";
    /** When false, hide "Speak to Representative" (e.g. host from embed). */
    export let showInviteRepresentative = true;
    /** When false, hide "Invite People" share (e.g. anonymous users). */
    export let showInvitePeople = true;
    export let chatName: string | null = null;
    export let chatUserId: string | null = null;
    export let hostContentItems: any[] = [];
    export let repContentItems: any[] = [];
    export let participants: any[] = [];
    /** 'granted' | 'denied' | 'prompt' | 'unknown' */
    export let micPermission: string = 'unknown';
    /** 'granted' | 'denied' | 'prompt' | 'unknown' */
    export let cameraPermission: string = 'unknown';
    let userRole: 'host' | 'guest' | 'representative' = 'guest';
    $: {
        if (isHost) {
            userRole = 'host';
        } else if (isRepresentative) {
            userRole = 'representative';
        } else {
            userRole = 'guest';
        }
    }
    const dispatch = createEventDispatcher();

    type StateSnapshot = Record<string, boolean>;

    type ToggleControl = {
        key: string;
        type: "toggle";
        label: string;
        icon: string;
        event: string;
        stateKey: keyof StateSnapshot;
        activeClass: string;
        alt: { active: string; inactive: string };
    };

    type PanelControl = {
        key: string;
        type: "panel";
        label: string;
        icon: string;
        panelId: string;
        alt: string;
    };

    type PrimaryControl = ToggleControl | PanelControl;

    type SheetIcon =
        | { type: "image"; src: string; alt: string; sizeClass?: string }
        | { type: "component"; component: ComponentType; props?: Record<string, unknown> };

    type SheetDialogContent = "share" | "inviteRepresentative" | "schedule" | "createQuote";

    type SheetEntry =
        | {
              key: string;
              type: "panel";
              label: string;
              icon: SheetIcon;
              panelId: string;
          }
        | {
              key: string;
              type: "component";
              label: string;
              component: ComponentType;
          }
        | {
              key: string;
              type: "dialog";
              label: string;
              icon: SheetIcon;
              content: SheetDialogContent;
              contentClass: string;
              bindOpen?: "scheduleOpen";
          };

    const primaryControls: PrimaryControl[] = [
        {
            key: "microphone",
            type: "toggle",
            label: "Toggle microphone",
            event: "toggleMicrophone",
            icon: "/icons/new-icons/mic.png",
            stateKey: "isMicMuted",
            activeClass: "is-muted",
            alt: {
                active: "Unmute microphone",
                inactive: "Mute microphone"
            }
        },
        {
            key: "camera",
            type: "toggle",
            label: "Toggle camera",
            event: "toggleCamera",
            icon: "/icons/new-icons/cam.png",
            stateKey: "isCameraOff",
            activeClass: "is-off",
            alt: {
                active: "Turn camera on",
                inactive: "Turn camera off"
            }
        },
        {
            key: "chat",
            type: "panel",
            label: "Open chat",
            panelId: "chatPanel",
            icon: "/icons/new-icons/chat.png",
            alt: "Open chat"
        }
    ];

    const sheetEntries: SheetEntry[] = [
        {
            key: "chatPanel",
            type: "panel",
            label: "Open Chat",
            icon: { type: "image", src: "/icons/new-icons/chat-2.png", alt: "Open chat" },
            panelId: "chatPanel"
        },
        {
            key: "participantsPanel",
            type: "panel",
            label: "Participants",
            icon: { type: "image", src: "/icons/new-icons/participants.png", alt: "Participants" },
            panelId: "participantsPanel"
        },
        {
            key: "share",
            type: "dialog",
            label: "Invite People",
            icon: { type: "image", src: "/icons/new-icons/invite.png", alt: "Invite people" },
            content: "share",
            contentClass: "p-4 rounded-lg shadow-lg"
        },
        {
            key: "representative",
            type: "dialog",
            label: "Speak to Representative",
            icon: {
                type: "image",
                src: "/icons/new-icons/rep.png",
                alt: "user",
                sizeClass: "w-5 h-5"
            },
            content: "inviteRepresentative",
            contentClass: "p-4 rounded-lg shadow-lg"
        },
        // {
        //     key: "schedule",
        //     type: "dialog",
        //     label: "Book Appointment",
        //     icon: {
        //         type: "image",
        //         src: "/icons/new-icons/calendar.png",
        //         alt: "calendar",
        //         sizeClass: "w-5 h-5"
        //     },
        //     content: "schedule",
        //     contentClass: "p-4 rounded-lg w-auto bg-transparent flex flex-col gap-2",
        //     bindOpen: "scheduleOpen"
        // },
        // {
        //     key: "notesPanel",
        //     type: "panel",
        //     label: "Notes",
        //     icon: { type: "image", src: "/icons/new-icons/notes.png", alt: "Notes" },
        //     panelId: "notesPanel"
        // },
        // {
        //     key: "quotePanel",
        //     type: "panel",
        //     label: "Request a Quote",
        //     icon: {
        //         type: "image",
        //         src: "/icons/new-icons/quotes.png",
        //         alt: "quote",
        //         sizeClass: "w-5 h-5"
        //     },
        //     panelId: "quotePanel"
        // }
    ];

    $: visibleSheetEntries = sheetEntries.filter(
        (e) =>
            (e.key !== "representative" || showInviteRepresentative) &&
            (e.key !== "share" || showInvitePeople)
    );

    /** Primary controls: hide camera for non-reps. */
    $: visiblePrimaryControls = isRepresentative
        ? primaryControls
        : primaryControls.filter((c) => c.key !== "camera");

    const destructiveControl: { icon: string; label: string } = {
        icon: "/icons/new-icons/hangup.png",
        label: "Leave call"
    };

    let stateSnapshot: StateSnapshot = {};

    function getStateValue(key: keyof StateSnapshot) {
        return Boolean(stateSnapshot[key]);
    }

    function getAltText(control: PrimaryControl) {
        if (control.type === "toggle") {
            const state = getStateValue(control.stateKey);
            return state ? control.alt.active : control.alt.inactive;
        }

        return control.alt;
    }

    function handlePrimary(control: PrimaryControl) {
        if (control.type === "toggle") {
            dispatch(control.event);
            return;
        }

        if (control.type === "panel") {
            if (control.panelId === "chatPanel") {
                openSheet("chat");
                return;
            }
            if (control.panelId === "participantsPanel") {
                openSheet("participants");
                return;
            }
            if (control.panelId === "quotePanel") {
                openSheet("quote");
                return;
            }
            togglePanel(control.panelId);
        }
    }

    function handleSheetAction(entry: SheetEntry) {
        if (entry.type === "panel") {
            if (entry.panelId === "chatPanel") {
                openSheet("chat");
                return;
            }
            if (entry.panelId === "participantsPanel") {
                openSheet("participants");
                return;
            }
            if (entry.panelId === "quotePanel") {
                openSheet("quote");
                return;
            }
            if (entry.panelId === "notesPanel") {
                openSheet("notes");
                return;
            }
            togglePanel(entry.panelId);
        }
    }

    function getImageClasses(icon: SheetIcon) {
        if (icon.type !== "image") {
            return "icon";
        }

        return icon.sizeClass ? `icon ${icon.sizeClass}` : "icon";
    }

    $: stateSnapshot = {
        isMicMuted,
        isCameraOff
    };

    function togglePanel(id: string) {
        dispatch('togglePanel', { id });
    }

    let contentSheetOpen = false;
    let chatSheetOpen = false;
    let participantsSheetOpen = false;
    let quoteSheetOpen = false;
    let notesSheetOpen = false;

    function openSheet(sheet: "content" | "chat" | "participants" | "quote" | "notes") {
        contentSheetOpen = sheet === "content";
        chatSheetOpen = sheet === "chat";
        participantsSheetOpen = sheet === "participants";
        quoteSheetOpen = sheet === "quote";
        notesSheetOpen = sheet === "notes";
        mobileSheetOpen = false;
    }

    function closeSheets() {
        contentSheetOpen = false;
        chatSheetOpen = false;
        participantsSheetOpen = false;
        quoteSheetOpen = false;
        notesSheetOpen = false;
        mobileSheetOpen = false;
    }

    function handleMediaSelect(event: CustomEvent) {
        dispatch("videoSelect", event.detail);
        closeSheets();
    }

    function handleSendNotes(event: CustomEvent) {
        // Handle sending notes to email
        // The MobileNotesSheet component dispatches this event with title, requirements, steps, keep
        dispatch("sendNotes", event.detail);
        closeSheets();
    }
</script>

<div class="px-4 flex justify-center items-center">
    <Sheet.Root bind:open={contentSheetOpen}>
        <Sheet.Trigger>
            <Button

                class="fixed z-50 right-8 bottom-28 rounded bg-bgdefault-light text-white shadow-lg hover:bg-white hover:text-black lg:hidden"
            >
                Show content
            </Button>
        </Sheet.Trigger>
        <Sheet.Content
            side="bottom"
            class="bg-bgdefault text-white rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto lg:hidden [&>button]:hidden"
        >
        <div class="flex w-full justify-between items-center">
            <h2 class="text-white text-lg font-semibold">Content list</h2>
            <Button class="rounded bg-bgdefault-light text-white shadow-lg hover:bg-white hover:text-black"
            on:click={closeSheets}
            >Hide content</Button>
        </div>
            <MediaSelector
                {isHost}
                {isRepresentative}
                {room}
                {roomName}
                hostContentItems={hostContentItems}
                repContentItems={repContentItems}
                on:videoSelect={handleMediaSelect}
            />
        </Sheet.Content>
    </Sheet.Root>
    <Sheet.Root bind:open={chatSheetOpen}>
        <Sheet.Content
            side="bottom"
            class="bg-transparent text-white rounded-t-2xl p-0 max-h-[85vh] overflow-hidden lg:hidden [&>button]:hidden"
        >
            {#await MobileChatSheet then MobileChatSheet}
                <svelte:component this={MobileChatSheet.default}
                    roomId={roomId || roomName}
                    roomName={baseRoomName}
                    chatName={chatName}
                    userId={chatUserId}
                    {userRole}
                    on:close={closeSheets}
                />
            {/await}
        </Sheet.Content>
    </Sheet.Root>
    <Sheet.Root bind:open={participantsSheetOpen}>
        <Sheet.Content
            side="bottom"
            class="bg-transparent text-white rounded-t-2xl p-0 max-h-[85vh] overflow-hidden lg:hidden [&>button]:hidden"
        >
            {#await MobileParticipantsSheet then MobileParticipantsSheet}
                <svelte:component this={MobileParticipantsSheet.default}
                    {participants}
                    {isHost}
                    {showInvitePeople}
                    currentUserName={chatName ?? ""}
                    localStreamId={chatUserId}
                    shareURL={joinURL}
                    on:close={closeSheets}
                />
            {/await}
        </Sheet.Content>
    </Sheet.Root>
    <Sheet.Root bind:open={quoteSheetOpen}>
        <Sheet.Content
            side="bottom"
            class="bg-transparent text-white rounded-t-2xl p-0 max-h-[85vh] overflow-hidden lg:hidden [&>button]:hidden"
        >
            {#await MobileQuoteSheet then MobileQuoteSheet}
                <svelte:component this={MobileQuoteSheet.default} on:close={closeSheets} />
            {/await}
        </Sheet.Content>
    </Sheet.Root>
    <!-- <Sheet.Root bind:open={notesSheetOpen}>
        <Sheet.Content
            side="bottom"
            class="bg-transparent text-white rounded-t-2xl p-0 max-h-[85vh] overflow-hidden lg:hidden [&>button]:hidden"
        >
            {#await MobileNotesSheet then MobileNotesSheet}
                <svelte:component this={MobileNotesSheet.default} on:close={closeSheets} on:send={handleSendNotes} />
            {/await}
        </Sheet.Content>
    </Sheet.Root> -->
    <div
        class="lg:hidden fixed bottom-4 left-0 right-0 bg-[#5C5C5C] p-4 w-[94%] mx-auto rounded-2xl"
        class:is-sharing={isScreenSharing}
        data-room={roomIdentityName}
    >

        <div class="flex justify-between items-center">
            <!-- Primary controls -->
            <div class="flex gap-3">
                {#each visiblePrimaryControls as control (control.key)}
                    {@const permBlocked = (control.key === 'microphone' && micPermission === 'denied') || (control.key === 'camera' && cameraPermission === 'denied')}
                    {@const isMuted = !permBlocked && control.type === "toggle" && control.activeClass === "is-muted" && getStateValue(control.stateKey)}
                    {@const isOff = !permBlocked && control.type === "toggle" && control.activeClass === "is-off" && getStateValue(control.stateKey)}
                    <div class="relative">
                        <button
                            class="flex justify-center items-center rounded-full h-14 w-14 hover:bg-white hover:text-black primary-toggle-btn"
                            class:bg-red-700={permBlocked}
                            class:bg-[#707172]={!permBlocked && !isMuted && !isOff}
                            class:primary-toggle-muted={isMuted}
                            class:primary-toggle-off={isOff}
                            aria-pressed={control.type === "toggle" ? getStateValue(control.stateKey) : undefined}
                            aria-label={permBlocked ? `${control.label} (blocked — tap to request access)` : getAltText(control)}
                            title={permBlocked ? 'Permission blocked — tap to request access' : control.label}
                            on:click={() => {
                                if (permBlocked) {
                                    dispatch(control.key === 'microphone' ? 'requestMicPermission' : 'requestCameraPermission');
                                } else {
                                    handlePrimary(control);
                                }
                            }}
                        >
                            {#if control.key === 'microphone'}
                                {#if permBlocked || isMuted}
                                    <MicOff color="#fff" size={28} />
                                {:else}
                                    <Mic color="#fff" size={28} />
                                {/if}
                            {:else if control.key === 'camera'}
                                {#if permBlocked || isOff}
                                    <CameraOffIcon color="#fff" size={28} />
                                {:else}
                                    <CameraIcon color="#fff" size={28} />
                                {/if}
                            {:else}
                                <img src={control.icon} alt={getAltText(control)} class="icon h-11 w-11 primary-toggle-icon" />
                            {/if}
                        </button>
                        {#if permBlocked}
                            <span class="mobile-permission-badge" title="Permission denied">
                                <AlertTriangle size={10} color="#fff" />
                            </span>
                        {/if}
                    </div>
                {/each}
            </div>

            <!-- Secondary controls -->
            <div class="flex items-center">
                <Sheet.Root bind:open={mobileSheetOpen}>
                    <Sheet.Trigger
                        aria-label="Open more controls"
                        class="flex justify-center items-center rounded-full bg-[#707172] h-14 w-14 hover:bg-white hover:text-black"
                    >
                        <img src="/icons/new-icons/more.png" alt="More options" class="icon" />
                    </Sheet.Trigger>
                    <Sheet.Content side="bottom" class="bg-bgdefault p-6 text-white rounded-t-2xl [&>button]:hidden">
                        <div class="grid grid-cols-3 gap-y-4">
                            {#each visibleSheetEntries as entry (entry.key)}
                                <div class="flex flex-col gap-2">
                                    {#if entry.type === "panel"}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            class="w-full"
                                            on:click={() => {
                                                handleSheetAction(entry);
                                                mobileSheetOpen = false;
                                            }}
                                        >
                                            {#if entry.icon.type === "image"}
                                                <img
                                                    src={entry.icon.src}
                                                    alt={entry.icon.alt}
                                                    class={getImageClasses(entry.icon)}
                                                />
                                            {:else if entry.icon.type === "component"}
                                                <svelte:component this={entry.icon.component} {...entry.icon.props} />
                                            {/if}
                                        </Button>
                                        <div class="text-center text-xs">{entry.label}</div>
                                    {:else if entry.type === "dialog"}
                                        {#if 'bindOpen' in entry && entry.bindOpen === "scheduleOpen"}
                                            <Dialog.Root bind:open={scheduleOpen}>
                                                <Dialog.Trigger class="flex flex-col gap-2 items-center">
                                                    <Button variant="ghost" size="icon" class="w-full">
                                                        {#if entry.icon.type === "image"}
                                                            <img
                                                                src={entry.icon.src}
                                                                alt={entry.icon.alt}
                                                                class={getImageClasses(entry.icon)}
                                                            />
                                                        {:else if entry.icon.type === "component"}
                                                            <svelte:component this={entry.icon.component} {...entry.icon.props} />
                                                        {/if}
                                                    </Button>
                                                    <div class="text-center text-xs">{entry.label}</div>
                                                </Dialog.Trigger>
                                                <Dialog.Content class={entry.contentClass}>
                                                    {#if entry.content === "share"}
                                                        <Share shareURL={joinURL} representative={false} />
                                                    {:else if entry.content === "inviteRepresentative"}
                                                        <InviteRepresentative
                                                            shareURL={joinURL}
                                                            representatives={videoRepresentatives}
                                                        />
                                                    {:else if entry.content === "schedule"}
                                                        <div class="w-full bg-transparent">
                                                            <ScheduleMeeting
                                                                userId={userId || ""}
                                                                availableRepresentatives={videoRepresentatives}
                                                                roomData={room}
                                                                on:close={() => dispatch("closeSchedule")}
                                                            />
                                                        </div>
                                                    {:else if entry.content === "createQuote"}
                                                        <CreateQuote on:close={closeSheets} />
                                                    {/if}
                                                </Dialog.Content>
                                            </Dialog.Root>
                                        {:else}
                                            <Dialog.Root>
                                                <Dialog.Trigger class="flex flex-col gap-2 items-center">
                                                    <Button variant="ghost" size="icon" class="w-full">
                                                        {#if entry.icon.type === "image"}
                                                            <img
                                                                src={entry.icon.src}
                                                                alt={entry.icon.alt}
                                                                class={getImageClasses(entry.icon)}
                                                            />
                                                        {:else if entry.icon.type === "component"}
                                                            <svelte:component this={entry.icon.component} {...entry.icon.props} />
                                                        {/if}
                                                    </Button>
                                                    <div class="text-center text-xs">{entry.label}</div>
                                                </Dialog.Trigger>
                                                <Dialog.Content class={entry.contentClass}>
                                                    {#if entry.content === "share"}
                                                        <Share shareURL={joinURL} representative={false} />
                                                    {:else if entry.content === "inviteRepresentative"}
                                                        <InviteRepresentative
                                                            shareURL={joinURL}
                                                            representatives={videoRepresentatives}
                                                        />
                                                    {:else if entry.content === "schedule"}
                                                        <div class="w-full bg-transparent">
                                                            <ScheduleMeeting
                                                                userId={userId || ""}
                                                                availableRepresentatives={videoRepresentatives}
                                                                roomData={room}
                                                                on:close={() => dispatch("closeSchedule")}
                                                            />
                                                        </div>
                                                    {:else if entry.content === "createQuote"}
                                                        <CreateQuote />
                                                    {/if}
                                                </Dialog.Content>
                                            </Dialog.Root>
                                        {/if}
                                    {:else if entry.type === "component"}
                                        <Button variant="ghost" size="icon" class="w-full">
                                            <svelte:component this={entry.component} />
                                        </Button>
                                        <div class="text-center text-xs">{entry.label}</div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </Sheet.Content>
                </Sheet.Root>
            </div>
    
            <Separator orientation="vertical" class="h-full" />
            <!-- Right side controls -->
            <div class="flex gap-3">
                <Button
                    variant="destructive"
                    size="sm"
                    class="flex justify-center items-center rounded-full h-14 w-14 hover:bg-red-700"
                    aria-label={destructiveControl.label}
                    title={destructiveControl.label}
                    on:click={() => dispatch("leaveRoom")}
                >
                    <img src={destructiveControl.icon} alt={destructiveControl.label} class="icon h-14 w-14" />
                </Button>
            </div>
        </div>
    </div> 
</div>

<style>
    .icon {
        width: 38px;
        height: 38px;
        object-fit: contain;
    }

    .primary-toggle-btn.primary-toggle-muted .primary-toggle-icon,
    .primary-toggle-btn.primary-toggle-off .primary-toggle-icon {
        opacity: 0.9;
    }

    .primary-toggle-btn.primary-toggle-muted,
    .primary-toggle-btn.primary-toggle-off {
        background-color: #dc2626 !important;
    }
    :global(button[data-melt-dialog-close]),
    :global(button[data-melt-sheet-close]) {
        display: none!important;
    }

    .mobile-permission-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        width: 18px;
        height: 18px;
        background-color: #f59e0b;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
    }
    
</style>