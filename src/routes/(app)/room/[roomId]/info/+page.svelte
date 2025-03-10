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
    import { onMount } from 'svelte';

    export let data;
    let showEmbed = false;
    let showEditDialog = false;
    const form = useForm();

    $: ({ room, hostContent = [], representativeContent = [], representatives = [], locations = [] } = data || {});

    let selectedVideo = room?.selected_video || '';
    let selectedHostContent = room?.host_content || [];
    let selectedRepContent = room?.representative_content || [];
    let selectedRepresentatives = room?.representative || [];

    // Initialize selected values when room data changes
    $: if (room && room.expand) {
        selectedVideo = room.selected_video || '';
        selectedHostContent = Array.isArray(room.host_content) ? room.host_content : [];
        selectedRepContent = Array.isArray(room.representative_content) ? room.representative_content : [];
        selectedRepresentatives = Array.isArray(room.representative) ? room.representative : [];
    }

    function getThumbnailUrl(content: any) {
        if (!content?.thumbnail) return '';
        return `${PUBLIC_POCKETBASE_INSTANCE}api/files/${content.collectionId}/${content.id}/${content.thumbnail}`;
    }

    function handleJoinRoom() {
        goto(`/room/${room.id}`);
    }

    function handleRepCheckboxChange(e: Event, repId: string) {
        const checkbox = e.target as HTMLInputElement;
        if (checkbox.checked) {
            selectedRepresentatives = [...selectedRepresentatives, repId];
        } else {
            selectedRepresentatives = selectedRepresentatives.filter(id => id !== repId);
        }
    }

    function handleHostContentCheckboxChange(e: Event, contentId: string) {
        const checkbox = e.target as HTMLInputElement;
        if (checkbox.checked) {
            selectedHostContent = [...selectedHostContent, contentId];
        } else {
            selectedHostContent = selectedHostContent.filter(id => id !== contentId);
        }
    }

    function handleRepContentCheckboxChange(e: Event, contentId: string) {
        const checkbox = e.target as HTMLInputElement;
        if (checkbox.checked) {
            selectedRepContent = [...selectedRepContent, contentId];
        } else {
            selectedRepContent = selectedRepContent.filter(id => id !== contentId);
        }
    }
    
    // Custom validator for title
    function titleValidator(value: string) {
        if (!value || value.trim().length < 3) {
            return { titleLength: true };
        }
        return null;
    }
    
    // Open edit dialog with validation reset
    function openEditDialog() {
        showEditDialog = true;
        
        // Reset form validation state after dialog opens
        setTimeout(() => {
            const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement;
            if (titleInput) {
                const event = new Event('input', { bubbles: true });
                titleInput.dispatchEvent(event);
            }
        }, 100);
    }
    
    // Initialize form validation on mount
    onMount(() => {
        // Add a small delay to ensure the form is fully initialized
        setTimeout(() => {
            const inputs = document.querySelectorAll('form[action="?/update-room"] input[name]');
            inputs.forEach(input => {
                const event = new Event('input', { bubbles: true });
                input.dispatchEvent(event);
            });
        }, 100);
    });
</script>

