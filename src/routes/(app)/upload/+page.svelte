<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { enhance } from '$app/forms';
    import { Checkbox } from '$lib/components/ui/checkbox';
    import * as Dialog from '$lib/components/ui/dialog';
    import * as Table from "$lib/components/ui/table";
    import { toast } from 'svelte-sonner';
    import { Loader2 } from 'lucide-svelte'; // Import the loader icon
	import { goto } from '$app/navigation';
    
    export let data;
    const { user } = data;
    let representatives = data.representatives;

    const sidebarItems = [
      { name: 'Dashboard', active: true },
      { name: 'Others' },
      { name: 'Option A' },
      { name: 'Option B' },
      { name: 'Option C' },
      { name: 'Option D' },
      { name: 'Option E' },
    ];

    let newRepresentative = { name: '', phone: '', email: '' };

    function addRepresentative() {
      if (newRepresentative.name && newRepresentative.phone && newRepresentative.email) {
        representatives = [...representatives, newRepresentative];
        newRepresentative = { name: '', phone: '', email: '' }; // Reset form fields
      }
    }

    function removeRepresentative(index: number) {
      representatives = representatives.filter((_, i) => i !== index);
    }

    let videoFile: File | null = null;
    let thumbnailFile: File | null = null;
    let thumbnailUrl = '';

    function handleDrop(event: DragEvent, type: 'video' | 'thumbnail') {
        event.preventDefault();
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            handleFile(files[0], type);
        }
    }

    function handleDragOver(event: DragEvent) {
        event.preventDefault();
    }

    function handleFileInput(event: Event, type: 'video' | 'thumbnail') {
        const input = event.target as HTMLInputElement;
        const files = input.files;
        if (files && files.length > 0) {
            handleFile(files[0], type);
        }
    }

    function handleFile(file: File, type: 'video' | 'thumbnail') {
        if (type === 'video' && file.type.startsWith('video/')) {
            videoFile = file;
        } else if (type === 'thumbnail' && file.type.startsWith('image/')) {
            thumbnailFile = file;
            thumbnailUrl = URL.createObjectURL(file);
        }
    }

    function triggerFileInput(inputId: string) {
        document.getElementById(inputId)?.click();
    }

    let selectedRepresentatives: string[] = [];
    let isRepresentativeModalOpen = false;
    let isCreatingRoom = false; // New state to track room creation

    function toggleRepresentative(id: string) {
    if (selectedRepresentatives.includes(id)) {
        selectedRepresentatives = selectedRepresentatives.filter(repId => repId !== id);
    } else {
        selectedRepresentatives = [...selectedRepresentatives, id];
    }
}

    function openRepresentativeModal() {
        isRepresentativeModalOpen = true;
    }

    function closeRepresentativeModal() {
        isRepresentativeModalOpen = false;
    }

    function confirmRepresentatives() {
        closeRepresentativeModal();
    }

    // Function to get selected representatives' details
    function getSelectedRepresentativesDetails() {
    return representatives.filter(rep => selectedRepresentatives.includes(rep.id));
}

$: console.log(selectedRepresentatives);
</script>

