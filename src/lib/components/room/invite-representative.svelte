<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { toast } from "svelte-sonner";
    import ScheduleMeeting from "./schedule-meeting.svelte";
    import { createOrGetPermanentRoom } from "$lib/helpers/schedule"; // Import the function

    export let representatives;
    let showRepresentativeList = false;

    function showNextModal() {
        showRepresentativeList = true;
    }
</script>

{#if !showRepresentativeList}
    <!-- First Modal -->
    <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div class="bg-white p-6 rounded-lg shadow-lg w-full">
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
        <div class="bg-white p-6 rounded-lg shadow-lg w-full">
            <h2 class="text-lg font-semibold mb-4 text-center">Innovated Building Group Representative</h2>
            <div class="flex space-x-4 mb-6 justify-center">
                <!-- Representatives (Add more as needed) -->
                {#each representatives as representative}
                <Dialog.Root>
                    <Dialog.Trigger>
                        <div class="flex flex-col items-center">
                            <div class="w-20 h-20 rounded-full border-2 border-green-500"></div>
                            <span class="mt-2">{representative.name}</span>
                        </div>
                    </Dialog.Trigger>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>Are you sure absolutely sure to invite {representative.name}?</Dialog.Title>
                            <Dialog.Description>
                                <ScheduleMeeting
                                userId={representative.id}
                                    
                                />
                            </Dialog.Description>
                        </Dialog.Header>
                    </Dialog.Content>
                </Dialog.Root>
                {/each}
            </div>
            <p class="text-sm mb-4 text-center">
                Welcome to Speak to a Representative. Choosing the right representative can make all the difference in getting the information and guidance you need.
                <span class="block mt-2 text-xs text-gray-500">Note: Please Choose a Representative</span>
            </p>
        </div>
    </div>
{/if}