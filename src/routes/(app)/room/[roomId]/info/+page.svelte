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
    import { Play, Pencil, Trash2 } from 'lucide-svelte';

    export let data;
    let showEmbed = false;
    let showEditDialog = false;
    let showDeleteDialog = false;
    let contentToDelete = null;
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
    
    // Handle content deletion
    function openDeleteDialog(content) {
        contentToDelete = content;
        showDeleteDialog = true;
    }
    
    async function deleteContent() {
        if (!contentToDelete) return;
        
        try {
            // Remove content from room
            if (selectedHostContent.includes(contentToDelete.id)) {
                selectedHostContent = selectedHostContent.filter(id => id !== contentToDelete.id);
            }
            
            if (selectedRepContent.includes(contentToDelete.id)) {
                selectedRepContent = selectedRepContent.filter(id => id !== contentToDelete.id);
            }
            
            // Update room with new content lists and include all required fields
            const formData = new FormData();
            formData.append('title', room.title); // Required field
            formData.append('owner_company', room.owner_company); // Required field
            
            // Ensure arrays are properly formatted
            if (selectedHostContent.length > 0) {
                formData.append('host_content[]', selectedHostContent.join(','));
            } else {
                formData.append('host_content[]', ''); // Empty array
            }
            
            if (selectedRepContent.length > 0) {
                formData.append('representative_content[]', selectedRepContent.join(','));
            } else {
                formData.append('representative_content[]', ''); // Empty array
            }
            
            if (selectedRepresentatives.length > 0) {
                formData.append('representative[]', selectedRepresentatives.join(','));
            } else {
                formData.append('representative[]', ''); // Empty array
            }
            
            // Include other optional fields if they exist
            if (selectedVideo) {
                formData.append('selected_video', selectedVideo);
            }
            
            if (room.is_active !== undefined) {
                formData.append('is_active', room.is_active.toString());
            }
            
            // Preserve active status for content
            if (room.host_content_active) {
                formData.append('host_content_active', JSON.stringify(room.host_content_active));
            }
            
            if (room.representative_content_active) {
                formData.append('representative_content_active', JSON.stringify(room.representative_content_active));
            }
            
            const response = await fetch('?/update-room', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.type === 'success') {
                toast.success('Content removed from room');
                await invalidateAll();
            } else {
                console.error('Error response:', result);
                toast.error('Failed to remove content: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error removing content:', error);
            toast.error('An error occurred');
        } finally {
            showDeleteDialog = false;
            contentToDelete = null;
        }
    }
    
    function playContent(content) {
        if (content.type === 'video') {
            window.open(`${PUBLIC_POCKETBASE_INSTANCE}api/files/content_library/${content.id}/${content.file}`, '_blank');
        } else {
            window.open(`${PUBLIC_POCKETBASE_INSTANCE}api/files/content_library/${content.id}/${content.file}`, '_blank');
        }
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

    // Toggle content active status within a room
    async function toggleContentActive(contentId, isHost, currentStatus) {
        try {
            // Get current room data
            const roomResponse = await fetch(`${PUBLIC_POCKETBASE_INSTANCE}api/collections/rooms/records/${room.id}`);
            if (!roomResponse.ok) {
                throw new Error('Failed to fetch room data');
            }
            
            const roomData = await roomResponse.json();
            
            // Create a new room_content record or update existing one
            const contentField = isHost ? 'host_content_active' : 'representative_content_active';
            
            // If the field doesn't exist yet, initialize it
            if (!roomData[contentField]) {
                roomData[contentField] = {};
            }
            
            // Toggle the active status for this content
            roomData[contentField][contentId] = !currentStatus;
            
            // Update the room
            const updateResponse = await fetch(`${PUBLIC_POCKETBASE_INSTANCE}api/collections/rooms/records/${room.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    [contentField]: roomData[contentField]
                })
            });
            
            if (updateResponse.ok) {
                // Update local state
                if (!room[contentField]) {
                    room[contentField] = {};
                }
                room[contentField][contentId] = !currentStatus;
                
                toast.success(`Content ${!currentStatus ? 'activated' : 'deactivated'}`);
                
                // Force reactivity
                room = {...room};
                return true;
            } else {
                const error = await updateResponse.json();
                toast.error(`Failed to update: ${error.message || 'Unknown error'}`);
                return false;
            }
        } catch (error) {
            console.error('Error toggling content active status:', error);
            toast.error('An error occurred while updating content status');
            return false;
        }
    }

    // Check if content is active in a room
    function isContentActive(contentId, isHost) {
        if (!room) return true; // Default to active if room not found
        
        const contentField = isHost ? 'host_content_active' : 'representative_content_active';
        
        // If the field doesn't exist or the content isn't explicitly set to inactive, consider it active
        if (!room[contentField] || room[contentField][contentId] === undefined) {
            return true;
        }
        
        return room[contentField][contentId];
    }
</script>

<div class="flex bg-[#F5F5F5] overflow-hidden ">
    <Sidenav activePage="rooms" />
    
    <div class="flex-1 overflow-y-auto pb-6">
        <div class="mx-auto p-6 space-y-6 mt-[6rem]">
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
                <div class="flex items-center gap-4">
                    {#each hostContent.filter(content => room?.host_content?.includes(content.id)).slice(0, 5) as content}
                        <div class="bg-[#ECEFF3] rounded-[2px] p-2 w-[221px]">
                            <div class="relative">
                                {#if content.thumbnail}
                                    <img 
                                        src={getThumbnailUrl(content)} 
                                        alt={content.title}
                                        class="w-[217.66px] h-[128.22px] object-cover rounded-[1px]"
                                    />
                                {/if}
                                {#if content.type === 'video'}
                                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                                    on:click={() => playContent(content)}
                                    >
                                        <div class="w-[37.16px] h-[35.04px] bg-white rounded-full flex items-center justify-center shadow-md">
                                           <Play class="w-[17px] h-[27.53px] text-[#577AB7]" />
                                        </div>
                                    </div>
                                {/if}
                                <div class="absolute top-2 right-2 flex gap-2">
                                    <button 
                                        class="w-[21.23px] h-[19.11px] bg-[#577AB7] rounded-full flex items-center justify-center shadow-sm"
                                        on:click|stopPropagation={() => goto(`/content-library/${content.id}/edit`)}
                                    >
                                        <Pencil class="w-[14.16px] h-[12.74px] text-[#ECEFF3]" />
                                    </button>
                                    <button 
                                        class="w-[21.23px] h-[19.11px] bg-[#EB3223] rounded-full flex items-center justify-center shadow-sm"
                                        on:click|stopPropagation={() => openDeleteDialog(content)}
                                    >
                                        <Trash2 class="w-[14.16px] h-[12.74px] text-[#ECEFF3]" />
                                    </button>
                                </div>
                            </div>
                            <div class="space-y-1 mt-2">
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
                <div class="flex items-center gap-4">
                    {#each representativeContent.filter(content => room?.representative_content?.includes(content.id)).slice(0, 5) as content}
                        <div class="bg-[#ECEFF3] rounded-[2px] p-2 w-[221px]">
                            <div class="relative">
                                {#if content.thumbnail}
                                    <img 
                                        src={getThumbnailUrl(content)} 
                                        alt={content.title}
                                        class="w-[217.66px] h-[128.22px] object-cover rounded-[1px]"
                                    />
                                {/if}
                                {#if content.type === 'video'}
                                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                                    on:click={() => playContent(content)}
                                    >
                                        <div class="w-[37.16px] h-[35.04px] bg-white rounded-full flex items-center justify-center shadow-md">
                                           <Play class="w-[17px] h-[27.53px] text-[#577AB7]" />
                                        </div>
                                    </div>
                                {/if}
                                <div class="absolute top-2 right-2 flex gap-2">
                                    <button 
                                        class="w-[21.23px] h-[19.11px] bg-[#577AB7] rounded-full flex items-center justify-center shadow-sm"
                                        on:click|stopPropagation={() => goto(`/content-library/${content.id}/edit`)}
                                    >
                                        <Pencil class="w-[14.16px] h-[12.74px] text-[#ECEFF3]" />
                                    </button>
                                    <button 
                                        class="w-[21.23px] h-[19.11px] bg-[#EB3223] rounded-full flex items-center justify-center shadow-sm"
                                        on:click|stopPropagation={() => openDeleteDialog(content)}
                                    >
                                        <Trash2 class="w-[14.16px] h-[12.74px] text-[#ECEFF3]" />
                                    </button>
                                </div>
                            </div>
                            <div class="space-y-1 mt-2">
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
                <div class="overflow-hidden border border-[#DDDDDD] rounded-[4px]">
                    <table class="w-full">
                        <thead class="bg-[#F5F5F5]">
                            <tr>
                                <th class="py-3 px-4 text-left font-['Poppins'] text-[16px] font-semibold text-[#737373]">Title</th>
                                <th class="py-3 px-4 text-left font-['Poppins'] text-[16px] font-semibold text-[#737373]">ID Number</th>
                                <th class="py-3 px-4 text-left font-['Poppins'] text-[16px] font-semibold text-[#737373]">Active</th>
                                <th class="py-3 px-4 text-center font-['Poppins'] text-[16px] font-semibold text-[#737373]">Order</th>
                                <th class="py-3 px-4 text-right font-['Poppins'] text-[16px] font-semibold text-[#737373]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each hostContent.filter(content => room?.host_content?.includes(content.id)) as content, i}
                                <tr class="border-t border-[#DDDDDD]">
                                    <td class="py-3 px-4 font-['Poppins'] text-[16px] font-normal text-[#808080]">{content.title}</td>
                                    <td class="py-3 px-4 font-['Poppins'] text-[16px] font-normal text-[#808080]">{content.id}</td>
                                    <td class="py-3 px-4">
                                        <div 
                                            class="relative w-[39px] h-[19.5px] bg-[#DDDDDD] rounded-full cursor-pointer"
                                            on:click={() => {
                                                const currentStatus = isContentActive(content.id, true);
                                                toggleContentActive(content.id, true, currentStatus);
                                            }}
                                        >
                                            <div class="absolute left-0 top-1/2 -translate-y-1/2 w-[13.5px] h-[13.5px] rounded-full {isContentActive(content.id, true) ? 'bg-[#55D976] translate-x-[22px]' : 'bg-[#7C7C7C] translate-x-[3px]'} transition-all duration-200" />
                                        </div>
                                    </td>
                                    <td class="py-3 px-4 font-['Poppins'] text-[16px] font-normal text-[#808080] text-center">{i + 1}</td>
                                    <td class="py-3 px-4 text-right flex justify-end">
                                        <button 
                                            class="w-[18.75px] h-[17.59px]  rounded-full flex items-center justify-center"
                                            on:click={() => openDeleteDialog(content)}
                                        >
                                            <img src="/icons/table-trash.svg" class="w-[21.5px] h-[18.73px] text-white" />
                                        </button>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Representative Content List -->
            <div class="bg-white rounded-[4px] p-6">
                <h2 class="font-['Poppins'] text-[18px] font-semibold text-[#737373] mb-4">Representative Content</h2>
                <div class="overflow-hidden border border-[#DDDDDD] rounded-[4px]">
                    <table class="w-full">
                        <thead class="bg-[#F5F5F5]">
                            <tr>
                                <th class="py-3 px-4 text-left font-['Poppins'] text-[16px] font-semibold text-[#737373]">Title</th>
                                <th class="py-3 px-4 text-left font-['Poppins'] text-[16px] font-semibold text-[#737373]">ID Number</th>
                                <th class="py-3 px-4 text-left font-['Poppins'] text-[16px] font-semibold text-[#737373]">Active</th>
                                <th class="py-3 px-4 text-center font-['Poppins'] text-[16px] font-semibold text-[#737373]">Order</th>
                                <th class="py-3 px-4 text-right font-['Poppins'] text-[16px] font-semibold text-[#737373]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each representativeContent.filter(content => room?.representative_content?.includes(content.id)) as content, i}
                                <tr class="border-t border-[#DDDDDD]">
                                    <td class="py-3 px-4 font-['Poppins'] text-[16px] font-normal text-[#808080]">{content.title}</td>
                                    <td class="py-3 px-4 font-['Poppins'] text-[16px] font-normal text-[#808080]">{content.id}</td>
                                    <td class="py-3 px-4">
                                        <div 
                                            class="relative w-[39px] h-[19.5px] bg-[#DDDDDD] rounded-full cursor-pointer"
                                            on:click={() => {
                                                const currentStatus = isContentActive(content.id, false);
                                                toggleContentActive(content.id, false, currentStatus);
                                            }}
                                        >
                                            <div class="absolute left-0 top-1/2 -translate-y-1/2 w-[13.5px] h-[13.5px] rounded-full {isContentActive(content.id, false) ? 'bg-[#55D976] translate-x-[22px]' : 'bg-[#7C7C7C] translate-x-[3px]'} transition-all duration-200" />
                                        </div>
                                    </td>
                                    <td class="py-3 px-4 font-['Poppins'] text-[16px] font-normal text-[#808080] text-center">{i + 1}</td>
                                    <td class="py-3 px-4 text-right flex justify-end">
                                        <button 
                                            class="w-[18.75px] h-[17.59px]  rounded-full flex items-center justify-center"
                                            on:click={() => openDeleteDialog(content)}
                                            >
                                                <img src="/icons/table-trash.svg" class="w-[21.5px] h-[18.73px] text-white" />
                                        </button>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
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
                
                {#if room.host_content_active}
                    <input type="hidden" name="host_content_active" value={JSON.stringify(room.host_content_active)} />
                {/if}
                
                {#if room.representative_content_active}
                    <input type="hidden" name="representative_content_active" value={JSON.stringify(room.representative_content_active)} />
                {/if}

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

<!-- Delete Confirmation Dialog -->
<Dialog.Root bind:open={showDeleteDialog}>
    <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
            <Dialog.Title>Remove Content</Dialog.Title>
            <Dialog.Description>
                Are you sure you want to remove this content from the room?
            </Dialog.Description>
        </Dialog.Header>
        
        {#if contentToDelete}
            <div class="py-4">
                <div class="flex items-center gap-3">
                    {#if contentToDelete.thumbnail}
                        <img 
                            src={getThumbnailUrl(contentToDelete)} 
                            alt={contentToDelete.title} 
                            class="w-16 h-16 object-cover rounded"
                        />
                    {/if}
                    <div>
                        <h3 class="font-semibold">{contentToDelete.title}</h3>
                        <p class="text-sm text-gray-500">ID: {contentToDelete.id}</p>
                    </div>
                </div>
            </div>
        {/if}
        
        <Dialog.Footer>
            <Button variant="outline" on:click={() => showDeleteDialog = false}>
                Cancel
            </Button>
            <Button variant="destructive" on:click={deleteContent}>
                Remove
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<style>
    :global(body) {
        @apply bg-[#F5F5F5];
    }
</style>