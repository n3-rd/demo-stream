<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { UsersRound, ShareIcon } from "lucide-svelte";
    import { createEventDispatcher } from "svelte";
    import type { ComponentType } from "svelte";
    import * as Sheet from "$lib/components/ui/sheet";
    import * as Dialog from "$lib/components/ui/dialog";
    import Share from "../room/share.svelte";
    import InviteRepresentative from "../room/invite-representative.svelte";
    import ScheduleMeeting from "../room/schedule-meeting.svelte";
    import Notes from "../room/notes.svelte";
    import CreateQuote from "../room/create-quote.svelte";



    export let roomIdentityName: string;
    export let isMicMuted: boolean;
    export let isCameraOff: boolean;
    export let isScreenSharing = false;
    export let joinURL: string;
    export let scheduleOpen;
    export let userId: string;
    export let videoRepresentatives: string[];
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
            icon: { type: "image", src: "/icons/new-icons/chat.png", alt: "Open chat" },
            panelId: "chatPanel"
        },
        {
            key: "participantsPanel",
            type: "panel",
            label: "Participants",
            icon: { type: "component", component: UsersRound, props: { scale: 1.3, color: "#fff" } },
            panelId: "participantsPanel"
        },
        {
            key: "share",
            type: "dialog",
            label: "Invite People",
            icon: { type: "component", component: ShareIcon, props: { scale: 1.3, color: "#fff" } },
            content: "share",
            contentClass: "p-4 rounded-lg shadow-lg"
        },
        {
            key: "representative",
            type: "dialog",
            label: "Speak to Representative",
            icon: {
                type: "image",
                src: "/icons/icon-representative.svg",
                alt: "user",
                sizeClass: "w-5 h-5"
            },
            content: "inviteRepresentative",
            contentClass: "p-4 rounded-lg shadow-lg"
        },
        {
            key: "schedule",
            type: "dialog",
            label: "Book Appointment",
            icon: {
                type: "image",
                src: "/icons/icon-calendar.svg",
                alt: "calendar",
                sizeClass: "w-5 h-5"
            },
            content: "schedule",
            contentClass: "p-4 rounded-lg w-auto bg-transparent flex flex-col gap-2",
            bindOpen: "scheduleOpen"
        },
        {
            key: "notes",
            type: "component",
            label: "Notes",
            component: Notes
        },
        {
            key: "quote",
            type: "dialog",
            label: "Request a Quote",
            icon: {
                type: "image",
                src: "/icons/icon-quotes.svg",
                alt: "quote",
                sizeClass: "w-5 h-5"
            },
            content: "createQuote",
            contentClass: "rounded-lg bg-transparent"
        }
    ];

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
            togglePanel(control.panelId);
        }
    }

    function handleSheetAction(entry: SheetEntry) {
        if (entry.type === "panel") {
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
</script>

<div class="px-4 flex justify-center items-center">
    <div
        class="lg:hidden fixed bottom-4 left-0 right-0 bg-[#666669] py-6 px-4 w-[94%] mx-auto rounded-2xl"
        class:is-sharing={isScreenSharing}
        data-room={roomIdentityName}
    >
        <div class="flex justify-between items-center">
            <!-- Primary controls -->
            <div class="flex gap-3">
                {#each primaryControls as control (control.key)}
                    <button
                        class="flex justify-center items-center rounded-full bg-[#707172] h-14 w-14 hover:bg-white hover:text-black"
                        class:is-muted={control.type === "toggle" && control.activeClass === "is-muted" && getStateValue(control.stateKey)}
                        class:is-off={control.type === "toggle" && control.activeClass === "is-off" && getStateValue(control.stateKey)}
                        aria-pressed={control.type === "toggle" ? getStateValue(control.stateKey) : undefined}
                        aria-label={getAltText(control)}
                        title={control.label}
                        on:click={() => handlePrimary(control)}
                    >
                        <img src={control.icon} alt={getAltText(control)} class="icon" />
                    </button>
                {/each}
            </div>

            <!-- Secondary controls -->
            <div class="flex items-center">
                <Sheet.Root>
                    <Sheet.Trigger
                        aria-label="Open more controls"
                        class="flex justify-center items-center rounded-full bg-[#707172] h-10 w-14 hover:bg-white hover:text-black"
                    >
                        <img src="/icons/new-icons/more.png" alt="More options" class="icon" />
                    </Sheet.Trigger>
                    <Sheet.Content side="bottom" class="bg-[#666669] p-6 text-white">
                        <div class="grid grid-cols-3 gap-y-4">
                            {#each sheetEntries as entry (entry.key)}
                                <div class="flex flex-col gap-2">
                                    {#if entry.type === "panel"}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            class="w-full"
                                            on:click={() => handleSheetAction(entry)}
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
                                                                on:close={() => dispatch("closeSchedule")}
                                                            />
                                                        </div>
                                                    {:else if entry.content === "createQuote"}
                                                        <CreateQuote />
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
    
            <!-- Right side controls -->
            <div class="flex gap-3">
               
    
                <Button
                    variant="destructive"
                    size="sm"
                    class="flex justify-center items-center rounded-full h-10 w-16 hover:bg-red-700"
                    aria-label={destructiveControl.label}
                    title={destructiveControl.label}
                    on:click={() => dispatch("leaveRoom")}
                >
                    <img src={destructiveControl.icon} alt={destructiveControl.label} class="icon" />
                </Button>
            </div>
        </div>
    </div> 
</div>

<style>
    .icon {
        width: 24px;
        height: 24px;
        object-fit: contain;
    }

    button.is-muted .icon,
    button.is-off .icon {
        filter: grayscale(1);
        opacity: 0.65;
    }

    button.is-muted,
    button.is-off {
        border: 1px solid rgba(255, 255, 255, 0.45);
    }
</style>