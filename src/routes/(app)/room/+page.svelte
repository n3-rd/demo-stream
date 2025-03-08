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
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
    import Sidenav from '$lib/components/layout/sidenav.svelte';
    import Embed from "$lib/components/room/embed.svelte";

    interface SelectItem {
        value: string;
        label: string;
    }

    export let data;
    const form = useForm();

    let showAddRoomDialog = false;
    let selectedVideo: string = '';
    let selectedHostContent: string[] = [];
    let selectedRepContent: string[] = [];
    let selectedRepresentatives: string[] = [];
    let embedRoomId = '';
    let showEmbed = false;
    let showContentDialog = false;
    let contentToShow: any[] = [];
    let dialogTitle = '';

    $: ({ rooms, representatives, hostContent, repContent } = data);

    function handleVideoSelect(e: { value: string } | null) {
        selectedVideo = e?.value || '';
    }

    function handleHostContentSelect(event: CustomEvent<{ value: string }[]>) {
        selectedHostContent = event.detail.map(item => item.value);
        console.log('Selected host content:', selectedHostContent);
    }

    function handleRepContentSelect(event: CustomEvent<{ value: string }[]>) {
        selectedRepContent = event.detail.map(item => item.value);
        console.log('Selected rep content:', selectedRepContent);
    }

    function handleRepresentativeSelect(event: CustomEvent<{ value: string }[]>) {
        selectedRepresentatives = event.detail.map(item => item.value);
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
        contentToShow = content.map(id => rooms.find(room => room.expand?.host_content?.find(c => c.id === id))?.expand?.host_content?.find(c => c.id === id)).filter(Boolean);
        dialogTitle = 'Host Content';
        showContentDialog = true;
    }

    function showRepContent(content: string[]) {
        contentToShow = content.map(id => rooms.find(room => room.expand?.representative_content?.find(c => c.id === id))?.expand?.representative_content?.find(c => c.id === id)).filter(Boolean);
        dialogTitle = 'Representative Content';
        showContentDialog = true;
    }

    function getThumbnailUrl(content: any) {
        if (!content?.thumbnail) return null;
        return `${PUBLIC_POCKETBASE_INSTANCE}api/files/${content.collectionId}/${content.id}/${content.thumbnail}`;
    }

    function getFileUrl(content: any) {
        return `${PUBLIC_POCKETBASE_INSTANCE}api/files/${content.collectionId}/${content.id}/${content.file}`;
    }

    function showEmbedDialog(roomId: string) {
        // Show embed dialog for the room
        embedRoomId = roomId;
        showEmbed = true;
    }
</script>

