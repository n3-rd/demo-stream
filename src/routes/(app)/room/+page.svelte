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
    import { onMount } from 'svelte';

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

    $: ({ rooms, representatives, hostContent, repContent, locations } = data);

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

    // Toggle room active status
    async function toggleRoomActive(room) {
        try {
            // Create update data with toggled is_active status
            const updateData = {
                is_active: !room.is_active
            };
            
            // Send PATCH request to update the room
            const response = await fetch(`${PUBLIC_POCKETBASE_INSTANCE}api/collections/rooms/records/${room.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });
            
            if (response.ok) {
                // Update local state
                room.is_active = !room.is_active;
                toast.success(`Room ${room.is_active ? 'activated' : 'deactivated'}`);
                
                // Force reactivity
                rooms = [...rooms];
            } else {
                const error = await response.json();
                toast.error(`Failed to update: ${error.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error updating room:', error);
            toast.error('An error occurred while updating the room');
        }
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

    // Toggle content active status within a room
    async function toggleContentActive(roomId, contentId, isHost, currentStatus) {
        try {
            // Get current room data
            const roomResponse = await fetch(`${PUBLIC_POCKETBASE_INSTANCE}api/collections/rooms/records/${roomId}`);
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
            const updateResponse = await fetch(`${PUBLIC_POCKETBASE_INSTANCE}api/collections/rooms/records/${roomId}`, {
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
                const room = rooms.find(r => r.id === roomId);
                if (room) {
                    if (!room[contentField]) {
                        room[contentField] = {};
                    }
                    room[contentField][contentId] = !currentStatus;
                    rooms = [...rooms]; // Force reactivity
                }
                
                toast.success(`Content ${!currentStatus ? 'activated' : 'deactivated'}`);
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
    function isContentActive(roomId, contentId, isHost) {
        const room = rooms.find(r => r.id === roomId);
        if (!room) return true; // Default to active if room not found
        
        const contentField = isHost ? 'host_content_active' : 'representative_content_active';
        
        // If the field doesn't exist or the content isn't explicitly set to inactive, consider it active
        if (!room[contentField] || room[contentField][contentId] === undefined) {
            return true;
        }
        
        return room[contentField][contentId];
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

    function handleRepCheckboxChange(e: Event, repId: string) {
        const checkbox = e.target as HTMLInputElement;
        if (checkbox.checked) {
            selectedRepresentatives = [...selectedRepresentatives, repId];
        } else {
            selectedRepresentatives = selectedRepresentatives.filter(id => id !== repId);
        }
        
        // Update the hidden input for validation
        const repInput = document.querySelector('input[name="representative[]"]') as HTMLInputElement;
        if (repInput) {
            repInput.value = selectedRepresentatives.join(',');
            const event = new Event('input', { bubbles: true });
            repInput.dispatchEvent(event);
        }
    }

    function handleHostContentCheckboxChange(e: Event, contentId: string) {
        const checkbox = e.target as HTMLInputElement;
        if (checkbox.checked) {
            selectedHostContent = [...selectedHostContent, contentId];
        } else {
            selectedHostContent = selectedHostContent.filter(id => id !== contentId);
        }
        
        // Update the hidden input for validation
        const hostContentInput = document.querySelector('input[name="host_content[]"]') as HTMLInputElement;
        if (hostContentInput) {
            hostContentInput.value = selectedHostContent.join(',');
            const event = new Event('input', { bubbles: true });
            hostContentInput.dispatchEvent(event);
        }
    }

    function handleRepContentCheckboxChange(e: Event, contentId: string) {
        const checkbox = e.target as HTMLInputElement;
        if (checkbox.checked) {
            selectedRepContent = [...selectedRepContent, contentId];
        } else {
            selectedRepContent = selectedRepContent.filter(id => id !== contentId);
        }
        
        // Update the hidden input for validation
        const repContentInput = document.querySelector('input[name="representative_content[]"]') as HTMLInputElement;
        if (repContentInput) {
            repContentInput.value = selectedRepContent.join(',');
            const event = new Event('input', { bubbles: true });
            repContentInput.dispatchEvent(event);
        }
    }
    
    // Reset form when dialog is opened
    function openAddRoomDialog() {
        showAddRoomDialog = true;
        selectedVideo = '';
        selectedHostContent = [];
        selectedRepContent = [];
        selectedRepresentatives = [];
        
        // Reset form validation state
        setTimeout(() => {
            const inputs = document.querySelectorAll('form[action="?/create-room"] input[name]');
            inputs.forEach(input => {
                if (input instanceof HTMLInputElement) {
                    input.value = input.type === 'checkbox' ? '' : '';
                    const event = new Event('input', { bubbles: true });
                    input.dispatchEvent(event);
                }
            });
        }, 100);
    }
    
    // Custom validator for title
    function titleValidator(value: string) {
        if (!value || value.trim().length < 3) {
            return { titleLength: true };
        }
        return null;
    }
    
    // Custom validator for array inputs
    function arrayValidator(value: string) {
        if (!value || value === '') {
            return { required: true };
        }
        return null;
    }
</script>

<!-- Header -->
<div class="flex h-screen bg-[#F5F5F5]">
    <Sidenav activePage="rooms" />
    
    <div class="flex-1 overflow-auto p-6 mt-[6rem]">
        <div class=" mx-auto space-y-6">
            <!-- Header -->
            <div class="bg-white rounded-[8px] h-[69px] flex items-center justify-between px-6">
                <h1 class=" text-[24px] font-bold leading-[118%] text-[#808080]">View Room List</h1>
                <Button 
                    class="bg-[#577AB7] h-[39px] rounded-[3px] font-semibold text-[16px] text-white"
                    on:click={openAddRoomDialog}
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
                            <div 
                                class="relative w-[39px] h-[19.5px] bg-[#DDDDDD] rounded-full cursor-pointer"
                                on:click={() => toggleRoomActive(room)}
                            >
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
                if (!$form.valid) {
                    toast.error('Please fix the validation errors');
                    return;
                }
                
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
                        use:validators={[required, titleValidator]}
                    />
                    <HintGroup for="title">
                        <Hint on="required">Title is required</Hint>
                        <Hint on="titleLength" hideWhenRequired>Title must be at least 3 characters</Hint>
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
                    <Select.Root>
                        <Select.Trigger class="w-full {$form.representative && $form.representative.errors?.required ? 'border-red-500' : ''}">
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
                    <input 
                        type="hidden" 
                        name="representative[]" 
                        value={selectedRepresentatives.join(',')}
                        use:validators={[arrayValidator]}
                    />
                    <HintGroup for="representative[]">
                        <Hint on="required">At least one representative must be selected</Hint>
                    </HintGroup>
                </div>

                <div class="space-y-2">
                    <Label for="host_content">Host Content</Label>
                    <Select.Root>
                        <Select.Trigger class="w-full {$form['host_content[]'] && $form['host_content[]'].errors?.required ? 'border-red-500' : ''}">
                            <Select.Value placeholder="Select host content..." />
                        </Select.Trigger>
                        <Select.Content class="w-full">
                            <div class="bg-[#ECEFF3] p-4 rounded-md max-h-[225px] overflow-y-auto">
                                {#each hostContent as content}
                                    <div class="flex items-center justify-between gap-3 mb-3">
                                        <span class="font-[Poppins] text-[16px] leading-[118%] text-[#808080]">
                                            {content.title}
                                        </span>
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
                    <input 
                        type="hidden" 
                        name="host_content[]" 
                        value={selectedHostContent.join(',')}
                        use:validators={[arrayValidator]}
                    />
                    <HintGroup for="host_content[]">
                        <Hint on="required">At least one host content must be selected</Hint>
                    </HintGroup>
                </div>

                <div class="space-y-2">
                    <Label for="representative_content">Representative Content</Label>
                    <Select.Root>
                        <Select.Trigger class="w-full {$form['representative_content[]'] && $form['representative_content[]'].errors?.required ? 'border-red-500' : ''}">
                            <Select.Value placeholder="Select representative content..." />
                        </Select.Trigger>
                        <Select.Content class="w-full">
                            <div class="bg-[#ECEFF3] p-4 rounded-md max-h-[225px] overflow-y-auto">
                                {#each repContent as content}
                                    <div class="flex items-center justify-between gap-3 mb-3">
                                        <span class="font-[Poppins] text-[16px] leading-[118%] text-[#808080]">
                                            {content.title}
                                        </span>
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
                    <input 
                        type="hidden" 
                        name="representative_content[]" 
                        value={selectedRepContent.join(',')}
                        use:validators={[arrayValidator]}
                    />
                    <HintGroup for="representative_content[]">
                        <Hint on="required">At least one representative content must be selected</Hint>
                    </HintGroup>
                </div>
            </div>

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
                            <div class="flex justify-between items-start">
                                <h3 class="font-semibold text-lg">{content.title}</h3>
                                
                                <!-- Active toggle -->
                                <div class="flex items-center gap-2">
                                    <span class="text-sm text-gray-500">Active</span>
                                    <div 
                                        class="relative w-[39px] h-[19.5px] bg-[#DDDDDD] rounded-full cursor-pointer"
                                        on:click={() => {
                                            const roomId = rooms.find(room => 
                                                (room.expand?.host_content?.some(c => c.id === content.id) || 
                                                room.expand?.representative_content?.some(c => c.id === content.id))
                                            )?.id;
                                            
                                            if (roomId) {
                                                const isHost = dialogTitle === 'Host Content';
                                                const currentStatus = isContentActive(roomId, content.id, isHost);
                                                toggleContentActive(roomId, content.id, isHost, currentStatus);
                                            }
                                        }}
                                    >
                                        {#if rooms.length > 0}
                                            {#if (() => {
                                                const roomId = rooms.find(room => 
                                                    (room.expand?.host_content?.some(c => c.id === content.id) || 
                                                    room.expand?.representative_content?.some(c => c.id === content.id))
                                                )?.id;
                                                
                                                if (roomId) {
                                                    const isHost = dialogTitle === 'Host Content';
                                                    return isContentActive(roomId, content.id, isHost);
                                                }
                                                return true;
                                            })()}
                                                <div class="absolute left-0 top-1/2 -translate-y-1/2 w-[13.5px] h-[13.5px] rounded-full bg-[#55D976] translate-x-[22px] transition-all duration-200" />
                                            {:else}
                                                <div class="absolute left-0 top-1/2 -translate-y-1/2 w-[13.5px] h-[13.5px] rounded-full bg-[#7C7C7C] translate-x-[3px] transition-all duration-200" />
                                            {/if}
                                        {/if}
                                    </div>
                                </div>
                            </div>
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
