<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import * as Dialog from "$lib/components/ui/dialog";
    import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';
    import { goto } from '$app/navigation';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import Sidenav from '$lib/components/layout/sidenav.svelte';
    import { MoreHorizontal } from 'lucide-svelte';
    import Embed from '$lib/components/room/embed.svelte';

    export let data;
    let showEmbed = false;

    $: ({ room, hostContent = [], representativeContent = [] } = data || {});

    function getThumbnailUrl(content: any) {
        if (!content?.thumbnail) return '';
        return `${PUBLIC_POCKETBASE_INSTANCE}/api/files/${content.collectionId}/${content.id}/${content.thumbnail}`;
    }

    function handleJoinRoom() {
        goto(`/room/${room.id}`);
    }
</script>

<div class="flex h-screen bg-gray-100 overflow-hidden">
    <Sidenav activePage="rooms" />

    <div class="flex-1 flex flex-col">
        {#if !room}
            <div class="flex items-center justify-center h-full">
                <p class="text-gray-500">Loading room information...</p>
            </div>
        {:else}
            <!-- Header -->
            <header class="border-b border-gray-200 bg-white px-6 py-4 flex-shrink-0">
                <div class="flex items-center justify-between">
                    <h1 class="text-xl font-semibold text-gray-800">{room.title} - Room Info</h1>
                    <div class="flex items-center space-x-4">
                        <Button variant="outline" on:click={() => showEmbed = true}>
                            Get Embed Code
                        </Button>
                        <Button on:click={handleJoinRoom}>
                            Join Room
                        </Button>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="flex-1 overflow-y-auto p-6">
                <!-- Host View Section -->
                <section class="mb-8">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-gray-700">Host Content</h2>
                        <button class="text-primary text-sm">Add More</button>
                    </div>
                    <div class="grid grid-cols-5 gap-4">
                        {#each hostContent as content}
                            <div class="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                {#if content.thumbnail}
                                    <img 
                                        src={getThumbnailUrl(content)} 
                                        alt={content.title}
                                        class="w-full h-full object-cover"
                                    />
                                {:else}
                                    <div class="absolute inset-0 flex items-center justify-center">
                                        <span class="text-gray-400">No thumbnail</span>
                                    </div>
                                {/if}
                                <div class="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                                    <p class="text-white text-sm truncate">{content.title || 'Untitled'}</p>
                                </div>
                            </div>
                        {/each}
                    </div>
                </section>

                <!-- Representative View Section -->
                <section class="mb-8">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-gray-700">Representative Content</h2>
                        <button class="text-primary text-sm">Add More</button>
                    </div>
                    <div class="grid grid-cols-5 gap-4">
                        {#each representativeContent as content}
                            <div class="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                {#if content.thumbnail}
                                    <img 
                                        src={getThumbnailUrl(content)} 
                                        alt={content.title}
                                        class="w-full h-full object-cover"
                                    />
                                {:else}
                                    <div class="absolute inset-0 flex items-center justify-center">
                                        <span class="text-gray-400">No thumbnail</span>
                                    </div>
                                {/if}
                                <div class="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                                    <p class="text-white text-sm truncate">{content.title || 'Untitled'}</p>
                                </div>
                            </div>
                        {/each}
                    </div>
                </section>

                <!-- Room Details -->
                <section class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-lg font-semibold mb-4">Room Details</h2>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-sm text-gray-500">Status</p>
                            <div class="flex items-center mt-1">
                                <div class="h-2.5 w-2.5 rounded-full {room.is_active ? 'bg-green-400' : 'bg-gray-400'} mr-2"></div>
                                <p class="text-sm">{room.is_active ? 'Active' : 'Inactive'}</p>
                            </div>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500">Created By</p>
                            <p class="text-sm mt-1">{room.owner_company}</p>
                        </div>
                    </div>
                </section>
            </main>
        {/if}
    </div>
</div>

<!-- Embed Dialog -->
{#if room}
    <Dialog.Root bind:open={showEmbed}>
        <Dialog.Content>
            <Dialog.Header>
                <Dialog.Title>Embed Room</Dialog.Title>
                <Dialog.Description>
                    Copy the embed code to add this room to your website.
                </Dialog.Description>
            </Dialog.Header>
            
            <Embed videoId={room.id} />
            
            <Dialog.Footer>
                <Dialog.Close>
                    Close
                </Dialog.Close>
            </Dialog.Footer>
        </Dialog.Content>
    </Dialog.Root>
{/if}

<style>
    :global(body) {
        @apply bg-gray-100;
    }
</style>