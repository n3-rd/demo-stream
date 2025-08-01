<script lang="ts">
    import Sidenav from '$lib/components/layout/sidenav.svelte';
    import { Label } from "$lib/components/ui/label";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { useForm, validators, required } from 'svelte-use-form';
    import { onMount } from 'svelte';
    import LibrarySelectDialog from '../upload/LibrarySelectDialog.svelte';
	import { toast } from 'svelte-sonner';

    const form = useForm();
    export let data;
    let user = data.user;
    console.log(user)
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
    let uploading = false;
    let generatedImage = null;

    // Add these variables for the content library modal
    let showLibraryModal = false;
    let libraryType = 'both'; // Default to both
    let selectedRepresentatives: string[] = [];
    let isSaving = false;
    let saveSuccess = false;
    let saveError = false;

    // Add this for typed form elements
    let titleInput: HTMLInputElement;
    let descriptionTextarea: HTMLTextAreaElement;
    
    // Add this to store representatives
    let representatives: any[] = [];
    
    // Fetch representatives on mount
    onMount(async () => {
        try {
            const response = await fetch('/api/representatives');
            if (response.ok) {
                representatives = await response.json();
            }
        } catch (error) {
            console.error('Error fetching representatives:', error);
        }
    });

    function handleThumbnailChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            thumbnailFile = input.files[0];
        }
    }
    
    // Options for dropdowns
    const roomTypes = [
        { value: 'Living Room', label: 'Living Room' },
        { value: 'Bedroom', label: 'Bedroom' },
        { value: 'Kitchen', label: 'Kitchen' },
        { value: 'Dining Room', label: 'Dining Room' },
        { value: 'Basement Rec. Room', label: 'Basement Rec. Room' },
        { value: 'Bathroom', label: 'Bathroom' },
        { value: 'Master Bedroom', label: 'Master Bedroom' },
        { value: 'Office', label: 'Office' }
    ];
    
    const designStyles = [
        { value: 'modern', label: 'Modern' },
        { value: 'contemporary', label: 'Contemporary' },
        { value: 'minimalist', label: 'Minimalist' },
        { value: 'scandinavian', label: 'Scandinavian' },
        { value: 'industrial', label: 'Industrial' },
        { value: 'farmhouse', label: 'Farmhouse' },
        { value: 'coastal', label: 'Coastal' },
        { value: 'transitional', label: 'Transitional' },
        { value: 'rustic', label: 'Rustic' },
        { value: 'art deco', label: 'Art Deco' },
        { value: 'mid-century modern', label: 'Mid-Century Modern' },
        { value: 'japanese', label: 'Japanese' }
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
    
    async function handleSubmit() {
        if (!selectedFile) {
            toast.error('Please upload an image first');
            return;
        }
        
        try {
            uploading = true;
            
            const formData = new FormData();
            formData.append('image', selectedFile);
            formData.append('roomType', selectedRoomType);
            formData.append('designStyle', selectedDesignStyle);
            formData.append('userPrompt', customPrompt);
            
            const response = await fetch('/api/generate-room', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                generatedImage = result.imageUrl;
                // You might want to scroll to the result or show a success message
            } else {
                throw new Error(result.error || 'Failed to generate design');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error(`Error generating design: ${error.message}`);
        } finally {
            uploading = false;
        }
    }
    
    function saveToViewroom() {
        // Logic to save to viewroom
        console.log('Saving to viewroom');
    }

    // Add dialog state
    let showLibraryDialog = false;
    
    // Add this function to fix the linter error
    async function handleSaveToLibrary() {
        if (!generatedImage) {
            toast.error('No generated image');
            return;
        }
        
        if (!filePreviewUrl) {
            toast.error('No original image available');
            return;
        }
        
        try {
            isSaving = true;
            
            // Get room and style labels
            const roomLabel = roomTypes.find(r => r.value === selectedRoomType)?.label || 'Room';
            const styleLabel = designStyles.find(s => s.value === selectedDesignStyle)?.label || 'Style';
            const title = `${styleLabel} ${roomLabel}`;
            const description = customPrompt || `AI generated ${roomLabel.toLowerCase()} with ${styleLabel.toLowerCase()} style`;
            
            // 1. Fetch the generated image
            const genResponse = await fetch(generatedImage[0]);
            if (!genResponse.ok) {
                throw new Error(`Failed to fetch generated image: ${genResponse.status}`);
            }
            const genBlob = await genResponse.blob();
            const genFile = new File([genBlob], `generated-room-${Date.now()}.png`, { type: 'image/png' });
            
            // 2. Get the original image
            let origFile;
            if (selectedFile) {
                // If we have the original file already, use it
                origFile = selectedFile;
            } else {
                // Otherwise fetch from blob URL
                const blobUrl = filePreviewUrl.startsWith('blob:') ? 
                    filePreviewUrl : 
                    filePreviewUrl;
                    
                const origResponse = await fetch(blobUrl);
                if (!origResponse.ok) {
                    throw new Error(`Failed to fetch original image: ${origResponse.status}`);
                }
                const origBlob = await origResponse.blob();
                origFile = new File([origBlob], `original-room-${Date.now()}.png`, { type: 'image/png' });
            }
            
            // 3. Create two FormData objects (one for each image)
            // Original image
            const origFormData = new FormData();
            origFormData.append('title', `${title} - Original`);
            origFormData.append('description', `Original image for ${description}`);
            origFormData.append('type', 'image');
            origFormData.append('file', origFile);
            origFormData.append('thumbnail', origFile);
            
            // Fix library_type handling for 'both'
            if (libraryType === 'both') {
                origFormData.append('library_type', 'host');
                origFormData.append('library_type', 'representative');
            } else {
                origFormData.append('library_type', libraryType);
            }
            
            // For representative-specific uploads
            if (libraryType !== 'host' && selectedRepresentatives.length > 0) {
                // Add selected representatives
                selectedRepresentatives.forEach(repId => {
                    origFormData.append('representatives', repId);
                });
            }
            
            // Generated image
            const genFormData = new FormData();
            genFormData.append('title', `${title} - AI Generated`);
            genFormData.append('description', description);
            genFormData.append('type', 'image');
            genFormData.append('file', genFile);
            genFormData.append('thumbnail', genFile);
            
            // Fix library_type handling for 'both'
            if (libraryType === 'both') {
                genFormData.append('library_type', 'host');
                genFormData.append('library_type', 'representative');
            } else {
                genFormData.append('library_type', libraryType);
            }
            
            genFormData.append('active', 'true');
            genFormData.append('owner_company', user.id);
            
            // For representative-specific uploads
            if (libraryType !== 'host' && selectedRepresentatives.length > 0) {
                // Add selected representatives
                selectedRepresentatives.forEach(repId => {
                    genFormData.append('representatives', repId);
                });
            }
            
            // 4. Upload both files
            const origUploadResponse = await fetch('/upload?/uploadContent', {
                method: 'POST',
                body: origFormData
            });
            
            if (!origUploadResponse.ok) {
                throw new Error(`Original image upload failed: ${origUploadResponse.status}`);
            }
            
            const genUploadResponse = await fetch('/upload?/uploadContent', {
                method: 'POST',
                body: genFormData
            });
            
            if (!genUploadResponse.ok) {
                throw new Error(`Generated image upload failed: ${genUploadResponse.status}`);
            }
            
            // 5. Process results
            const origResult = await origUploadResponse.json();
            const genResult = await genUploadResponse.json();
            
            if (origResult.type === 'success' && genResult.type === 'success') {
                saveSuccess = true;
                toast.success('Both original and generated images saved to content library!');
                setTimeout(() => {
                    showLibraryModal = false;
                    saveSuccess = false;
                }, 2000);
            } else {
                saveError = true;
                toast.error('Error saving one or both images to content library');
                console.error('Upload results:', { origResult, genResult });
            }
        } catch (error) {
            saveError = true;
            toast.error(`Error: ${error.message}`);
            console.error('Error saving to content library:', error);
        } finally {
            isSaving = false;
        }
    }
    
    // For the LibrarySelectDialog approach
    async function handleLibrarySelect(type: string) {
        if (!generatedImage) return;
        
        try {
            // Fetch the image from the URL
            const response = await fetch(generatedImage[0]);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status}`);
            }
            
            const blob = await response.blob();
            
            // Create a proper file object
            const fileName = `room-design-${Date.now()}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            
            // Create formData with all required fields
            const formData = new FormData();
            
            // Use the current room details for title and description
            const roomLabel = roomTypes.find(r => r.value === selectedRoomType)?.label || 'Room';
            const styleLabel = designStyles.find(s => s.value === selectedDesignStyle)?.label || 'Style';
            
            formData.append('title', `${styleLabel} ${roomLabel}`);
            formData.append('description', customPrompt || `AI generated ${roomLabel.toLowerCase()} with ${styleLabel.toLowerCase()} style`);
            formData.append('type', 'image');
            formData.append('file', file);
            formData.append('thumbnail', file);
            
            // Fix library_type handling for 'both'
            if (type === 'both') {
                formData.append('library_type', 'host');
                formData.append('library_type', 'representative');
            } else {
                formData.append('library_type', type);
            }
            
            formData.append('active', 'true');
            formData.append('owner_company', user.id); 
            
            // Make the request
            const uploadResponse = await fetch('/upload?/uploadContent', {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error('Error response:', errorText);
                throw new Error(`Upload failed with status: ${uploadResponse.status}`);
            }
            
            const result = await uploadResponse.json();
            
            if (result.type === 'success') {
                toast.success('Successfully saved to content library!');
            } else {
                toast.error('Error saving to content library');
                console.error('Error saving to content library:', result);
            }
        } catch (error) {
            toast.error(`Error saving to content library: ${error.message}`);
            console.error('Error saving to content library:', error);
        } finally {
            showLibraryDialog = false;
        }
    }

    // Library selection dialog
    let librarySelectOpen = false;
    let selectedLibraryType = '';

    // Function to open the library dialog
    function openLibraryDialog() {
        // Instead of just setting librarySelectOpen, we'll create a new form submission
        if (!generatedImage) {
            toast.error('No image generated yet');
            return;
        }
        
        if (!filePreviewUrl) {
            toast.error('No original image available');
            return;
        }
        
        // Open the library type selection dialog
        librarySelectOpen = true;
    }
    
    // Handle library type selection
    async function handleLibraryTypeSelect(type: string) {
        if (!generatedImage) {
            toast.error('No image generated yet');
            return;
        }
        
        if (!filePreviewUrl) {
            toast.error('No original image available');
            return;
        }
        
        try {
            // Show loading state
            librarySelectOpen = false;
            toast.loading('Saving to content library...');
        
        // Get room and style labels
        const roomLabel = roomTypes.find(r => r.value === selectedRoomType)?.label || 'Room';
        const styleLabel = designStyles.find(s => s.value === selectedDesignStyle)?.label || 'Style';
            const title = `${styleLabel} ${roomLabel}`;
            const description = customPrompt || `AI generated ${roomLabel.toLowerCase()} with ${styleLabel.toLowerCase()} style`;
            
            // 1. Fetch the generated image
            const genResponse = await fetch(generatedImage[0]);
            if (!genResponse.ok) {
                throw new Error(`Failed to fetch generated image: ${genResponse.status}`);
            }
            const genBlob = await genResponse.blob();
            
            // 2. Get the original image from the file input or blob URL
            let origBlob;
            if (selectedFile) {
                // If we have the original file already, use it
                const fileReader = new FileReader();
                origBlob = await new Promise<Blob>((resolve) => {
                    fileReader.onload = () => {
                        resolve(new Blob([fileReader.result], { type: selectedFile.type }));
                    };
                    fileReader.readAsArrayBuffer(selectedFile);
                });
            } else {
                // Otherwise fetch from blob URL
                const blobUrl = filePreviewUrl;
                try {
                    const origResponse = await fetch(blobUrl);
                    if (!origResponse.ok) {
                        throw new Error(`Failed to fetch original image: ${origResponse.status}`);
                    }
                    origBlob = await origResponse.blob();
                } catch (error) {
                    console.error('Error fetching original image:', error);
                    toast.error('Could not access original image');
                    return;
                }
            }
            
            // 3. Create a single FormData object with both images
        const formData = new FormData();
            
            // Add metadata
            formData.append('title', `${title} (AI Room Design)`);
            formData.append('description', description);
            formData.append('type', 'image');
            
            // Fix library_type handling for 'both'
            if (type === 'both') {
                formData.append('library_type', 'host');
                formData.append('library_type', 'representative');
            } else {
                formData.append('library_type', type);
            }
            
            formData.append('active', 'true');
            formData.append('owner_company', user.id);
            
            // Add BOTH images as separate files
            formData.append('original_file', new File([origBlob], `original-room-${Date.now()}.png`, { type: 'image/png' }));
            formData.append('generated_file', new File([genBlob], `generated-room-${Date.now()}.png`, { type: 'image/png' }));
            
            // Upload both files at once
            const response = await fetch('/api/ai-room-designer/create', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Upload error response:', errorText);
                throw new Error(`Upload failed with status: ${response.status}`);
            }
            
            const result = await response.json();
            
            toast.dismiss();
            if (result.success) {
                toast.success('Both original and generated images saved to content library!');
            } else {
                toast.error(result.message || 'Error saving images to content library');
                console.error('Error saving to content library:', result);
            }
        } catch (error) {
            toast.dismiss();
            toast.error(`Error: ${error.message}`);
            console.error('Upload error:', error);
        }
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
                            bind:this={titleInput}
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
                            bind:this={descriptionTextarea}
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
                                on:click={handleSubmit}
                                class="bg-primary hover:bg-primary/80 text-white font-medium py-2 px-4 rounded-md w-full"
                                disabled={!selectedFile || uploading}
                            >
                                {uploading ? 'Generating...' : 'Generate Design'}
                            </Button>
                        </div>
                    </div>

                </div>
               <div class="w-full">
                <div class="h-[30rem] w-[45rem] bg-gray-300 flex justify-center items-center mx-auto">
                    {#if generatedImage}
                        <img src={generatedImage[0]} alt="Generated room design" class="h-full w-full object-contain" />
                    {:else}
                        <h1>Image Preview</h1>
                    {/if}
                </div>
                
                {#if generatedImage}
                    <div class="flex justify-center mt-4">
                        <a href={generatedImage[0]} class="btn bg-primary text-white px-4 py-2 rounded-md" download="room-design.png">Download Image</a>
                        
                        <!-- This is the simplified button to open the dialog -->
                        <button 
                            on:click={openLibraryDialog}
                            class="btn bg-primary text-white px-4 py-2 rounded-md ml-4"
                        >
                            Save to Content Library
                        </button>
                    </div>
                    {#if generatedImage.length > 1}
                    <div class="mt-6">
                        <details class="mb-4">
                            <summary class="cursor-pointer font-semibold">View processed raw images</summary>
                            <div class="grid grid-cols-2 gap-4 mt-3">
                                {#each generatedImage.slice(1) as img, i}
                                    <div>
                                        <img src={img} alt={`Debug image ${i+1}`} class="rounded-lg w-full" />
                                        <a href={img} class="btn btn-sm btn-outline mt-2" download={`room-design-extra-${i+1}.png`}>Download</a>
                                    </div>
                                {/each}
                            </div>
                        </details>
                    </div>
                {/if}
                {/if}
            </div>

        </div>
    </div>
    </div>
</div>

{#if showLibraryModal}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-[400px] max-w-full">
            <h3 class="text-xl font-bold mb-4">Save to Content Library</h3>
            
            {#if saveSuccess}
                <div class="bg-green-100 text-green-800 p-3 rounded mb-4">
                    Successfully saved to content library!
                </div>
            {/if}
            
            {#if saveError}
                <div class="bg-red-100 text-red-800 p-3 rounded mb-4">
                    Error saving to content library. Please try again.
                </div>
            {/if}
            
            <div class="mb-4">
                <Label class="block text-[14px] font-medium text-[#737373]">Library Type</Label>
                <div class="flex gap-4 items-center mt-2">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="library_type" 
                            value="host"
                            bind:group={libraryType}
                            class="w-[15px] h-[15px]"
                        />
                        <span class="text-[14px] text-[#737373]">Host Only</span>
                    </label>
                    
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="library_type" 
                            value="representative"
                            bind:group={libraryType}
                            class="w-[15px] h-[15px]"
                        />
                        <span class="text-[14px] text-[#737373]">Representative Only</span>
                    </label>
                    
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="library_type" 
                            value="both"
                            bind:group={libraryType}
                            class="w-[15px] h-[15px]"
                        />
                        <span class="text-[14px] text-[#737373]">Both</span>
                    </label>
                </div>
            </div>
            
            <!-- Only show representatives selection if not "host only" -->
            {#if libraryType !== 'host'}
                <div class="mb-4">
                    <Label class="block text-[14px] font-medium text-[#737373]">Select Representatives</Label>
                    <select
                        multiple
                        bind:value={selectedRepresentatives}
                        class="w-full border border-gray-300 rounded p-2 h-[100px]"
                    >
                        {#if representatives.length === 0}
                            <option disabled>No representatives found</option>
                        {:else}
                            {#each representatives as rep}
                                <option value={rep.id}>{rep.name}</option>
                            {/each}
                        {/if}
                    </select>
                </div>
            {/if}
            
            <div class="flex justify-end gap-3 mt-6">
                <button 
                    on:click={() => showLibraryModal = false}
                    class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                    Cancel
                </button>
                
                <button 
                    on:click={handleSaveToLibrary}
                    class="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Use the exact same LibrarySelectDialog component -->
<LibrarySelectDialog 
    bind:open={librarySelectOpen} 
    onSelect={handleLibraryTypeSelect} 
/>
