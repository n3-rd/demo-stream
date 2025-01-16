<script lang="ts">

    import { page } from '$app/stores';
    import * as Dialog from '$lib/components/ui/dialog';
    import { Button } from '$lib/components/ui/button';
    import { Label } from '$lib/components/ui/label';
    import * as Select from '$lib/components/ui/select';
    import { useForm, HintGroup, Hint, validators, required } from 'svelte-use-form';
    import { enhance } from '$app/forms';
    import { MoreHorizontal } from 'lucide-svelte';
    import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
    import Sidenav from '$lib/components/layout/sidenav.svelte';

    export let data;
    const form = useForm();

    let showAddRoomDialog = false;
    let selectedHostContent: string[] = [];
    let selectedRepContent: string[] = [];
    let selectedRepresentatives: string[] = [];

    $: ({ rooms, representatives, hostContent, repContent } = data);

    function handleHostContentSelect(event: CustomEvent<string[]>) {
        selectedHostContent = event.detail;
        console.log('Selected host content:', selectedHostContent);
    }

    function handleRepContentSelect(event: CustomEvent<string[]>) {
        selectedRepContent = event.detail;
        console.log('Selected rep content:', selectedRepContent);
    }

    function handleRepresentativeSelect(event: CustomEvent<string[]>) {
        selectedRepresentatives = event.detail;
        console.log('Selected representatives:', selectedRepresentatives);
    }

    function formatDate(date: string) {
        return new Date(date).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: '2-digit'
        });
    }

    function showHostContent(content: string[]) {
        // TODO: Implement host content display
        console.log('Show host content:', content);
    }

    function showRepContent(content: string[]) {
        // TODO: Implement rep content display
        console.log('Show rep content:', content);
    }

    function getThumbnailUrl(content: any) {
        if (!content?.thumbnail) return null;
        return `${PUBLIC_POCKETBASE_INSTANCE}/api/files/${content.collectionId}/${content.id}/${content.thumbnail}`;
    }

    interface SelectItem {
        value: string;
        label: string;
    }
</script>

<div class="flex h-screen bg-gray-100">
    <Sidenav activePage="rooms" />
    
    <div class="flex-1 overflow-auto">
        <div class="container mx-auto py-6">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-bold">View Room List</h1>
                <Button on:click={() => showAddRoomDialog = true}>Add New Room</Button>
            </div>

            <div class="bg-white rounded-lg shadow">
                <div class="grid grid-cols-7 gap-4 p-4 border-b font-medium text-sm text-gray-500">
                    <div>Date</div>
                    <div>Room Name</div>
                    <div>Active</div>
                    <div>Representative</div>
                    <div>Host Content</div>
                    <div>Rep Content</div>
                    <div>Actions</div>
                </div>

                {#each rooms as room}
                    <div class="grid grid-cols-7 gap-4 p-4 border-b hover:bg-gray-50">
                        <div class="text-sm">{formatDate(room.created)}</div>
                        <div class="text-blue-600">{room.title}</div>
                        <div>
                            <div class="w-12 h-6 rounded-full bg-gray-200 relative {room.is_active ? 'bg-green-500' : ''}">
                                <div class="w-4 h-4 bg-white rounded-full absolute top-1 {room.is_active ? 'right-1' : 'left-1'}" />
                            </div>
                        </div>
                        <div class="text-sm">
                            {#if room.expand?.representative}
                                {room.expand.representative.map(rep => rep.name).join(', ')}
                            {/if}
                        </div>
                        <div>
                            <button class="text-blue-600 hover:underline flex items-center gap-2" on:click={() => showHostContent(room.host_content)}>
                                {#if room.expand?.host_content?.[0]?.thumbnail}
                                    <img src={getThumbnailUrl(room.expand.host_content[0])} alt="Thumbnail" class="w-8 h-8 object-cover rounded" />
                                {/if}
                                show
                            </button>
                        </div>
                        <div>
                            <button class="text-blue-600 hover:underline flex items-center gap-2" on:click={() => showRepContent(room.representative_content)}>
                                {#if room.expand?.representative_content?.[0]?.thumbnail}
                                    <img src={getThumbnailUrl(room.expand.representative_content[0])} alt="Thumbnail" class="w-8 h-8 object-cover rounded" />
                                {/if}
                                show
                            </button>
                        </div>
                        <div class="flex items-center gap-2">
                            <Button variant="outline" size="sm" on:click={() => window.location.href = `/room/${room.id}`}>
                                Join Room
                            </Button>
                            <button class="text-gray-600 hover:text-gray-900">
                                <MoreHorizontal size={20} />
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>

<Dialog.Root bind:open={showAddRoomDialog}>
    <Dialog.Content class="sm:max-w-[600px]">
        <Dialog.Header>
            <Dialog.Title>Add New Room</Dialog.Title>
        </Dialog.Header>
        <form method="POST" action="?/create-room" use:form use:enhance={() => {
            return async ({ result }) => {
                if (result.type === 'success') {
                    showAddRoomDialog = false;
                    selectedHostContent = [];
                    selectedRepContent = [];
                    selectedRepresentatives = [];
                    invalidateAll();
                    toast.success('Room added');
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
                        use:validators={[required]}
                    />
                    <HintGroup for="title">
                        <Hint on="required">Title is required</Hint>
                    </HintGroup>
                </div>

                <div class="space-y-2">
                    <Label>Status</Label>
                    <div class="flex items-center space-x-2">
                        <input type="checkbox" id="is_active" name="is_active" class="rounded" />
                        <Label for="is_active">Active</Label>
                    </div>
                </div>

                <div class="space-y-2">
                    <Label for="representative">Representatives</Label>
                    <Select.Root
                        multiple
                        onSelectedChange={e => {
                            selectedRepresentatives = e?.map?.(item => item?.value) || [];
                        }}
                    >
                        <Select.Trigger class="w-full">
                            <Select.Value placeholder="Select representatives..." />
                        </Select.Trigger>
                        <Select.Content>
                            {#each representatives as rep}
                                <Select.Item value={rep.id} label={rep.name}>
                                    <div class="flex items-center gap-2">
                                        {#if rep.avatar}
                                            <img src={getThumbnailUrl(rep)} alt="Avatar" class="w-6 h-6 object-cover rounded-full" />
                                        {/if}
                                        {rep.name}
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
                            selectedHostContent = e?.map?.(item => item?.value) || [];
                        }}
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
                            selectedRepContent = e?.map?.(item => item?.value) || [];
                        }}
                    >
                        <Select.Trigger class="w-full">
                            <Select.Value placeholder="Select content..." />
                        </Select.Trigger>
                        <Select.Content>
                            {#each repContent as content}
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

            <Dialog.Footer>
                <Button type="button" variant="outline" on:click={() => showAddRoomDialog = false}>
                    Cancel
                </Button>
                <Button type="submit" disabled={!$form.valid}>Add Room</Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>
