<script lang="ts">
    import { run } from 'svelte/legacy';

    import { fade } from 'svelte/transition';
    import { fly } from 'svelte/transition';
    import { AlertTriangle, Mic, MicOff, CameraIcon, CameraOffIcon } from "lucide-svelte";
    import { createEventDispatcher } from "svelte";
    import type { ComponentType } from "svelte";
    import Share from "../room/share.svelte";
    import MediaSelector from "$lib/components/room/MediaSelector.svelte";
    import InviteRepresentative from "../room/invite-representative.svelte";
    import ScheduleMeeting from "../room/schedule-meeting.svelte";
    import CreateQuote from "../room/create-quote.svelte";
    const MobileParticipantsSheet = import("$lib/components/layout/mobile-participants-sheet.svelte");
    const MobileQuoteSheet = import("$lib/components/layout/mobile-quote-sheet.svelte");
    const MobileNotesSheet = import("$lib/components/layout/mobile-notes-sheet.svelte");
    import Chat from '$lib/call/Chat.svelte';
    import { chatMessages } from '$lib/stores/chatMessages';
    import { isCurrentUserMessage } from '$lib/utils/chat';
    import { anonymousUser } from '$lib/stores/anonymousUser';
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';

    interface Props {
        mobileSheetOpen?: boolean;
        roomIdentityName: string;
        isMicMuted: boolean;
        isCameraOff: boolean;
        isScreenSharing?: boolean;
        joinURL: string;
        scheduleOpen: any;
        userId: string;
        videoRepresentatives: string[];
        isHost?: boolean;
        isRepresentative?: boolean;
        room: any;
        roomName?: string;
        roomId?: string;
        /** Base room name for AI context (viewroom lookup). Same as desktop Chat roomName. */
        baseRoomName?: string;
        /** When false, hide "Speak to Representative" (e.g. host from embed). */
        showInviteRepresentative?: boolean;
        /** When false, hide "Invite People" share (e.g. anonymous users). */
        showInvitePeople?: boolean;
        chatName?: string | null;
        chatUserId?: string | null;
        hostContentItems?: any[];
        repContentItems?: any[];
        participants?: any[];
        /** 'granted' | 'denied' | 'prompt' | 'unknown' */
        micPermission?: string;
        /** 'granted' | 'denied' | 'prompt' | 'unknown' */
        cameraPermission?: string;
        /** Bindable: whether the mobile chat sheet is currently open */
        mobileChatOpen?: boolean;
        /** Whether the app is in fullscreen mode (raises sheet z-indexes above fullscreen overlay) */
        isFullscreen?: boolean;
    }

    let {
        mobileSheetOpen = $bindable(false),
        roomIdentityName,
        isMicMuted,
        isCameraOff,
        isScreenSharing = false,
        joinURL,
        scheduleOpen = $bindable(),
        userId,
        videoRepresentatives,
        isHost = false,
        isRepresentative = false,
        room,
        roomName = "",
        roomId = "",
        baseRoomName = "",
        showInviteRepresentative = true,
        showInvitePeople = true,
        chatName = null,
        chatUserId = null,
        hostContentItems = [],
        repContentItems = [],
        participants = [],
        micPermission = 'unknown',
        cameraPermission = 'unknown',
        mobileChatOpen = $bindable(false),
        isFullscreen = false
    }: Props = $props();
    let userRole: 'host' | 'guest' | 'representative' = $state('guest');
    run(() => {
        if (isHost) {
            userRole = 'host';
        } else if (isRepresentative) {
            userRole = 'representative';
        } else {
            userRole = 'guest';
        }
    });
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

    let visibleSheetEntries = $derived(sheetEntries.filter(
        (e) =>
            (e.key !== "representative" || showInviteRepresentative) &&
            (e.key !== "share" || showInvitePeople)
    ));

    /** Primary controls: hide camera for non-reps. */
    let visiblePrimaryControls = $derived(isRepresentative
        ? primaryControls
        : primaryControls.filter((c) => c.key !== "camera"));

    const destructiveControl: { icon: string; label: string } = {
        icon: "/icons/new-icons/hangup.png",
        label: "Leave call"
    };

    let stateSnapshot: StateSnapshot = $state({});

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
                if (chatSheetOpen) { closeSheets(); } else { openSheet("chat"); }
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

    run(() => {
        stateSnapshot = {
            isMicMuted,
            isCameraOff
        };
    });

    function togglePanel(id: string) {
        dispatch('togglePanel', { id });
    }

    let contentSheetOpen = $state(false);
    let chatSheetOpen = $state(false);
    let participantsSheetOpen = $state(false);

    // Sync chatSheetOpen ↔ mobileChatOpen (bindable) bidirectionally
    $effect(() => { mobileChatOpen = chatSheetOpen; });
    $effect(() => { if (mobileChatOpen !== chatSheetOpen) chatSheetOpen = mobileChatOpen; });
    let quoteSheetOpen = $state(false);
    let notesSheetOpen = false;
    /** Which dialog content is open from the more sheet (share | inviteRepresentative). */
    let openDialogContent = $state<SheetDialogContent | null>(null);

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
        openDialogContent = null;
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

    // ── Unread chat indicator (mirrors desktop right-bar logic) ──
    let unreadCount = $state(0);
    let lastMessageCount = 0;
    let unsubscribeChat: (() => void) | undefined;
    const chatNameRef = { current: '' };
    run(() => { chatNameRef.current = chatName || ''; });

    onMount(() => {
        if (!browser) return;
        unsubscribeChat = chatMessages.subscribe(messages => {
            if (messages.length > lastMessageCount) {
                const newMessages = messages.slice(lastMessageCount);
                if (!chatSheetOpen) {
                    const incoming = newMessages.filter(msg =>
                        !isCurrentUserMessage(msg.name, chatNameRef.current || $anonymousUser, msg.senderId, chatUserId)
                    );
                    if (incoming.length > 0) unreadCount += incoming.length;
                }
            }
            lastMessageCount = messages.length;
        });
    });

    // Clear unread when chat opens
    $effect(() => { if (chatSheetOpen) unreadCount = 0; });

    onDestroy(() => { unsubscribeChat?.(); });
