<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { toast } from "svelte-sonner";
    import ScheduleMeeting from "./schedule-meeting.svelte";
	import { enhance } from "$app/forms";
	import Share from "./share.svelte";
	import { page } from '$app/stores';
    import { Button } from "$lib/components/ui/button";
    import { ClipboardCopy, Send, Mail, X } from "lucide-svelte";
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "$lib/components/ui/select";
    import { createEventDispatcher } from "svelte";
    import { PUBLIC_SMTP_FROM, PUBLIC_BREVO_API_KEY } from '$env/static/public';

    export let shareURL: string;

    export let representatives: any[];
    export let locations: any[] = [];
    export let room = null; // Room data for filtering representatives
    let showRepresentativeList = false;
    let showInitialDialog = true;
    let dialogOpen = false;
    let selectedRepresentative: any = null;
    let inviteStep: "select" | "share" | "success" = "select";
    const joinURL = $page.url.href;
    let isSendingInvite = false;
    let sendViaEmail = true;
    let sendViaSMS = true;

    let invitedRepresentative = '';

    let uidExtracted = shareURL.split('?')[1].split('&').find(param => param.startsWith('uid=')).split('=')[1];
    console.log('uidExtracted', uidExtracted);

    const dispatch = createEventDispatcher();

    console.log("[InviteRepresentative] received representatives", representatives);

    // Filter representatives by the current user's company and room assignment
    $: filteredRepresentatives = representatives;

    $: {
        if (selectedRepresentative) {
            console.log('selectedRepresentative', selectedRepresentative);
        }
    }

    function showNextModal() {
        showInitialDialog = false;
        showRepresentativeList = true;
        inviteStep = "select";
    }

    function handleClose() {
        dialogOpen = false;
        showRepresentativeList = false;
        showInitialDialog = true;
        selectedRepresentative = null;
        inviteStep = "select";
        dispatch('close');
    }

    function cancelDialog() {
        handleClose();
    }

    function getAvatarUrl(rep: any) {
        if (!rep) return null;
        const fileName = rep.avatar;
        if (!fileName) return null;
        const collection = rep.collectionId || rep.collection || "representatives";
        return `/api/files/${collection}/${rep.id}/${fileName}`;
    }

    const heading = room?.title ? `${room.title} Representative` : "Select Representative";

    function handleAvatarError(event: Event) {
        const target = event.currentTarget as HTMLImageElement | null;
        if (!target) return;
        target.style.display = "none";
        const fallback = target.nextElementSibling as HTMLElement | null;
        fallback?.classList.remove("hidden");
    }

    function selectRepresentative(representative: any) {
        selectedRepresentative = representative;
        console.log('Representative selected:', representative);
    }

    async function sendInvite() {
        if (!selectedRepresentative) return;
        
        isSendingInvite = true;
        const inviteUrl = `${$page.url.origin}/room/${$page.params.roomId}/representative?repid=${selectedRepresentative.id}&uid=${uidExtracted}`;
        
        try {
            // Prepare email payload
            const emailPayload = {
                sender: {
                    name: "Representative Invite",
                    email: PUBLIC_SMTP_FROM
                },
                to: [
                    {
                        email: selectedRepresentative.email,
                        name: selectedRepresentative.name
                    }
                ],
                subject: "Room Invitation",
                htmlContent: `
                    <html>
                        <body>
                            <h1>Room Invitation</h1>
                            <p>You have been invited to join the room: ${$page.data?.room?.title || 'View-Room'}</p>
                            <p>Invited by: ${$page.data?.user?.name || 'Customer'}</p>
                            <p>Click the link to join: <a href="${inviteUrl}">${inviteUrl}</a></p>
                        </body>
                    </html>
                `
            };

            // Send email via Brevo
            const emailResp = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'api-key': PUBLIC_BREVO_API_KEY,
                    'content-type': 'application/json'
                },
                body: JSON.stringify(emailPayload)
            });

            const response = await fetch('/api/send-rep-invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-rep-phone': selectedRepresentative.phone || '',
                    'x-rep-email': selectedRepresentative.email || ''
                },
                body: JSON.stringify({
                    rep_id: selectedRepresentative.id,
                    room_id: $page.params.roomId,
                    room_title: $page.data?.room?.title || 'View-Room',
                    user_name: $page.data?.user?.name || 'Customer',
                    invite_url: inviteUrl,
                    send_methods: {
                        email: true,
                        sms: true
                    }
                })
            });

            const result = await response.json();
            const emailResult = await emailResp.json();
            
            if (result.success && emailResult) {
                const methodsUsed = ['SMS', 'Email', 'Notification'];

                toast.success(`Invite sent to ${selectedRepresentative.name}!`, {
                    description: `Sent via: ${methodsUsed.join(', ')}`
                });
                invitedRepresentative = selectedRepresentative.name;
                inviteStep = "success";
            } else {
                toast.error('Failed to send invite', {
                    description: result.error || 'Unknown error occurred'
                });
            }
        } catch (error) {
            console.error('Error sending invite:', error);
            toast.error('Failed to send invite', {
                description: 'Network or server error'
            });
        } finally {
            isSendingInvite = false;
        }
    }

    // Update the link display in the modal
    $: inviteLink = selectedRepresentative 
        ? `${$page.url.origin}/room/${$page.params.roomId}/representative?repid=${selectedRepresentative.id}&uid=${uidExtracted}` 
        : '';
</script>

