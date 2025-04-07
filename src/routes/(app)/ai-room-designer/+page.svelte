<script lang="ts">
    import Sidenav from '$lib/components/layout/sidenav.svelte';
    import { Label } from "$lib/components/ui/label";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { useForm, validators, required } from 'svelte-use-form';

    const form = useForm();
    let selectedFile: File | null = null;
    let filePreviewUrl: string | null = null;
    let customPrompt = '';
    let touchedFields = {
        title: false,
        description: false,
        file: false,
        thumbnail: false
    };
    let formSubmitAttempted = false;
    let thumbnailFile: File | null = null;

    function handleThumbnailChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            thumbnailFile = input.files[0];
        }
    }
    
    // Options for dropdowns
    const roomTypes = [
        { value: 'living', label: 'Living Room' },
        { value: 'bedroom', label: 'Bedroom' },
        { value: 'kitchen', label: 'Kitchen' },
        { value: 'bathroom', label: 'Bathroom' },
        { value: 'office', label: 'Office' }
    ];
    
    const designStyles = [
        { value: 'modern', label: 'Modern' },
        { value: 'minimalist', label: 'Minimalist' },
        { value: 'scandinavian', label: 'Scandinavian' },
        { value: 'industrial', label: 'Industrial' },
        { value: 'traditional', label: 'Traditional' },
        { value: 'bohemian', label: 'Bohemian' }
    ];
    
    let selectedRoomType = roomTypes[0].value;
    let selectedDesignStyle = designStyles[0].value;

    function handleFileChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            selectedFile = input.files[0];
            filePreviewUrl = URL.createObjectURL(input.files[0]);
        }
    }

    function generateRoom() {
        // Logic to generate room would go here
        console.log('Generating room with:', { selectedRoomType, selectedDesignStyle });
    }
    
    function handleSubmit() {
        // Submit final design
        console.log('Submitting with custom prompt:', customPrompt);
    }
    
    function saveToViewroom() {
        // Logic to save to viewroom
        console.log('Saving to viewroom');
    }
</script>