<!-- Header -->
<div class="flex h-screen bg-[#F5F5F5]">
    <Sidenav activePage="rooms" />
    
    <div class="flex-1 overflow-auto p-6">
        <div class="max-w-[1200px] mx-auto space-y-6">
            <!-- Header -->
            <div class="bg-white rounded-[8px] h-[69px] flex items-center justify-between px-6">
                <h1 class=" text-[24px] font-bold leading-[118%] text-[#808080]">View Room List</h1>
                <Button 
                    class="bg-[#577AB7] h-[39px] rounded-[3px] font-semibold text-[16px] text-white"
                    on:click={() => showAddRoomDialog = true}
                >
                    Add New Room
                </Button>
            </div>

            <!-- Table Header -->
            <div class="bg-white rounded-[8px] h-[48px] flex items-center px-6">
                <div class="grid grid-cols-7 w-full gap-4">
                    <div class="text-[16px] font-semibold text-[#737373] flex items-center justify-center">Date</div>
                    <div class="text-[16px] font-semibold text-[#737373] flex items-center justify-center">Room Name</div>
                    <div class="text-[16px] font-semibold text-[#737373] flex items-center justify-center">Active</div>
                    <div class="text-[16px] font-semibold text-[#737373] flex items-center justify-center">Virtual Assistant</div>
                    <div class="text-[16px] font-semibold text-[#737373] flex items-center justify-center">Host Content</div>
                    <div class="text-[16px] font-semibold text-[#737373] flex items-center justify-center">Rep Content</div>
                    <div class="text-[16px] font-semibold text-[#737373] flex items-center justify-center">Embed Code</div>
                </div>
            </div>

            <!-- Table Rows -->
            {#each rooms as room}
                <div class="bg-white rounded-[8px] h-[73px] flex items-center px-6">
                    <div class="grid grid-cols-7 w-full gap-4">
                        <div class="text-[16px] font-normal text-[#808080] flex items-center justify-center">
                            {formatDate(room.created)}
                        </div>
                        <div class="text-[16px] font-medium text-[#7798D2] flex items-center justify-center">
                            <button 
                                class="hover:underline"
                                on:click={() => goto(`/room/${room.id}/info`)}
                            >
                                {room.title}
                            </button>
                        </div>
                        <div class="flex items-center justify-center">
                            <div class="relative w-[39px] h-[19.5px] bg-[#DDDDDD] rounded-full">
                                <div class="absolute left-0 top-1/2 -translate-y-1/2 w-[13.5px] h-[13.5px] rounded-full {room.is_active ? 'bg-[#55D976] translate-x-[22px]' : 'bg-[#7C7C7C] translate-x-[3px]'} transition-all duration-200" />
                            </div>
                        </div>
                        <div class="text-[16px] font-normal text-[#808080] flex items-center justify-center">
                            {#if room.expand?.representative}
                                {room.expand.representative.map(rep => rep.name).join(', ')}
                            {/if}
                        </div>
                        <div class="flex items-center justify-center">
                            <button 
                                class="text-[16px] font-normal text-[#808080] flex items-center gap-2"
                                on:click={() => showHostContent(room.host_content)}
                            >
                                show
                            </button>
                        </div>
                        <div class="flex items-center justify-center">
                            <button 
                                class="text-[16px] font-normal text-[#808080] flex items-center gap-2"
                                on:click={() => showRepContent(room.representative_content)}
                            >
                                show
                            </button>
                        </div>
                        <div class="flex items-center justify-center">
                            <button 
                                class="text-[16px] font-normal text-[#808080]"
                                on:click={() => showEmbedDialog(room.id)}
                            >
                                show
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
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
                    <Label for="selected_video">Select Video</Label>
                    <Select.Root
                        onSelectedChange={e => {
                            selectedVideo = String(e?.value || '');
                        }}
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
                    <Label for="representative">Representatives</Label>
                    <Select.Root
                        multiple
                        onSelectedChange={e => {
                            selectedRepresentatives = (e?.map?.(item => String(item?.value)) || []);
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
                            selectedHostContent = (e?.map?.(item => String(item?.value)) || []);
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
                            selectedRepContent = (e?.map?.(item => String(item?.value)) || []);
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
            <input type="hidden" name="selected_video" value={selectedVideo} />

            <Dialog.Footer>
                <Button type="button" variant="outline" on:click={() => showAddRoomDialog = false}>
                    Cancel
                </Button>
                <Button type="submit" disabled={!$form.valid}>Add Room</Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>

<!-- Add embed dialog -->
<Dialog.Root bind:open={showEmbed}>
    <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
            <Dialog.Title>Embed Room</Dialog.Title>
            <Dialog.Description>
                Copy the embed code to add this room to your website.
            </Dialog.Description>
        </Dialog.Header>
        
        {#if embedRoomId}
            <Embed videoId={embedRoomId} />
        {/if}
        
        <Dialog.Footer>
            <Dialog.Close>
                Close
            </Dialog.Close>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<!-- Content Dialog -->
<Dialog.Root bind:open={showContentDialog}>
    <Dialog.Content class="sm:max-w-[600px]">
        <Dialog.Header>
            <Dialog.Title>{dialogTitle}</Dialog.Title>
        </Dialog.Header>
        <div class="py-4">
            <div class="space-y-4">
                {#each contentToShow as content}
                    <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                        {#if content.thumbnail}
                            <img 
                                src={getThumbnailUrl(content)} 
                                alt={content.title} 
                                class="w-24 h-24 object-cover rounded"
                            />
                        {/if}
                        <div class="flex-1">
                            <h3 class="font-semibold text-lg">{content.title}</h3>
                            <p class="text-sm text-gray-600">{content.description}</p>
                            <div class="mt-2">
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    on:click={() => window.open(getFileUrl(content), '_blank')}
                                >
                                    View {content.type}
                                </Button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
        <Dialog.Footer>
            <Button variant="outline" on:click={() => showContentDialog = false}>
                Close
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
