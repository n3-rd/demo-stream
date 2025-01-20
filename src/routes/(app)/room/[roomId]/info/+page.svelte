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
    import { Label } from '$lib/components/ui/label';
    import * as Select from '$lib/components/ui/select';
    import { useForm, HintGroup, Hint, validators, required } from 'svelte-use-form';
    import { invalidateAll } from '$app/navigation';

    export let data;
    let showEmbed = false;
    let showEditDialog = false;
    const form = useForm();

    $: ({ room, hostContent = [], representativeContent = [] } = data || {});

    let selectedVideo = room?.selected_video || '';
    let selectedHostContent = room?.host_content || [];
    let selectedRepContent = room?.representative_content || [];
    let selectedRepresentatives = room?.representatives || [];

    // Initialize selected values when room data changes
    $: if (room && room.expand) {
        selectedVideo = room.selected_video || '';
        selectedHostContent = Array.isArray(room.host_content) ? room.host_content : [];
        selectedRepContent = Array.isArray(room.representative_content) ? room.representative_content : [];
        selectedRepresentatives = Array.isArray(room.representatives) ? room.representatives : [];
    }

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
                        <Button variant="outline" on:click={() => showEditDialog = true}>
                            Edit Room
                        </Button>
                        <Button on:click={handleJoinRoom}>
                            Join Room
                        </Button>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="flex-1 overflow-y-auto p-6">
                <section class="flex flex-col gap-4 mb-4">
                    <!-- Host Content Section -->
                    {#if room.host_content?.length}
                    <section class="bg-white rounded-lg shadow p-6 ">
                        <h2 class="text-lg font-semibold mb-4">Host Content</h2>
                        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {#each hostContent.filter(content => room.host_content.includes(content.id)) as content}
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
                {/if}

                <!-- Representative Content Section -->
                {#if room.representative_content?.length}
                    <section class="bg-white rounded-lg shadow p-6">
                        <h2 class="text-lg font-semibold mb-4">Representative Content</h2>
                        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {#each representativeContent.filter(content => room.representative_content.includes(content.id)) as content}
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
                {/if}
                </section>
                <!-- Room Details -->
                <section class="bg-white rounded-lg shadow p-6 mb-8">
                    
                    <h2 class="text-lg font-semibold mb-4">Room Details</h2>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-sm text-gray-500">Title</p>
                            <p class="text-sm mt-1 font-medium">{room.title}</p>
                        </div>
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
                        <div>
                            <p class="text-sm text-gray-500">Selected Video</p>
                            <p class="text-sm mt-1">{hostContent.find(c => c.id === room.selected_video)?.title || 'None'}</p>
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

    <!-- Edit Room Dialog -->
    <Dialog.Root bind:open={showEditDialog}>
        <Dialog.Content class="sm:max-w-[600px]">
            <Dialog.Header>
                <Dialog.Title>Edit Room</Dialog.Title>
            </Dialog.Header>
            <form method="POST" action="?/update-room" use:form use:enhance={() => {
                return async ({ result }) => {
                    if (result.type === 'success') {
                        showEditDialog = false;
                        invalidateAll();
                        toast.success('Room updated');
                    } else {
                        toast.error('Error occurred');
                    }
                };
            }}>
                <div class="space-y-4 py-4">
                    <div class="space-y-2">
                        <Label for="title">Title</Label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            class="w-full px-3 py-2 border rounded-md"
                            value={room.title}
                            use:validators={[required]}
                        />
                        <HintGroup for="title">
                            <Hint on="required">Title is required</Hint>
                        </HintGroup>
                    </div>

                    <div class="space-y-2">
                        <Label for="selected_video">Select Video</Label>
                        <Select.Root
                            onSelectedChange={e => {
                                selectedVideo = String(e?.value || '');
                            }}
                            selected={selectedVideo ? [{ 
                                value: selectedVideo, 
                                label: hostContent.find(c => c.id === selectedVideo)?.title || 'Select a video...'
                            }] : []}
                        >
                            <Select.Trigger class="w-full">
                                <Select.Value placeholder="Select a video..." />
                            </Select.Trigger>
                            <Select.Content>
                                {#each hostContent.filter(content => content.type === 'video') as content}
                                    <Select.Item value={content.id} label={content.title}>
                                        <div class="flex items-center gap-2">
                                            {#if content.thumbnail}
                                                <img src={getThumbnailUrl(content)} alt="Thumbnail" class="w-6 h-6 object-cover rounded" />
                                            {/if}
                                            {content.title}
                                        </div>
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>

                    <div class="space-y-2">
                        <Label for="host_content">Host Content</Label>
                        <Select.Root
                            multiple
                            onSelectedChange={e => {
                                selectedHostContent = (e?.map?.(item => String(item?.value)) || []);
                            }}
                            selected={selectedHostContent.map(id => {
                                const content = hostContent.find(c => c.id === id);
                                return {
                                    value: id,
                                    label: content?.title || 'Loading...'
                                };
                            })}
                        >
                            <Select.Trigger class="w-full">
                                <Select.Value placeholder="Select content..." />
                            </Select.Trigger>
                            <Select.Content>
                                {#each hostContent as content}
                                    <Select.Item value={content.id} label={content.title}>
                                        <div class="flex items-center gap-2">
                                            {#if content.thumbnail}
                                                <img src={getThumbnailUrl(content)} alt="Thumbnail" class="w-6 h-6 object-cover rounded" />
                                            {/if}
                                            {content.title}
                                        </div>
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>

                    <div class="space-y-2">
                        <Label for="representative_content">Representative Content</Label>
                        <Select.Root
                            multiple
                            onSelectedChange={e => {
                                selectedRepContent = (e?.map?.(item => String(item?.value)) || []);
                            }}
                            selected={selectedRepContent.map(id => {
                                const content = representativeContent.find(c => c.id === id);
                                return {
                                    value: id,
                                    label: content?.title || 'Loading...'
                                };
                            })}
                        >
                            <Select.Trigger class="w-full">
                                <Select.Value placeholder="Select content..." />
                            </Select.Trigger>
                            <Select.Content>
                                {#each representativeContent as content}
                                    <Select.Item value={content.id} label={content.title}>
                                        <div class="flex items-center gap-2">
                                            {#if content.thumbnail}
                                                <img src={getThumbnailUrl(content)} alt="Thumbnail" class="w-6 h-6 object-cover rounded" />
                                            {/if}
                                            {content.title}
                                        </div>
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                </div>

                <input type="hidden" name="host_content[]" value={selectedHostContent.join(',')} />
                <input type="hidden" name="representative_content[]" value={selectedRepContent.join(',')} />
                <input type="hidden" name="representative[]" value={selectedRepresentatives.join(',')} />
                <input type="hidden" name="selected_video" value={selectedVideo} />

                <Dialog.Footer>
                    <Button type="button" variant="outline" on:click={() => showEditDialog = false}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={!$form.valid}>Update Room</Button>
                </Dialog.Footer>
            </form>
        </Dialog.Content>
    </Dialog.Root>
{/if}

<style>
    :global(body) {
        @apply bg-gray-100;
    }
</style>