<!-- Comment out confirmation dialog -->
<!-- <Dialog.Root bind:open={inviteConfirmed}>
    <Dialog.Content>
        <div class="flex flex-col items-center p-6">
            <svg class="w-16 h-16 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <Dialog.Title class="text-xl font-semibold text-center mb-2">
                You've successfully sent an invitation to {invitedRepresentative}.
            </Dialog.Title>
            <Dialog.Description class="text-center mb-6">
                Please allow a moment for him to join the room and connect with you.
            </Dialog.Description>
            <Dialog.Close class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                OK
            </Dialog.Close>
        </div>
    </Dialog.Content>
</Dialog.Root> -->

{#if !showRepresentativeList && showInitialDialog}
    <!-- First Modal -->
    <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div class="bg-white p-6 w-full text-gray-400">
            <h2 class="text-lg font-semibold mb-4 text-[#464646]">Invite Representative</h2>
            <p class="text-sm mb-6">
                Speak to a representative, you're gaining direct access to an expert who specializes in our services. They're here to guide you, answer your questions, and provide personalized assistance. Whether you're seeking advice, information, or a step-by-step walkthrough, our representatives are ready to help you. Click the 'CONTINUE' to start a conversation.
            </p>
            <div class="flex flex-col-reverse gap-2 md:flex-row justify-end md:space-x-4">
                <Dialog.Close asChild>
                    <button class="px-4 py-2 bg-[#E8EDF5] text-primary rounded hover:bg-gray-400" on:click={cancelDialog}>Cancel</button>
                </Dialog.Close>
                <button 
                    class="px-4 py-2 bg-primary text-white rounded hover:bg-primary-700" 
                    on:click={showNextModal}
                    disabled={filteredRepresentatives.length === 0}
                >
                    Continue
                </button>
            </div>
        </div>
    </div>
{:else}
    <!-- Second Modal -->
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div class="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            {#if inviteStep === "select"}
                <div class="flex items-start justify-between">
                    <h2 class="text-xl font-semibold text-[#1f2933]">{heading}</h2>
                    <Dialog.Close asChild>
                        <button
                            type="button"
                            class="text-gray-400 transition-colors hover:text-gray-600"
                            on:click={cancelDialog}
                        >
                            <X size={20} />
                        </button>
                    </Dialog.Close>
                </div>

                {#if filteredRepresentatives.length === 0}
                    <div class="mt-8 text-sm text-gray-500">
                        No representatives available for your company.
                    </div>
                {:else}
                    <div class="mt-6 flex flex-wrap items-center justify-center gap-6">
                        {#each filteredRepresentatives as representative}
                            <button
                                type="button"
                                class="flex flex-col items-center gap-2 focus:outline-none"
                                on:click={() => selectRepresentative(representative)}
                                on:keydown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        selectRepresentative(representative);
                                    }
                                }}
                                aria-pressed={selectedRepresentative === representative}
                            >
                                <div class="relative mb-2">
                                    <div class={`h-16 w-16 rounded-full border-2 ${selectedRepresentative === representative ? 'border-[#4B77BE]' : 'border-transparent'} overflow-hidden`}>
                                        {#if getAvatarUrl(representative)}
                                            <img
                                                src={getAvatarUrl(representative)}
                                                alt={`${representative.name}'s Avatar`}
                                                class="h-full w-full object-cover"
                                                on:error={handleAvatarError}
                                                loading="lazy"
                                            />
                                            <div class="hidden h-full w-full items-center justify-center bg-gradient-to-br from-[#6366f1] to-[#ec4899] text-lg font-semibold text-white">
                                                {representative.name?.slice(0, 2)?.toUpperCase()}
                                            </div>
                                        {:else}
                                            <div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#6366f1] to-[#ec4899] text-lg font-semibold text-white">
                                                {representative.name?.slice(0, 2)?.toUpperCase()}
                                            </div>
                                        {/if}
                                    </div>
                                    <span class={`absolute -top-1 -left-1 h-3 w-3 rounded-full border-2 border-white ${representative.is_active !== false ? 'bg-[#22C55E]' : 'bg-gray-300'}`}></span>
                                </div>
                                <span class="text-sm font-semibold text-[#3f4c5a]">{representative.name}</span>
                            </button>
                        {/each}
                    </div>
                {/if}

                <p class="mt-6 text-sm leading-relaxed text-[#4a5562]">
                    Welcome to speak to a representative. Choosing the right representative can make all the difference in getting the guidance you need.
                </p>
                <p class="mt-1 text-xs font-semibold text-[#1f2933]">
                    Note: <span class="font-normal text-[#4a5562]">Please choose a representative</span>
                </p>

                    <div class="mt-6 flex flex-col gap-3">
                        <Button
                            class="w-full bg-[#4B77BE] hover:bg-[#3f66a4] text-white"
                            on:click={sendInvite}
                            disabled={!selectedRepresentative || isSendingInvite}
                        >
                            {#if isSendingInvite}
                                <div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                                Sending...
                            {:else}
                                Continue
                            {/if}
                        </Button>
                        <Dialog.Close asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                class="w-full bg-[#EEF2F7] text-[#4a5562] hover:bg-[#e2e8f0]"
                                on:click={cancelDialog}
                            >
                                Cancel
                            </Button>
                        </Dialog.Close>
                    </div>
            {:else if inviteStep === "success"}
                <div class="flex w-full flex-col items-center gap-4 pt-4">
                    <span class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </span>
                    <p class="text-center text-sm leading-relaxed text-[#3f4c5a]">
                        You've successfully sent an invitation to <span class="font-semibold">{invitedRepresentative}</span>.
                        Please allow a moment for them to join the room and connect with you.
                    </p>
                    <Dialog.Close asChild>
                        <Button
                            class="w-full bg-[#4B77BE] hover:bg-[#3f66a4] text-white"
                            on:click={handleClose}
                        >
                            OK
                        </Button>
                    </Dialog.Close>
                </div>
            {/if}
        </div>
    </div>
{/if}