<div class="flex bg-gray-100">
    <!-- Sidebar (fixed) -->
    <aside class="w-64 h-auto overflow-y-auto bg-white shadow-md flex-shrink-0">
        <div class="p-4">
            <div class="bg-gray-300 h-12 w-24 mb-4">LOGO</div>
            <nav>
                {#each sidebarItems as item}
                    <a
                        href="#"
                        class="block py-2 px-4 text-gray-600 hover:bg-gray-100 {item.active ? 'bg-gray-100 font-semibold' : ''}"
                    >
                        {item.name}
                    </a>
                {/each}
            </nav>
        </div>
    </aside>

    <!-- Main content area (scrollable) -->
    <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Header (fixed) -->
        <header class="bg-white shadow-sm z-10">
            <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                <h1 class="text-3xl font-bold text-gray-800">Upload a Video</h1>
            </div>
        </header>

        <!-- Scrollable content -->
        <main class="flex-1 overflow-y-auto p-6">
            <div class="max-w-7xl mx-auto">
                <div class="bg-white p-6 rounded-lg shadow">
                    <!-- Form Section -->
                    <form method="POST" action="?/createRoom" 
                    use:enhance={() => {
                        isCreatingRoom = true; // Set loading state to true when form is submitted
                        return async ({ result }) => {
                            isCreatingRoom = false; // Set loading state to false when we get a result
                            console.log('quote request results', result);
                            if (result.status === 200) {
                                toast.success('Successfully created room');
                                goto('/');
                            } else {
                                toast.error('Error creating room');
                            }
                        };
                    }}
                    enctype="multipart/form-data">
                        <div class="space-y-6">
                            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div class="flex flex-col gap-2">
                                    <label for="title" class="text-sm font-medium text-gray-700">Title</label>
                                    <input type="text" id="title" name="title" class="w-full border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"/>
                                </div>
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="description" class="text-sm font-medium text-gray-700">Brief Description</label>
                                <textarea id="description" name="desc" rows="4" class="w-full border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"></textarea>
                            </div>
                            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div class="flex flex-col gap-2">
                                    <label class="text-sm font-medium text-gray-700">Upload a Video</label>
                                    <div 
                                        class="border-dashed border-2 p-4 mt-2 text-center cursor-pointer"
                                        on:drop={(e) => handleDrop(e, 'video')}
                                        on:dragover={handleDragOver}
                                        on:click={() => triggerFileInput('video-input')}
                                    >
                                        {#if videoFile}
                                            <p>{videoFile.name}</p>
                                        {:else}
                                            Drag and drop or click here to upload your video.
                                        {/if}
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="video/*" 
                                        class="hidden" 
                                        on:change={(e) => handleFileInput(e, 'video')}
                                        id="video-input"
                                        name="video"
                                    />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label class="text-sm font-medium text-gray-700">Video Thumbnail</label>
                                    <div 
                                        class="border-dashed border-2 p-4 mt-2 text-center cursor-pointer"
                                        on:drop={(e) => handleDrop(e, 'thumbnail')}
                                        on:dragover={handleDragOver}
                                        on:click={() => triggerFileInput('thumbnail-input')}
                                    >
                                        {#if thumbnailUrl}
                                            <img src={thumbnailUrl} alt="Thumbnail" class="w-full h-auto" />
                                        {:else}
                                            Upload Image
                                        {/if}
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        class="hidden" 
                                        on:change={(e) => handleFileInput(e, 'thumbnail')}
                                        id="thumbnail-input"
                                        name="thumbnail"
                                    />
                                </div>
                            </div>
                        </div>

                        <!-- Representatives Section -->
                        <div class="mt-8">
                            <h2 class="text-lg font-bold text-gray-700 mb-4">Choose Representatives</h2>
                            <Button on:click={openRepresentativeModal}>Select Representatives</Button>
                            {#if selectedRepresentatives.length > 0}
                                <div class="mt-4">
                                    <Table.Root>
                                        <Table.Caption>Selected Representatives</Table.Caption>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head class="w-[50px]">Avatar</Table.Head>
                                                <Table.Head>Name</Table.Head>
                                                <Table.Head>Phone</Table.Head>
                                                <Table.Head>Email</Table.Head>
                                                <Table.Head class="text-right">Action</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {#each selectedRepresentatives as repId}
                                                {#each representatives as rep}
                                                    {#if rep.id === repId}
                                                        <Table.Row>
                                                            <Table.Cell>
                                                                <div class="w-10 h-10 bg-gray-200 rounded-full"></div>
                                                            </Table.Cell>
                                                            <Table.Cell class="font-medium">{rep.name}</Table.Cell>
                                                            <Table.Cell>{rep.phone || 'N/A'}</Table.Cell>
                                                            <Table.Cell>{rep.email}</Table.Cell>
                                                            <Table.Cell class="text-right">
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    on:click={() => toggleRepresentative(rep.id)}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            </Table.Cell>
                                                        </Table.Row>
                                                    {/if}
                                                {/each}
                                            {/each}
                                        </Table.Body>
                                    </Table.Root>
                                </div>
                            {:else}
                                <p class="mt-2 text-sm text-gray-600">No representatives selected</p>
                            {/if}
                        </div>

                        <input type="hidden" name="representatives" value={selectedRepresentatives.join(',')} />

                        <div class="mt-6">
                            <Button type="submit" variant="default" disabled={isCreatingRoom}>
                                {#if isCreatingRoom}
                                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                                    Creating Room...
                                {:else}
                                    Create Room
                                {/if}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    </div>
</div>

<!-- Representative Selection Modal -->
<Dialog.Root bind:open={isRepresentativeModalOpen}>
    <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
            <Dialog.Title>Select Representatives</Dialog.Title>
            <Dialog.Description>
                Choose the representatives for this room.
            </Dialog.Description>
        </Dialog.Header>
        <div class="grid gap-4 py-4">
            {#each representatives as rep}
                <div class="flex items-center space-x-2">
                    <Checkbox
                        id={rep.id}
                        checked={selectedRepresentatives.includes(rep.id)}
                        onCheckedChange={() => toggleRepresentative(rep.id)}
                    />
                    <label
                        for={rep.id}
                        class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        <p class="font-medium text-gray-900">{rep.name}</p>
                        <p class="text-sm text-gray-600">{rep.email}</p>
                    </label>
                </div>
            {/each}
        </div>
        <Dialog.Footer>
            <Button type="button" variant="outline" on:click={closeRepresentativeModal}>
                Cancel
            </Button>
            <Button type="button" on:click={confirmRepresentatives}>
                Confirm
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<style>
    /* No styles needed here now */
</style>