<div class="flex h-dvh bg-[#F5F5F5] overflow-hidden">
    <Sidenav activePage="rooms" />
    
    <div class="flex-1 ">
        <div class="max-w-[1115px] mx-auto p-6 space-y-6">
            <!-- Header -->
            <div class="bg-white rounded-[8px] h-[69px] flex items-center justify-between px-6">
                <h1 class="font-['Poppins'] text-[24px] font-bold leading-[118%] text-[#808080]">{room?.title || ''}</h1>
                <div class="flex items-center gap-4">
                    <Button 
                        variant="outline" 
                        class="h-[39px] rounded-[3px] font-semibold text-[16px]"
                        on:click={() => showEmbed = true}
                    >
                        Get Embed Code
                    </Button>
                    <Button 
                        variant="outline"
                        class="h-[39px] rounded-[3px] font-semibold text-[16px]"
                        on:click={openEditDialog}
                    >
                        Edit Room
                    </Button>
                    <Button 
                        class="bg-[#577AB7] h-[39px] rounded-[3px] font-semibold text-[16px] text-white"
                        on:click={handleJoinRoom}
                    >
                        Join Room
                    </Button>
                </div>
            </div>

            <!-- Host Content Section -->
            <div class="bg-white rounded-[8px] p-6">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                        <h2 class="font-['Poppins'] text-[18px] font-semibold text-[#737373]">Name of Viewroom-1</h2>
                        <span class="font-['Poppins'] text-[18px] font-semibold text-[#577AB7]">(Host View)</span>
                    </div>
                    <a href="/upload" class=" text-[14px] text-[#737373] underline">Add More</a>
                </div>
                <div class="grid grid-cols-5 gap-4">
                    {#each hostContent.filter(content => room?.host_content?.includes(content.id)).slice(0, 5) as content}
                        <div class="bg-[#ECEFF3] rounded-[2px] p-2">
                            {#if content.thumbnail}
                                <img 
                                    src={getThumbnailUrl(content)} 
                                    alt={content.title}
                                    class="w-[192px] h-[118px] object-cover rounded-[1px] mb-2"
                                />
                            {/if}
                            <div class="space-y-1">
                                <p class=" text-[14px] font-semibold text-[#577AB7] truncate">{content.title}</p>
                                <p class=" text-[11px] font-light text-black/50">ID {content.id}</p>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Representative Content Section -->
            <div class="bg-white rounded-[8px]  p-6">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                        <h2 class="font-['Poppins'] text-[18px] font-semibold text-[#737373]">Viewroom-1</h2>
                        <span class="font-['Poppins'] text-[18px] font-semibold text-[#577AB7]">(Representative View)</span>
                    </div>
                    <a href="/upload" class=" text-[14px] text-[#737373] underline">Add More</a>
                </div>
                <div class="grid grid-cols-5 gap-4">
                    {#each representativeContent.filter(content => room?.representative_content?.includes(content.id)).slice(0, 5) as content}
                        <div class="bg-[#ECEFF3] rounded-[2px] p-2 ">
                            {#if content.thumbnail}
                                <img 
                                    src={getThumbnailUrl(content)} 
                                    alt={content.title}
                                    class="w-[192px] h-[118px] object-cover rounded-[1px] mb-2"
                                />
                            {/if}
                            <div class="space-y-1">
                                <p class=" text-[14px] font-semibold text-[#577AB7] truncate">{content.title}</p>
                                <p class=" text-[11px] font-light text-black/50">ID {content.id}</p>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Host Content List -->
            <div class="bg-white rounded-[4px] p-6">
                <h2 class="font-['Poppins'] text-[18px] font-semibold text-[#737373] mb-4">Host Content</h2>
                <div class="grid grid-cols-[1fr_2fr_1fr_1fr_1fr] gap-4">
                    <div class="font-['Poppins'] text-[16px] font-semibold text-[#737373]">Title</div>
                    <div class="font-['Poppins'] text-[16px] font-semibold text-[#737373]">ID Number</div>
                    <div class="font-['Poppins'] text-[16px] font-semibold text-[#737373]">Active</div>
                    <div class="font-['Poppins'] text-[16px] font-semibold text-[#737373]">Order</div>
                    <div class="font-['Poppins'] text-[16px] font-semibold text-[#737373]">Actions</div>
                </div>
                <div class="h-[0.5px] bg-[#B4B4B4] my-4" />
                {#each hostContent.filter(content => room?.host_content?.includes(content.id)) as content, i}
                    <div class="grid grid-cols-[1fr_2fr_1fr_1fr_1fr] gap-4 items-center py-2">
                        <div class="font-['Poppins'] text-[16px] font-normal text-[#808080]">{content.title}</div>
                        <div class="font-['Poppins'] text-[16px] font-normal text-[#808080]">{content.id}</div>
                        <div class="flex items-center">
                            <div class="relative w-[39px] h-[19.5px] bg-[#DDDDDD] rounded-full">
                                <div class="absolute left-0 top-1/2 -translate-y-1/2 w-[13.5px] h-[13.5px] rounded-full bg-[#55D976] translate-x-[22px] transition-all duration-200" />
                            </div>
                        </div>
                        <div class="font-['Poppins'] text-[16px] font-normal text-[#808080] text-center">{i + 1}</div>
                        <div class="flex items-center justify-end gap-2">
                            <button class="w-[18.75px] h-[17.59px] bg-[#EB3223] rounded-full flex items-center justify-center">
                                <div class="w-[12.5px] h-[11.73px]" />
                            </button>
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Representative Content List -->
            <div class="bg-white rounded-[4px] p-6">
                <h2 class="font-['Poppins'] text-[18px] font-semibold text-[#737373] mb-4">Representative Content</h2>
                <div class="grid grid-cols-[1fr_2fr_1fr_1fr_1fr] gap-4">
                    <div class="font-['Poppins'] text-[16px] font-semibold text-[#737373]">Title</div>
                    <div class="font-['Poppins'] text-[16px] font-semibold text-[#737373]">ID Number</div>
                    <div class="font-['Poppins'] text-[16px] font-semibold text-[#737373]">Active</div>
                    <div class="font-['Poppins'] text-[16px] font-semibold text-[#737373]">Order</div>
                    <div class="font-['Poppins'] text-[16px] font-semibold text-[#737373]">Actions</div>
                </div>
                <div class="h-[0.5px] bg-[#B4B4B4] my-4" />
                {#each representativeContent.filter(content => room?.representative_content?.includes(content.id)) as content, i}
                    <div class="grid grid-cols-[1fr_2fr_1fr_1fr_1fr] gap-4 items-center py-2">
                        <div class="font-['Poppins'] text-[16px] font-normal text-[#808080]">{content.title}</div>
                        <div class="font-['Poppins'] text-[16px] font-normal text-[#808080]">{content.id}</div>
                        <div class="flex items-center">
                            <div class="relative w-[39px] h-[19.5px] bg-[#DDDDDD] rounded-full">
                                <div class="absolute left-0 top-1/2 -translate-y-1/2 w-[13.5px] h-[13.5px] rounded-full bg-[#55D976] translate-x-[22px] transition-all duration-200" />
                            </div>
                        </div>
                        <div class="font-['Poppins'] text-[16px] font-normal text-[#808080] text-center">{i + 1}</div>
                        <div class="flex items-center justify-end gap-2">
                            <button class="w-[18.75px] h-[17.59px] bg-[#EB3223] rounded-full flex items-center justify-center">
                                <div class="w-[12.5px] h-[11.73px]" />
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
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
                    if (!$form.valid) {
                        toast.error('Please fix the validation errors');
                        return;
                    }
                    
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
                            use:validators={[required, titleValidator]}
                        />
                        <HintGroup for="title">
                            <Hint on="required">Title is required</Hint>
                            <Hint on="titleLength" hideWhenRequired>Title must be at least 3 characters</Hint>
                        </HintGroup>
                    </div>

                    <div class="space-y-2">
                        <Label for="selected_video">Select Video</Label>
                        <Select.Root
                            onSelectedChange={e => {
                                selectedVideo = String(e?.value || '');
                            }}
                        >
                            <Select.Trigger class="w-full">
                                <Select.Value placeholder={hostContent.find(c => c.id === selectedVideo)?.title || 'Select a video...'} />
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
                        <Select.Root>
                            <Select.Trigger class="w-full">
                                <Select.Value placeholder="Select representatives..." />
                            </Select.Trigger>
                            <Select.Content class="w-full">
                                <div class="bg-[#ECEFF3] p-4 rounded-md max-h-[225px] overflow-y-auto">
                                    {#each representatives as rep}
                                        <div class="flex items-center justify-between gap-3 mb-3">
                                            <div class="flex items-center gap-2">
                                                {#if rep.avatar}
                                                    <img 
                                                        src={`${PUBLIC_POCKETBASE_INSTANCE}api/files/representatives/${rep.id}/${rep.avatar}`}
                                                        alt={rep.name}
                                                        class="w-8 h-8 rounded-full object-cover"
                                                    />
                                                {:else}
                                                    <div class="w-8 h-8 rounded-full bg-[#E0E8F5] flex items-center justify-center">
                                                        <span class="text-sm font-medium text-[#737373]">
                                                            {rep.name[0].toUpperCase()}
                                                        </span>
                                                    </div>
                                                {/if}
                                                <div>
                                                    <span class="font-[Poppins] text-[16px] leading-[118%] text-[#808080]">
                                                        {rep.name}
                                                    </span>
                                                    {#if rep.expand?.location}
                                                        <div class="text-xs text-[#A0A0A0]">
                                                            {rep.expand.location.name}
                                                        </div>
                                                    {:else if rep.location && locations}
                                                        <div class="text-xs text-[#A0A0A0]">
                                                            {locations.find(loc => loc.id === rep.location)?.name || ''}
                                                        </div>
                                                    {/if}
                                                </div>
                                            </div>
                                            <div class="relative">
                                                <input 
                                                    type="checkbox" 
                                                    id="representative_{rep.id}" 
                                                    value={rep.id}
                                                    class="hidden peer"
                                                    on:change={(e) => handleRepCheckboxChange(e, rep.id)}
                                                    checked={selectedRepresentatives.includes(rep.id)}
                                                />
                                                <label 
                                                    for="representative_{rep.id}" 
                                                    class="box-border w-[23px] h-[22px] bg-white border-2 border-[#808080] rounded-[2px] inline-block cursor-pointer peer-checked:bg-[#66A73B] peer-checked:border-[#66A73B] relative"
                                                >
                                                    {#if selectedRepresentatives.includes(rep.id)}
                                                        <svg class="absolute inset-0 w-full h-full text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="white"/>
                                                        </svg>
                                                    {/if}
                                                </label>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            </Select.Content>
                        </Select.Root>
                    </div>

                    <div class="space-y-2">
                        <Label for="host_content">Host Content</Label>
                        <Select.Root>
                            <Select.Trigger class="w-full">
                                <Select.Value placeholder="Select host content..." />
                            </Select.Trigger>
                            <Select.Content class="w-full">
                                <div class="bg-[#ECEFF3] p-4 rounded-md max-h-[225px] overflow-y-auto">
                                    {#each hostContent as content}
                                        <div class="flex items-center justify-between gap-3 mb-3">
                                            <div class="flex items-center gap-2">
                                                {#if content.thumbnail}
                                                    <img 
                                                        src={getThumbnailUrl(content)}
                                                        alt={content.title}
                                                        class="w-8 h-8 rounded object-cover"
                                                    />
                                                {:else}
                                                    <div class="w-8 h-8 rounded bg-[#E0E8F5] flex items-center justify-center">
                                                        <span class="text-sm font-medium text-[#737373]">
                                                            {content.title[0].toUpperCase()}
                                                        </span>
                                                    </div>
                                                {/if}
                                                <span class="font-[Poppins] text-[16px] leading-[118%] text-[#808080]">
                                                    {content.title}
                                                </span>
                                            </div>
                                            <div class="relative">
                                                <input 
                                                    type="checkbox" 
                                                    id="host_{content.id}" 
                                                    value={content.id}
                                                    class="hidden peer"
                                                    on:change={(e) => handleHostContentCheckboxChange(e, content.id)}
                                                    checked={selectedHostContent.includes(content.id)}
                                                />
                                                <label 
                                                    for="host_{content.id}" 
                                                    class="box-border w-[23px] h-[22px] bg-white border-2 border-[#808080] rounded-[2px] inline-block cursor-pointer peer-checked:bg-[#66A73B] peer-checked:border-[#66A73B] relative"
                                                >
                                                    {#if selectedHostContent.includes(content.id)}
                                                        <svg class="absolute inset-0 w-full h-full text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="white"/>
                                                        </svg>
                                                    {/if}
                                                </label>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            </Select.Content>
                        </Select.Root>
                    </div>

                    <div class="space-y-2">
                        <Label for="representative_content">Representative Content</Label>
                        <Select.Root>
                            <Select.Trigger class="w-full">
                                <Select.Value placeholder="Select representative content..." />
                            </Select.Trigger>
                            <Select.Content class="w-full">
                                <div class="bg-[#ECEFF3] p-4 rounded-md max-h-[225px] overflow-y-auto">
                                    {#each representativeContent as content}
                                        <div class="flex items-center justify-between gap-3 mb-3">
                                            <div class="flex items-center gap-2">
                                                {#if content.thumbnail}
                                                    <img 
                                                        src={getThumbnailUrl(content)}
                                                        alt={content.title}
                                                        class="w-8 h-8 rounded object-cover"
                                                    />
                                                {:else}
                                                    <div class="w-8 h-8 rounded bg-[#E0E8F5] flex items-center justify-center">
                                                        <span class="text-sm font-medium text-[#737373]">
                                                            {content.title[0].toUpperCase()}
                                                        </span>
                                                    </div>
                                                {/if}
                                                <span class="font-[Poppins] text-[16px] leading-[118%] text-[#808080]">
                                                    {content.title}
                                                </span>
                                            </div>
                                            <div class="relative">
                                                <input 
                                                    type="checkbox" 
                                                    id="rep_{content.id}" 
                                                    value={content.id}
                                                    class="hidden peer"
                                                    on:change={(e) => handleRepContentCheckboxChange(e, content.id)}
                                                    checked={selectedRepContent.includes(content.id)}
                                                />
                                                <label 
                                                    for="rep_{content.id}" 
                                                    class="box-border w-[23px] h-[22px] bg-white border-2 border-[#808080] rounded-[2px] inline-block cursor-pointer peer-checked:bg-[#66A73B] peer-checked:border-[#66A73B] relative"
                                                >
                                                    {#if selectedRepContent.includes(content.id)}
                                                        <svg class="absolute inset-0 w-full h-full text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="white"/>
                                                        </svg>
                                                    {/if}
                                                </label>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
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
        @apply bg-[#F5F5F5];
    }
</style>