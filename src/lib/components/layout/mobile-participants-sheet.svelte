<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { Mic, MicOff, Video, VideoOff, MessageCircle, X } from "lucide-svelte";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import Share from "$lib/components/room/share.svelte";

    
    interface Props {
        participants?: any[];
        isHost?: boolean;
        /** When false, hide "Invite people" (e.g. anonymous users). */
        showInvitePeople?: boolean;
        currentUserName?: string | null;
        localStreamId?: string | null;
        shareURL?: string;
    }

    let {
        participants = [],
        isHost = false,
        showInvitePeople = true,
        currentUserName = null,
        localStreamId = null,
        shareURL = ""
    }: Props = $props();

    const dispatch = createEventDispatcher();
    let inviteDialogOpen = $state(false);

    function closeSheet() {
        dispatch("close");
    }

    function normalizeName(raw: unknown): string {
        if (!raw) return "";
        if (typeof raw === "string") {
            return raw.split("-").pop()?.replace(/_+representative$/i, "")?.replace(/_/g, " ").trim() ?? raw;
        }

        if (typeof raw === "object") {
            const obj = raw as Record<string, unknown>;
            if (typeof obj.name === "string" && obj.name) {
                return obj.name;
            }
            if (typeof obj.streamName === "string" && obj.streamName) {
                return obj.streamName;
            }
            if (typeof obj.streamId === "string" && obj.streamId) {
                return obj.streamId.split("-").pop()?.replace(/_+representative$/i, "")?.replace(/_/g, " ").trim() ?? obj.streamId;
            }
        }

        return String(raw);
    }

    function getInitials(name: string): string {
        if (!name) return "UN";
        const parts = name.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        if (parts.length === 1 && parts[0].length >= 2) {
            return parts[0].slice(0, 2).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    }

    function isCurrentUser(participant: any): boolean {
        // First try to match by unique stream ID
        if (localStreamId && participant?.streamId && participant.streamId.startsWith(localStreamId)) {
            return true;
        }

        if (!currentUserName) return false;
        const normalized = normalizeName(participant?.name ?? participant?.streamName ?? participant?.streamId ?? participant);
        const normalizedCurrent = normalizeName(currentUserName);
        return normalized.toLowerCase() === normalizedCurrent.toLowerCase();
    }

    function getSecondaryLabel(participant: any): string | null {
        const tags: string[] = [];
        if (isCurrentUser(participant)) {
            tags.push("You");
        }
        if (participant?.isHost) {
            tags.push("Host");
        }
        if (participant?.isRepresentative) {
            tags.push("Representative");
        }
        return tags.length ? tags.join(" · ") : null;
    }

    function avatarUrl(name: string) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
    }

    const getMicMuted = (participant: any) => Boolean(participant?.isMicMuted);
    const getCameraOff = (participant: any) => Boolean(participant?.isCameraOff);
</script>

<div class="flex max-h-[85vh] flex-col rounded-t-2xl bg-[#3f4043] text-white">
    <div class="flex items-center justify-between px-5 py-4 border-b border-[#4b4c4f]">
        <div class="flex items-center gap-3">
            <button
                class="rounded-full bg-white/5 p-2 hover:bg-white/10 transition-colors"
                type="button"
                aria-label="Close participants"
                onclick={closeSheet}
            >
                <X size={20} />
            </button>
            <div>
                <div class="text-lg font-semibold">Participants</div>
                <div class="text-sm text-white/70">In room ({participants.length})</div>
            </div>
        </div>
        {#if isHost && showInvitePeople}
            <Dialog.Root bind:open={inviteDialogOpen}>
                <Dialog.Trigger>
                    <Button
                        variant="ghost"
                        class="bg-white/10 hover:bg-white/20 text-white rounded-full px-4 py-2 flex items-center gap-2"
                        type="button"
                    >
                        Invite people
                    </Button>
                </Dialog.Trigger>
                <Dialog.Content class="w-[94vw] max-w-[390px] rounded-2xl bg-white p-0 text-left text-[#464646]">
                    <div class="flex items-center justify-between border-b border-[#ebeef2] px-5 py-3">
                        <h2 class="text-base font-semibold text-[#1f2933]">Invite People</h2>
                        <Dialog.Close class="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200">
                            <X size={18} />
                        </Dialog.Close>
                    </div>
                    <div class="max-h-[70vh] overflow-y-auto px-5 py-4">
                        <Share shareURL={shareURL} representative={false} />
                    </div>
                </Dialog.Content>
            </Dialog.Root>
        {/if}
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        <div class="rounded-xl border border-white/10 bg-[#4a4b4f] p-4">
            {#if participants.length === 0}
                <div class="py-12 text-center text-sm text-white/60">No one else is here yet.</div>
            {:else}
                <div class="space-y-4">
                    {#each participants as participant, index (participant?.streamId ?? `${participant?.name ?? "user"}-${index}`)}
                        {@const displayName = normalizeName(participant?.name ?? participant?.streamName ?? participant?.streamId ?? participant)}
                        <div class="flex items-center gap-4">
                                <span class="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                                    <img
                                        src={avatarUrl(displayName)}
                                        alt={`Avatar for ${displayName}`}
                                        class="h-full w-full rounded-full object-cover"
                                    />
                                    <span class="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full border border-[#3f4043] bg-emerald-400"></span>
                                </span>
                                <div class="flex-1">
                                    <div class="text-base font-semibold leading-tight">{displayName}</div>
                                    {#if getSecondaryLabel(participant)}
                                        <div class="text-xs text-white/70">
                                            {getSecondaryLabel(participant)}
                                        </div>
                                    {/if}
                                </div>
                           
                            </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</div>