<div class="flex h-screen bg-[#eceef3]">
    <Sidenav activePage="ai-room-designer" />
    
    <div class="flex-1 p-6 mt-[6rem]">
        <div class="mx-auto space-y-6">
            <!-- Header -->
            <div class="bg-white rounded-[8px] h-[69px] flex items-center justify-between px-6">
                <h1 class="text-[24px] font-bold leading-[118%] text-[#808080]">AI Room Designer</h1>
                <Button 
                    type="submit" 
                    form="designForm"
                    class="w-[85px] h-[39px] bg-[#577AB7] rounded-[3px] font-semibold text-[16px] text-white"
                >
                    Upload
                </Button>
            </div>

            <!-- Main Form -->
            <div class="bg-white rounded-[8px] p-8">
                <form id="designForm" on:submit={handleSubmit} use:form class="space-y-8" novalidate>
                    <!-- Title -->
                    <div class="space-y-2">
                        <Label for="title" class="block text-[14px] font-medium text-[#737373]">Title</Label>
                        <input 
                            type="text" 
                            id="title" 
                            name="title" 
                            required 
                            use:validators={[required]}
                            on:blur={() => touchedFields.title = true}
                            class="w-full h-[38px] border border-[#9E9E9E] rounded-[5px] px-3 {(touchedFields.title || formSubmitAttempted) && $form.title?.errors?.required ? 'border-red-500' : ''}"
                        />
                        {#if (touchedFields.title || formSubmitAttempted) && $form.title?.errors?.required}
                            <span class="text-red-500 text-sm">Title is required</span>
                        {/if}
                    </div>

                    <!-- Type of Content -->
                    <div class="space-y-2">
                        <Label class="block text-[14px] font-medium text-[#737373]">Type of Content</Label>
                        <div class="flex gap-8 items-center">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="content_type" 
                                    value="image"
                                    checked
                                    class="w-[15px] h-[15px]"
                                />
                                <span class="text-[14px] text-[#737373]">Image</span>
                            </label>
                        </div>
                    </div>

                    <!-- Brief Description -->
                    <div class="space-y-2">
                        <Label for="description" class="block text-[14px] font-medium text-[#737373]">Brief Description</Label>
                        <textarea 
                            id="description" 
                            name="description" 
                            use:validators={[required]}
                            on:blur={() => touchedFields.description = true}
                            class="w-full h-[145px] border border-[#9E9E9E] rounded-[5px] resize-none px-3 py-2 {(touchedFields.description || formSubmitAttempted) && $form.description?.errors?.required ? 'border-red-500' : ''}" 
                        ></textarea>
                    </div>

                 
                </form>
            </div>

               <!-- room section -->
               <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Left Side - Image Upload & Preview -->
                <div class="bg-white rounded-[8px] p-6 flex flex-col">
                    <div class="bg-gray-100 rounded-md aspect-video mb-4 flex flex-col items-center justify-center p-4">
                        {#if filePreviewUrl}
                            <img src={filePreviewUrl} alt="Uploaded room" class="max-h-full max-w-full object-contain" />
                            <div class="mt-2 text-center text-sm">Image uploaded</div>
                        {:else}
                            <div class="text-center p-6 text-gray-600">
                                <p class="mb-2">The image that is uploaded will need to go to replicate. Ask AI for the endpoint.</p>
                            </div>
                        {/if}
                    </div>
                    
                    <!-- File Upload -->
                    <div class="mb-4">
                        <div class="relative h-[38px]">
                            <input 
                                type="file" 
                                id="file" 
                                name="file" 
                                accept="image/*"
                                on:change={handleFileChange}
                                class="absolute inset-0 opacity-0 z-10 cursor-pointer"
                            />
                            <div class="w-full h-full border border-[#9E9E9E] rounded-[5px] flex items-center px-3 bg-white">
                                <span class="text-[#737373]">{selectedFile?.name || 'Choose file...'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Save to Viewroom Button -->
                    <button 
                        on:click={saveToViewroom}
                        class="mt-auto p-2 text-center text-sm text-gray-700 hover:underline"
                    >
                        Save Image to Viewroom
                    </button>
                </div>
                
                <!-- Right Side - Settings -->
                <div class="flex flex-col gap-6">
                    <!-- Room Configuration Panel -->
                    <div class="bg-white rounded-[8px] p-6 flex flex-col gap-4">
                        <!-- Room Type -->
                        <div>
                            <Label for="roomType" class="block text-[14px] font-medium text-gray-800 mb-1">Room Type</Label>
                            <div class="relative w-full h-[38px]">
                                <select 
                                    id="roomType" 
                                    bind:value={selectedRoomType}
                                    class="w-full h-full px-3 py-2 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    {#each roomTypes as type}
                                        <option value={type.value}>{type.label}</option>
                                    {/each}
                                </select>
                                <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Design Style -->
                        <div>
                            <Label for="designStyle" class="block text-[14px] font-medium text-gray-800 mb-1">Design Style</Label>
                            <div class="relative w-full h-[38px]">
                                <select 
                                    id="designStyle" 
                                    bind:value={selectedDesignStyle}
                                    class="w-full h-full px-3 py-2 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    {#each designStyles as style}
                                        <option value={style.value}>{style.label}</option>
                                    {/each}
                                </select>
                                <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>

                    </div>
                    
                    <!-- Custom Prompt and Submit -->
                    <div class="bg-gray-100 rounded-[8px] p-6 flex flex-col gap-4">
                        <div>
                            <Label for="customPrompt" class="block text-[14px] font-medium text-gray-700 mb-1">Custom prompt</Label>
                            <textarea 
                                id="customPrompt" 
                                bind:value={customPrompt}
                                class="w-full h-[80px] border border-gray-300 rounded-md px-3 py-2 resize-none"
                                placeholder="Enter custom instructions for your room design..."
                            ></textarea>
                        </div>
                        
                        <div class="flex justify-between">
                            <Button 
                                on:click={generateRoom}
                                class="bg-primary hover:bg-primary/80 text-white font-medium py-2 px-4 rounded-md w-full"
                            >
                                Generate Room
                            </Button>
                        </div>
                    </div>

                </div>
               <div class="w-full">
                <div class="h-[30rem] w-[45rem] bg-gray-300 flex justify-center items-center mx-auto">

                    <h1>Image Preview</h1>
                </div>
                </div>
            </div>



        </div>
    </div>
</div>
