<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { toast } from "svelte-sonner";
    import ScheduleMeeting from "./schedule-meeting.svelte";
	import { enhance } from "$app/forms";
	import Share from "./share.svelte";
	import { page } from '$app/stores';


    export let representatives;
    let showRepresentativeList = false;
    let dialogOpen = false;
    let selectedRepresentative: any = null;
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

    function handleInviteConfirmation() {
        inviteConfirmed = true;
        invitedRepresentative = selectedRepresentative.name;
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
        <div class="bg-white p-6  w-full">
            <h2 class="text-lg font-semibold mb-4">Speak to Representative</h2>
            <p class="text-sm mb-6">
                Speak to a representative, you're gaining direct access to an expert who specializes in our services. They're here to guide you, answer your questions, and provide personalized assistance. Whether you're seeking advice, information, or a step-by-step walkthrough, our representatives are ready to help you. Click the 'CONTINUE' to start a conversation.
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
        <div class="bg-white lg:p-6 w-full">
            <h2 class="text-lg font-semibold mb-4 text-center">Innovated Building Group Representative</h2>
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
                    <span class="mt-2 text-center">{representative.name}</span>
                </div>
                {/each}
            </div>
            <p class="text-sm mb-4 text-center">
                Welcome to Speak to a Representative. Choosing the right representative can make all the difference in getting the information and guidance you need.
                <span class="block mt-2 text-xs text-gray-500">Note: Please Choose a Representative</span>
            </p>
            
            <div class="flex justify-center w-full ">
                <Dialog.Root>
                    <Dialog.Trigger>
                        
                        <button 
                        type="submit"
                        class="px-4 py-2 bg-primary text-white rounded hover:bg-primary-700"
                        disabled={!selectedRepresentative}
                    >
                        CONNECT
                    </button>
                 
                    </Dialog.Trigger>
                    <Dialog.Content class="p-4 rounded-lg shadow-lg">
                        <Share {joinURL} representative={true} representativeId={selectedRepresentative.id} />
                    </Dialog.Content>
                </Dialog.Root>
               
               
                <!-- <form action="?/send-email" method="POST"
                    use:enhance={() => {
                        return async ({ result }) => {
                            if (result.ok) {
                                handleInviteConfirmation();
                                toast.success('Email sent to representative successfully');
                            } else {
                                toast.error('Failed to send email to representative');
                            }
                        };
                    }}
                >
                    {#if selectedRepresentative }
                        <input type="hidden" name="name" value={selectedRepresentative.name} />
                        <input type="hidden" name="url" value={window.location.href} />
                        <input type="hidden" name="receipient" value={selectedRepresentative.email} />
                    {/if}
                    <button 
                        type="submit"
                        class="px-4 py-2 bg-primary text-white rounded hover:bg-primary-700"
                        disabled={!selectedRepresentative}
                    >
                        CONNECT
                    </button>
                </form> -->
            </div>
        </div>
    </div>
{/if}
