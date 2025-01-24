<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { toast } from "svelte-sonner";
    import ScheduleMeeting from "./schedule-meeting.svelte";
	import { enhance } from "$app/forms";
	import Share from "./share.svelte";
	import { page } from '$app/stores';
    import { Button } from "$lib/components/ui/button";
    import { ClipboardCopy } from "lucide-svelte";
    import * as Select from "$lib/components/ui/select";

    export let representatives;
    export let locations = [];
    let showRepresentativeList = false;
    let dialogOpen = false;
    let selectedRepresentative: any = null;
    let selectedLocation: any = null;
    let inviteConfirmed = false;
    const joinURL = $page.url.href;

    let invitedRepresentative = '';

    $: {
        if (selectedRepresentative) {
            console.log('selectedRepresentative', selectedRepresentative);
        }
    }

    function showNextModal() {
        showRepresentativeList = true;
    }

    function handleClose() {
        dialogOpen = false;
    }

    function selectRepresentative(representative: any) {
        selectedRepresentative = representative;
        console.log('Representative selected:', representative);
    }

    async function handleInviteConfirmation() {
        if (!selectedLocation) {
            toast.error('Please select a location for the representative');
            return;
        }

        try {
            const response = await fetch(`/api/representatives/${selectedRepresentative.id}/location`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    locationId: selectedLocation.id
                })
            });

            if (!response.ok) throw new Error('Failed to update representative location');
            
            inviteConfirmed = true;
            invitedRepresentative = selectedRepresentative.name;
        } catch (error) {
            console.error('Error updating representative location:', error);
            toast.error('Failed to update representative location');
        }
    }

    function handleLocationSelect(event: CustomEvent<string>) {
        const locationId = event.detail;
        selectedLocation = locations.find(l => l.id === locationId);
    }
</script>

<Dialog.Root bind:open={inviteConfirmed}>
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
</Dialog.Root>

{#if !showRepresentativeList}
    <!-- First Modal -->
    <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div class="bg-white p-6 w-full text-gray-400">
            <h2 class="text-lg font-semibold mb-4 text-[#464646]">Invite Representative</h2>
            <p class="text-sm mb-6">
                Select a representative and their location to generate a unique invitation link. The representative will be able to join the room with their credentials and assist in the meeting.
            </p>
            <div class="flex justify-end space-x-4">
                <button class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400" on:click={() => showRepresentativeList = false}>Cancel</button>
                <button class="px-4 py-2 bg-primary text-white rounded hover:bg-primary-700" on:click={showNextModal}>Continue</button>
            </div>
        </div>
    </div>
{:else}
    <!-- Second Modal -->
    <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div class="bg-white p-6 w-full">
            <h2 class="text-lg font-semibold mb-4 text-center text-[#464646]">Select Representative</h2>
            <div class="flex space-x-4 mb-6 justify-center flex-wrap">
                <!-- Representatives -->
                {#each representatives as representative}
                <div 
                    class="flex flex-col items-center cursor-pointer relative"
                    on:click={() => selectRepresentative(representative)}
                >
                    <img 
                        src={representative.avatar 
                            ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/${representative.collectionId}/${representative.id}/${representative.avatar}` 
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
            
            {#if selectedRepresentative}
                <div class="mb-6">
                    <h3 class="text-sm font-medium mb-2 text-[#464646]">Select Location</h3>
                    <Select.Root onSelectedChange={(value) => {
                        selectedLocation = locations.find(l => l.id === value);
                    }}>
                        <Select.Trigger class="w-full">
                            <Select.Value placeholder="Select a location" />
                        </Select.Trigger>
                        <Select.Content>
                            {#each locations as location}
                                <Select.Item value={location.id}>{location.name}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                </div>

                <div class="mb-6">
                    <h3 class="text-sm font-medium mb-2 text-[#464646]">Invitation Link</h3>
                    <div class="flex items-center gap-2 bg-gray-50 p-2 rounded">
                        <input 
                            type="text" 
                            value={`${$page.url.origin}/room/${$page.params.roomId}?repid=${selectedRepresentative.id}`}
                            class="flex-1 bg-transparent border-none text-sm text-gray-600 focus:outline-none"
                            readonly
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            on:click={() => {
                                navigator.clipboard.writeText(`${$page.url.origin}/room/${$page.params.roomId}?repid=${selectedRepresentative.id}`);
                                toast.success('Link copied to clipboard');
                            }}
                        >
                            <ClipboardCopy class="h-4 w-4" />
                        </Button>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Share this link with {selectedRepresentative.name} to join as a representative</p>
                </div>
            {/if}

            <div class="flex justify-center space-x-4">
                <button class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400" on:click={() => showRepresentativeList = false}>Cancel</button>
                {#if selectedRepresentative}
                    <button 
                        class="px-4 py-2 bg-primary text-white rounded hover:bg-primary-700"
                        on:click={() => {
                            handleInviteConfirmation();
                            showRepresentativeList = false;
                        }}
                    >
                        Done
                    </button>
                {/if}
            </div>
        </div>
    </div>
{/if}
