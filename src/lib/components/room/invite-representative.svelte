<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { toast } from "svelte-sonner";
    import ScheduleMeeting from "./schedule-meeting.svelte";
	import { enhance } from "$app/forms";
	import Share from "./share.svelte";
	import { page } from '$app/stores';
    import { Button } from "$lib/components/ui/button";
    import { ClipboardCopy, Send } from "lucide-svelte";
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "$lib/components/ui/select";
    import { createEventDispatcher } from "svelte";
    export let shareURL: string;

    export let representatives: any[];
    let showRepresentativeList = false;
    let showInitialDialog = true;
    let dialogOpen = false;
    let selectedRepresentative: any = null;
    const joinURL = $page.url.href;
    let isSendingInvite = false;

    let invitedRepresentative = '';

    let uidExtracted = shareURL.split('?')[1].split('&').find(param => param.startsWith('uid=')).split('=')[1];
    console.log('uidExtracted', uidExtracted);

    const dispatch = createEventDispatcher();

    // Filter representatives by the current user's company
    $: filteredRepresentatives = representatives.filter(rep => 
        rep.company === $page.data?.user?.id && rep.is_active
    );

    $: {
        if (selectedRepresentative) {
            console.log('selectedRepresentative', selectedRepresentative);
        }
    }

    function showNextModal() {
        showInitialDialog = false;
        showRepresentativeList = true;
    }

    function handleClose() {
        dialogOpen = false;
        showRepresentativeList = false;
        showInitialDialog = true;
        selectedRepresentative = null;
        dispatch('close');
    }

    function cancelDialog() {
        showRepresentativeList = false;
        showInitialDialog = true;
        dispatch('close');
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
            const response = await fetch('/api/send-rep-invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-rep-phone': selectedRepresentative.phone || ''
                },
                body: JSON.stringify({
                    rep_id: selectedRepresentative.id,
                    room_id: $page.params.roomId,
                    room_title: $page.data?.room?.title || 'View-Room',
                    user_name: $page.data?.user?.name || 'Customer',
                    invite_url: inviteUrl
                })
            });

            const result = await response.json();
            
            if (result.success) {
                toast.success(`Invite sent to ${selectedRepresentative.name}!`, {
                    description: `SMS: ${result.sms_sent ? '✓' : '✗'} | Notification: ${result.notification_sent ? '✓' : '✗'}`
                });
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
                Select a representative to generate a unique invitation link. The representative will be able to join the room with their credentials and assist in the meeting.
            </p>
            <div class="flex justify-end space-x-4">
                <button class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400" on:click={cancelDialog}>Cancel</button>
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
    <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div class="bg-white p-6 w-full">
            <h2 class="text-lg font-semibold mb-4 text-center text-[#464646]">Select Representative</h2>
            {#if filteredRepresentatives.length === 0}
                <div class="text-center text-gray-500 p-4">
                    No representatives available for your company.
                </div>
            {:else}
                <div class="flex space-x-4 mb-6 justify-center flex-wrap">
                    <!-- Representatives -->
                    {#each filteredRepresentatives as representative}
                    <div 
                        class="flex flex-col items-center cursor-pointer relative"
                        on:click={() => selectRepresentative(representative)}
                    >
                        <img 
                            src={representative.avatar 
                                ? `/api/files/${representative.collectionId || 'representatives'}/${representative.id}/${representative.avatar}` 
                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(representative.name)}&background=random`} 
                            alt="{representative.name}'s Avatar" 
                            class="w-24 h-24 rounded-full mb-4 object-cover object-center"
                        >
                        <div class={`w-24 h-24 rounded-full border-4 ${selectedRepresentative === representative ? 'border-green-500' : 'border-transparent'} absolute top-0`}>
                        </div>
                        <span class="mt-2 text-center text-[#464646]">{representative.name}</span>
                    </div>
                    {/each}
                </div>
            {/if}
            
            {#if selectedRepresentative}
                <div class="mb-6">
                    <h3 class="text-sm font-medium mb-2 text-[#464646]">Invitation Link</h3>
                    <div class="flex items-center gap-2 bg-gray-50 p-2 rounded">
                        <input 
                            type="text" 
                            value={inviteLink}
                            class="flex-1 bg-transparent border-none text-sm text-gray-600 focus:outline-none"
                            readonly
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            on:click={() => {
                                navigator.clipboard.writeText(inviteLink);
                                toast.success('Link copied to clipboard');
                            }}
                        >
                            <ClipboardCopy class="h-4 w-4" />
                        </Button>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Share this link with {selectedRepresentative.name} to join as a representative</p>
                    
                    <!-- Send Invite Button -->
                    <div class="mt-4">
                        <Button
                            class="w-full"
                            on:click={sendInvite}
                            disabled={isSendingInvite}
                        >
                            {#if isSendingInvite}
                                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Sending...
                            {:else}
                                <Send class="h-4 w-4 mr-2" />
                                Send Invite via SMS & Notification
                            {/if}
                        </Button>
                        <p class="text-xs text-gray-500 mt-2 text-center">
                            Sends SMS and push notification to {selectedRepresentative.name}
                        </p>
                    </div>
                </div>
            {/if}

            <div class="flex justify-center space-x-4">
                <button class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400" on:click={cancelDialog}>Cancel</button>
                {#if selectedRepresentative}
                    <button 
                        class="px-4 py-2 bg-primary text-white rounded hover:bg-primary-700"
                        on:click={handleClose}
                    >
                        Done
                    </button>
                {/if}
            </div>
        </div>
    </div>
{/if}