</script>

<div class="px-4 flex justify-center items-center">
    <!-- Content sheet (Show content) — only for hosts/reps -->
    {#if (isHost || isRepresentative) && !isFullscreen}
    <button
        type="button"
        class="fixed right-8 bottom-28 rounded bg-bgdefault-light text-white shadow-lg hover:bg-white hover:text-black lg:hidden {isFullscreen ? 'z-[220]' : 'z-50'}"
        onclick={() => (contentSheetOpen = true)}
    >
        Show content
    </button>
    {/if}
    {#if contentSheetOpen}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="fixed inset-0 bg-black/50 lg:hidden {isFullscreen ? 'z-[220]' : 'z-[60]'}"
            transition:fade={{ duration: 150 }}
            role="presentation"
            onmousedown={closeSheets}
            ontouchstart={closeSheets}
        ></div>
        <div
            class="fixed inset-x-0 bottom-0 bg-bgdefault text-white rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto lg:hidden {isFullscreen ? 'z-[221]' : 'z-[61]'}"
            transition:fly={{ y: '100%', duration: 300 }}
        >
            <div class="flex w-full justify-between items-center">
                <h2 class="text-white text-lg font-semibold">Content list</h2>
                <button
                    type="button"
                    class="rounded bg-bgdefault-light text-white shadow-lg hover:bg-white hover:text-black px-4 py-2 text-sm font-medium"
                    onclick={closeSheets}
                >Hide content</button>
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
        </div>
    {/if}
    <!-- Only mount Chat when the sheet is open.  Messages are stored in the global
         chatMessages store (updated by the page-level handleChatMessage), so nothing
         is lost while the component is unmounted.  Previously the Chat was always
         mounted inside an `inert` container; DOM mutations there triggered expensive
         accessibility-tree rebuilds on mobile Chrome that blocked the main thread and
         disrupted the WebRTC data channel, breaking both chat delivery and media sync. -->
    {#if chatSheetOpen}
    <div
        role="dialog"
        class="fixed inset-x-0 bg-transparent text-white p-0 lg:hidden shadow-lg mobile-chat-panel {isFullscreen ? 'z-[220]' : 'z-50'}"
        onmousedown={(e) => e.stopPropagation()}
        ontouchstart={(e) => e.stopPropagation()}
        onkeydown={(e) => { if (e.key === 'Escape') closeSheets(); }}
    >
        <div class="bg-white rounded-t-xl h-full flex flex-col overflow-hidden">
            <Chat
                roomId={roomId || roomName}
                roomName={baseRoomName}
                name={chatName}
                userId={chatUserId}
                {userRole}
                variant="mobile"
                showClose
                onclose={closeSheets}
            />
        </div>
    </div>
    {/if}
    {#if participantsSheetOpen}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="fixed inset-0 bg-black/50 lg:hidden {isFullscreen ? 'z-[220]' : 'z-[60]'}"
            transition:fade={{ duration: 150 }}
            role="presentation"
            onmousedown={closeSheets}
            ontouchstart={closeSheets}
        ></div>
        <div
            class="fixed inset-x-0 bottom-0 bg-transparent text-white rounded-t-2xl p-0 max-h-[85vh] overflow-hidden lg:hidden {isFullscreen ? 'z-[221]' : 'z-[61]'}"
            transition:fly={{ y: '100%', duration: 300 }}
        >
            {#await MobileParticipantsSheet then MobileParticipantsSheet}
                <MobileParticipantsSheet.default
                    {participants}
                    {isHost}
                    {showInvitePeople}
                    currentUserName={chatName ?? ""}
                    localStreamId={chatUserId}
                    shareURL={joinURL}
                    on:close={closeSheets}
                />
            {/await}
        </div>
    {/if}
    {#if quoteSheetOpen}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="fixed inset-0 bg-black/50 lg:hidden {isFullscreen ? 'z-[220]' : 'z-[60]'}"
            transition:fade={{ duration: 150 }}
            role="presentation"
            onmousedown={closeSheets}
            ontouchstart={closeSheets}
        ></div>
        <div
            class="fixed inset-x-0 bottom-0 bg-transparent text-white rounded-t-2xl p-0 max-h-[85vh] overflow-hidden lg:hidden {isFullscreen ? 'z-[221]' : 'z-[61]'}"
            transition:fly={{ y: '100%', duration: 300 }}
        >
            {#await MobileQuoteSheet then MobileQuoteSheet}
                <MobileQuoteSheet.default on:close={closeSheets} />
            {/await}
        </div>
    {/if}
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
        class="lg:hidden fixed left-0 right-0 bg-[#5C5C5C] p-4 w-[94%] mx-auto rounded-2xl mobile-bottom-bar"
        class:chat-open={chatSheetOpen}
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
                            onclick={() => {
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
                        {#if control.key === 'chat' && unreadCount > 0}
                            <span class="mobile-chat-badge">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        {/if}
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
                <button
                    type="button"
                    aria-label="Open more controls"
                    class="flex justify-center items-center rounded-full bg-[#707172] h-14 w-14 hover:bg-white hover:text-black"
                    onclick={() => (mobileSheetOpen = true)}
                >
                    <img src="/icons/new-icons/more.png" alt="More options" class="icon" />
                </button>
            </div>

            <!-- Vertical divider -->
            <div class="bg-border shrink-0 min-h-full w-[1px] h-full" aria-hidden="true"></div>

            <!-- Right side controls -->
            <div class="flex gap-3">
                <button
                    type="button"
                    class="flex justify-center items-center rounded-full h-14 w-14 bg-destructive text-destructive-foreground hover:bg-red-700"
                    aria-label={destructiveControl.label}
                    title={destructiveControl.label}
                    onclick={() => dispatch("leaveRoom")}
                >
                    <img src={destructiveControl.icon} alt={destructiveControl.label} class="icon h-14 w-14" />
                </button>
            </div>
        </div>
    </div>

    <!-- More sheet (bottom) -->
    {#if mobileSheetOpen}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="fixed inset-0 bg-black/50 lg:hidden {isFullscreen ? 'z-[220]' : 'z-[60]'}"
            transition:fade={{ duration: 150 }}
            role="presentation"
            onmousedown={() => (mobileSheetOpen = false)}
            ontouchstart={() => (mobileSheetOpen = false)}
        ></div>
        <div
            class="fixed inset-x-0 bottom-0 bg-bgdefault p-6 text-white rounded-t-2xl lg:hidden {isFullscreen ? 'z-[221]' : 'z-[61]'}"
            transition:fly={{ y: '100%', duration: 300 }}
        >
            <div class="grid grid-cols-3 gap-y-4">
                {#each visibleSheetEntries as entry (entry.key)}
                    <div class="flex flex-col gap-2">
                        {#if entry.type === "panel"}
                            <button
                                type="button"
                                class="inline-flex items-center justify-center h-10 w-10 w-full rounded-md hover:bg-accent hover:text-accent-foreground text-white"
                                onclick={() => {
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
                                    <svelte:component this={entry.icon.component} {...entry.icon.props ?? {}} />
                                {/if}
                            </button>
                            <div class="text-center text-xs">{entry.label}</div>
                        {:else if entry.type === "dialog"}
                            <button
                                type="button"
                                class="flex flex-col gap-2 items-center w-full"
                                onclick={() => {
                                    mobileSheetOpen = false;
                                    openDialogContent = entry.content;
                                }}
                            >
                                <span class="inline-flex items-center justify-center h-10 w-10 w-full rounded-md hover:bg-accent hover:text-accent-foreground text-white">
                                    {#if entry.icon.type === "image"}
                                        <img
                                            src={entry.icon.src}
                                            alt={entry.icon.alt}
                                            class={getImageClasses(entry.icon)}
                                        />
                                    {:else if entry.icon.type === "component"}
                                        <svelte:component this={entry.icon.component} {...entry.icon.props ?? {}} />
                                    {/if}
                                </span>
                                <div class="text-center text-xs">{entry.label}</div>
                            </button>
                        {:else if entry.type === "component"}
                            <button
                                type="button"
                                class="inline-flex items-center justify-center h-10 w-10 w-full rounded-md hover:bg-accent hover:text-accent-foreground text-white"
                            >
                                <svelte:component this={entry.component} />
                            </button>
                            <div class="text-center text-xs">{entry.label}</div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <!-- Dialog overlay for Share / Invite Representative (from more sheet) -->
    {#if openDialogContent}
        {@const dialogEntry = visibleSheetEntries.find((e) => e.type === 'dialog' && e.content === openDialogContent)}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="fixed inset-0 bg-[#2f2f2fe6]/90 {isFullscreen ? 'z-[230]' : 'z-[70]'}"
            transition:fade={{ duration: 150 }}
            role="presentation"
            onmousedown={() => (openDialogContent = null)}
            ontouchstart={() => (openDialogContent = null)}
        ></div>
        <div
            class="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 {isFullscreen ? 'z-[231]' : 'z-[71]'} {dialogEntry?.type === 'dialog' ? dialogEntry.contentClass : 'p-4 rounded-lg shadow-lg'} p-6 sm:rounded-lg"
            transition:fly={{ y: 10, duration: 200 }}
            onmousedown={(e) => e.stopPropagation()}
            ontouchstart={(e) => e.stopPropagation()}
        >
            {#if openDialogContent === "share"}
                <Share shareURL={joinURL} representative={false} />
            {:else if openDialogContent === "inviteRepresentative"}
                <InviteRepresentative
                    shareURL={joinURL}
                    representatives={videoRepresentatives}
                />
            {:else if openDialogContent === "schedule"}
                <div class="w-full bg-transparent">
                    <ScheduleMeeting
                        userId={userId || ""}
                        availableRepresentatives={videoRepresentatives}
                        roomData={room}
                        on:close={() => { dispatch("closeSchedule"); openDialogContent = null; }}
                    />
                </div>
            {:else if openDialogContent === "createQuote"}
                <CreateQuote on:close={() => (openDialogContent = null)} />
            {/if}
        </div>
    {/if} 
</div>

<style>
    .icon {
        width: 38px;
        height: 38px;
        object-fit: contain;
    }

    /* Prevent double-tap zoom and reduce 300ms click delay on mobile */
    button {
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
    }

    .primary-toggle-btn.primary-toggle-muted .primary-toggle-icon,
    .primary-toggle-btn.primary-toggle-off .primary-toggle-icon {
        opacity: 0.9;
    }

    .primary-toggle-btn.primary-toggle-muted,
    .primary-toggle-btn.primary-toggle-off {
        background-color: #dc2626 !important;
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

    /* Position bottom bar above safe area (browser navigation bar on iOS/Android) */
    .mobile-bottom-bar {
        bottom: 1rem;
        bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
        transition: bottom 0.25s ease;
    }

    /* Shift controls bar up when chat is open */
    .mobile-bottom-bar.chat-open {
        bottom: calc(16rem + env(safe-area-inset-bottom, 0px));
    }

    /* Chat panel sits above safe-area, below the controls bar */
    :global(.mobile-chat-panel) {
        bottom: 0;
        height: 15rem;
    }

    .mobile-chat-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        background-color: #dc2626;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 700;
        color: #fff;
        pointer-events: none;
        animation: pulse-badge 2s infinite;
    }

    @keyframes pulse-badge {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
    }
</style>