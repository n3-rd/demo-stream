<script lang="ts">

    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Textarea } from "$lib/components/ui/textarea";
    import * as Select from "$lib/components/ui/select";
    import { toast } from "svelte-sonner";
    import { goto, invalidateAll } from "$app/navigation";
    import { enhance } from "$app/forms";
    import { Loader2 } from "lucide-svelte";
    import { onDestroy } from "svelte";
    import Sidenav from '$lib/components/layout/sidenav.svelte';
    import LibrarySelectDialog from './LibrarySelectDialog.svelte';
    import { useForm, HintGroup, Hint, validators, required } from 'svelte-use-form';
    import * as Switch from "$lib/components/ui/switch";

    export let data;
    const { user, representatives } = data;
    const form = useForm();

    let loading = false;
    let selectedType = 'video';
    let selectedLibraryType: string | null = null;
    let selectedFile: File | null = null;
    let thumbnailFile: File | null = null;
    let selectedRepresentatives: string[] = [];
    let isUploading = false;
    let uploadProgress = 0;
    let uploadedChunks: Set<number> = new Set();
    let thumbnailPreviewUrl: string | null = null;
    let showLibraryDialog = false;
    let filePreviewUrl: string | null = null;
    
    // Track touched state per field instead of globally
    let touchedFields = {
        title: false,
        description: false,
        file: false,
        thumbnail: false
    };
    let formSubmitAttempted = false;

    const CHUNK_SIZE = 512 * 1024; // 500KB chunks (reduced from 1MB for Vercel)

    const contentTypes = [
        { value: 'video', label: 'Video' },
        { value: 'pdf', label: 'PDF' },
        { value: 'document', label: 'Document' },
        { value: 'word', label: 'Word' }
    ];

    const libraryTypes = [
        { value: 'host', label: 'Host Library' },
        { value: 'representative', label: 'Representative Library' },
        { value: 'both', label: 'Both' }
    ];

    const allowedFileTypes = {
        video: 'video/*',
        pdf: 'application/pdf',
        document: '.doc,.docx,.xls,.xlsx',
        word: '.doc,.docx'
    };

    let isContentActive = true; // Default to active

    function handleFileChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            selectedFile = input.files[0];
        }
        touchedFields.file = true;
    }

    function handleThumbnailChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            thumbnailFile = input.files[0];
            thumbnailPreviewUrl = URL.createObjectURL(input.files[0]);
        }
        touchedFields.thumbnail = true;
    }

    function resetThumbnail() {
        thumbnailPreviewUrl = null;
        thumbnailFile = null;
        const input = document.getElementById('thumbnail');
        if (input instanceof HTMLInputElement) {
            input.value = '';
        }
    }

    function handleTypeChange(value: string) {
        selectedType = value;
        selectedFile = null;
        const fileInput = document.getElementById('file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    }

    function handleLibraryTypeSelect(event: CustomEvent<string>) {
        selectedLibraryType = event.detail;
    }

    function handleRepresentativeSelect(event: CustomEvent<{ value: string }[]>) {
        selectedRepresentatives = event.detail.map(item => item.value);
        console.log('Selected representatives:', selectedRepresentatives);
    }

    function handleRepresentativeChange(value: string) {
        const repId = value;
        if (selectedRepresentatives.includes(repId)) {
            selectedRepresentatives = selectedRepresentatives.filter(id => id !== repId);
        } else {
            selectedRepresentatives = [...selectedRepresentatives, repId];
        }
    }

    function getRepresentativeName(repId: string) {
        const rep = representatives.find(r => r.id === repId);
        return rep ? rep.name : 'Unknown';
    }

    function getFilePreview() {
        if (!selectedFile) return null;
        
        if (selectedType === 'video' && selectedFile.type.startsWith('video/')) {
            return URL.createObjectURL(selectedFile);
        }
        
        return null;
    }

    async function uploadChunk(chunk: Blob, index: number, filename: string, totalChunks: number) {
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('index', index.toString());
        formData.append('filename', filename);
        formData.append('totalChunks', totalChunks.toString());

        const response = await fetch('/api/upload-chunk', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Failed to upload chunk ${index}`);
        }

        uploadedChunks.add(index);
        uploadProgress = (uploadedChunks.size / totalChunks) * 100;
    }

    async function uploadFile(file: File) {
        const filename = `${Date.now()}-${file.name}`;
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        for (let i = 0; i < totalChunks; i++) {
            if (!uploadedChunks.has(i)) {
                const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                await uploadChunk(chunk, i, filename, totalChunks);
            }
        }

        return filename;
    }

    async function handleSubmit(event: Event) {
        event.preventDefault();
        formSubmitAttempted = true;
        
        // Check for specific validation errors and show appropriate toasts
        if (!$form.title || $form.title.errors?.required) {
            toast.error('Please provide a title');
            return;
        }
        
        if (!$form.description || $form.description.errors?.required) {
            toast.error('Please provide a description');
            return;
        }
        
        if (!selectedFile) {
            toast.error('Please select a file');
            return;
        }
        
        if (!thumbnailFile) {
            toast.error('Please select a thumbnail');
            return;
        }

        // Show library selection dialog instead of uploading immediately
        showLibraryDialog = true;
    }

    function getBackendContentType(frontendType) {
        if (frontendType === 'word') {
            return 'document';
        }
        return frontendType;
    }

    async function handleLibrarySelect(libraryType: string) {
        showLibraryDialog = false;
        isUploading = true;
        uploadProgress = 0;
        uploadedChunks.clear();

        // If uploading to host library, ensure no representatives are sent
        if (libraryType === 'host' && selectedRepresentatives.length) {
            selectedRepresentatives = [];
        }

        try {
            const filename = await uploadFile(selectedFile!);
            const formData = new FormData(document.getElementById('uploadForm') as HTMLFormElement);
            
            // Create the proper form data structure matching server expectations
            const finalFormData = new FormData();
            finalFormData.append('title', formData.get('title') as string);
            finalFormData.append('description', formData.get('description') as string);
            
            // Store as document type but add file_subtype for Word documents
            if (selectedType === 'word') {
                finalFormData.append('type', 'document');
                finalFormData.append('file_subtype', 'word');
            } else {
                finalFormData.append('type', selectedType);
            }
            
            // Don't send the entire file, just the reference to the chunked file
            finalFormData.append('file_ref', filename); // Send the chunked file reference
            finalFormData.append('library_type', libraryType);
            
            if (libraryType !== 'host' && selectedRepresentatives.length > 0) {
                finalFormData.append('representatives', selectedRepresentatives.join(','));
            }
            
            if (thumbnailFile) {
                finalFormData.append('thumbnail', thumbnailFile);
            }

            // Explicitly add the active status as a string "true" or "false"
            finalFormData.append('active', isContentActive.toString());

            const response = await fetch('/api/upload/content', {
                method: 'POST',
                body: finalFormData
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Successfully uploaded content');
                await invalidateAll();
                goto('/content-library');
            } else {
                toast.error(result.message || 'Error creating content entry');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Error uploading content');
        } finally {
            isUploading = false;
        }
    }

    onDestroy(() => {
        if (thumbnailPreviewUrl) {
            URL.revokeObjectURL(thumbnailPreviewUrl);
        }
        if (filePreviewUrl) {
            URL.revokeObjectURL(filePreviewUrl);
        }
    });

    $: {
        // Update file preview when file changes
        if (selectedFile) {
            if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
            filePreviewUrl = getFilePreview();
        }
    }
</script>

<div class="flex h-screen bg-[#eceef3]">
    <Sidenav activePage="content-library" />
    
    <div class="flex-1 p-4 sm:p-6 mt-[6rem]">
        <div class=" mx-auto space-y-6">
            <!-- Header -->
            <div class="bg-white rounded-[8px] min-h-[69px] flex flex-col gap-3 py-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0">
                <h1 class="text-lg font-bold leading-[118%] text-[#808080] sm:text-[24px] min-w-0">Upload Content</h1>
                <Button 
                    type="submit" 
                    form="uploadForm"
                    disabled={isUploading} 
                    class="w-full sm:w-[85px] h-[39px] bg-[#577AB7] rounded-[3px] font-semibold text-[16px] text-white flex items-center justify-center flex-shrink-0"
                >
                    {#if isUploading}
                        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                        {uploadProgress.toFixed(2)}%
                    {:else}
                        Upload
                    {/if}
                </Button>
            </div>

            <!-- Main Content -->
            <div class="bg-white rounded-[8px] p-8">
                <form id="uploadForm" on:submit={handleSubmit} use:form enctype="multipart/form-data" class="space-y-8"
                      novalidate>
                    <!-- Title -->
                    <div class="space-y-2">
                        <Label for="title" class="block  text-[14px] font-medium text-[#737373]">Title</Label>
                        <input 
                            type="text" 
                            id="title" 
                            name="title" 
                            required 
                            use:validators={[required]}
                            on:blur={() => touchedFields.title = true}
                            class="w-full h-[38px] border border-[#9E9E9E] rounded-[5px] px-3 py-2 {(touchedFields.title || formSubmitAttempted) && $form.title && $form.title.errors?.required ? 'border-red-500' : ''}" 
                        />
                        {#if (touchedFields.title || formSubmitAttempted) && $form.title && $form.title.errors?.required}
                            <div class="text-red-500 text-sm">Title is required</div>
                        {/if}
                    </div>

                    <!-- Type of Content -->
                    <div class="space-y-2">
                        <Label class="block  text-[14px] font-medium text-[#737373]">Type of Content</Label>
                        <div class="flex gap-8 items-center">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <div class="relative w-[15px] h-[15px]">
                                    <input 
                                        type="radio" 
                                        name="content_type" 
                                        value="image"
                                        checked={selectedType === 'image'}
                                        on:change={() => handleTypeChange('image')}
                                        class="absolute inset-0 opacity-0 z-10 cursor-pointer"
                                        
                                    />
                                    <div class="w-[15px] h-[15px] rounded-full bg-[#D9D9D9] {selectedType === 'image' ? 'ring-2 ring-[#577AB7]' : ''}"></div>
                                </div>
                                <span class=" text-[14px] text-[#737373]">Image</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <div class="relative w-[15px] h-[15px]">
                                    <input 
                                        type="radio" 
                                        name="content_type" 
                                        value="video"
                                        checked={selectedType === 'video'}
                                        on:change={() => handleTypeChange('video')}
                                        class="absolute inset-0 opacity-0 z-10 cursor-pointer"
                                    />
                                    <div class="w-[15px] h-[15px] rounded-full bg-[#D9D9D9] {selectedType === 'video' ? 'ring-2 ring-[#577AB7]' : ''}"></div>
                                </div>
                                <span class=" text-[14px] text-[#737373]">Video</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <div class="relative w-[15px] h-[15px]">
                                    <input 
                                        type="radio" 
                                        name="content_type" 
                                        value="pdf"
                                        checked={selectedType === 'pdf'}
                                        on:change={() => handleTypeChange('pdf')}
                                        class="absolute inset-0 opacity-0 z-10 cursor-pointer"
                                    />
                                    <div class="w-[15px] h-[15px] rounded-full bg-[#D9D9D9] {selectedType === 'pdf' ? 'ring-2 ring-[#577AB7]' : ''}"></div>
                                </div>
                                <span class=" text-[14px] text-[#737373]">PDF</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <div class="relative w-[15px] h-[15px]">
                                    <input 
                                        type="radio" 
                                        name="content_type" 
                                        value="word"
                                        checked={selectedType === 'word'}
                                        on:change={() => handleTypeChange('word')}
                                        class="absolute inset-0 opacity-0 z-10 cursor-pointer"
                                    />
                                    <div class="w-[15px] h-[15px] rounded-full bg-[#D9D9D9] {selectedType === 'word' ? 'ring-2 ring-[#577AB7]' : ''}"></div>
                                </div>
                                <span class="text-[14px] text-[#737373]">Word</span>
                            </label>
                        </div>
                    </div>

                    <!-- Brief Description -->
                    <div class="space-y-2">
                        <Label for="description" class="block  text-[14px] font-medium text-[#737373]">Brief Description</Label>
                        <div class="relative">
                            <textarea 
                                id="description" 
                                name="description" 
                                use:validators={[required]}
                                on:blur={() => touchedFields.description = true}
                                class="w-full h-[145px] border border-[#9E9E9E] rounded-[5px] resize-none px-3 py-2 {(touchedFields.description || formSubmitAttempted) && $form.description && $form.description.errors?.required ? 'border-red-500' : ''}" 
                            ></textarea>
                        </div>
                        {#if (touchedFields.description || formSubmitAttempted) && $form.description && $form.description.errors?.required}
                            <div class="text-red-500 text-sm">Description is required</div>
                        {/if}
                    </div>

                    <!-- File Uploads -->
                    <div class="grid grid-cols-2 gap-5">
                        <div class="space-y-2">
                            <Label for="file" class="block  text-[14px] font-medium text-[#737373]">Upload file</Label>
                            <div class="relative h-[38px]">
                                <Input 
                                    type="file" 
                                    id="file" 
                                    name="file" 
                                    accept={allowedFileTypes[selectedType]} 
                                    on:change={(e) => { handleFileChange(e); }}
                                    required 
                                    class="absolute inset-0 opacity-0 z-10 cursor-pointer"
                                />
                                <div class="w-full h-full border border-[#9E9E9E] rounded-[5px] flex items-center px-3 bg-white {(touchedFields.file || formSubmitAttempted) && !selectedFile ? 'border-red-500' : ''}">
                                    <span class="text-[#737373]">{selectedFile?.name || 'No file chosen'}</span>
                                </div>
                            </div>
                            {#if (touchedFields.file || formSubmitAttempted) && !selectedFile}
                                <div class="text-red-500 text-sm">File is required</div>
                            {/if}
                        </div>

                        <div class="space-y-2">
                            <Label for="thumbnail" class="block  text-[14px] font-medium text-[#737373]">Content Thumbnail</Label>
                            <div class="relative h-[38px]">
                                <input 
                                    type="file" 
                                    id="thumbnail" 
                                    name="thumbnail" 
                                    accept="image/*"
                                    on:change={(e) => { handleThumbnailChange(e); }}
                                    required
                                    class="absolute inset-0 opacity-0 z-10 cursor-pointer"
                                />
                                <div class="w-full h-full border border-[#9E9E9E] rounded-[5px] flex items-center px-3 bg-white {(touchedFields.thumbnail || formSubmitAttempted) && !thumbnailFile ? 'border-red-500' : ''}">
                                    <span class="text-[#737373]">{thumbnailFile?.name || 'No file chosen'}</span>
                                </div>
                            </div>
                            {#if (touchedFields.thumbnail || formSubmitAttempted) && !thumbnailFile}
                                <div class="text-red-500 text-sm">Thumbnail is required</div>
                            {/if}
                        </div>
                    </div>

                    <!-- Previews Section -->
                    <div class="grid grid-cols-2 gap-5">
                        <!-- Thumbnail Preview -->
                        {#if thumbnailPreviewUrl}
                            <div class="relative aspect-video">
                                <img 
                                    src={thumbnailPreviewUrl} 
                                    alt="Thumbnail preview" 
                                    class="w-full h-full object-cover rounded-[5px]"
                                />
                                <button
                                    type="button"
                                    class="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    on:click={resetThumbnail}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        {:else}
                            <div class="relative aspect-video bg-gray-100 rounded-[5px] flex items-center justify-center">
                                <span class="text-gray-400">Thumbnail preview</span>
                            </div>
                        {/if}

                        <!-- File Preview -->
                        {#if filePreviewUrl && selectedType === 'video'}
                            <div class="relative aspect-video">
                                <video 
                                    src={filePreviewUrl} 
                                    controls
                                    class="w-full h-full object-contain rounded-[5px]"
                                ></video>
                            </div>
                        {:else if selectedFile}
                            <div class="relative aspect-video bg-gray-100 rounded-[5px] flex flex-col items-center justify-center">
                                <div class="text-2xl mb-2">
                                    {#if selectedType === 'pdf'}
                                        📄
                                    {:else if selectedType === 'document' || selectedType === 'word'}
                                        📝
                                    {:else}
                                        📁
                                    {/if}
                                </div>
                                <span class="text-gray-600">{selectedFile.name}</span>
                                <span class="text-xs text-gray-400 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                        {:else}
                            <div class="relative aspect-video bg-gray-100 rounded-[5px] flex items-center justify-center">
                                <span class="text-gray-400">File preview</span>
                            </div>
                        {/if}
                    </div>

                    <!-- Selected Representatives Section -->
                    {#if selectedRepresentatives.length > 0}
                        <div class="space-y-2">
                            <Label class="block text-[14px] font-medium text-[#737373]">Selected Representatives</Label>
                            <div class="flex flex-wrap gap-2">
                                {#each selectedRepresentatives as repId}
                                    <div class="inline-flex items-center gap-2 bg-[#E0E8F5] px-3 py-1 rounded-full">
                                        <span class="text-[#577AB7]">{getRepresentativeName(repId)}</span>
                                        <button 
                                            type="button"
                                            class="text-[#577AB7] hover:text-[#3a5a9e]"
                                            on:click={() => handleRepresentativeChange(repId)}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    <!-- After Library Type Selection -->
                    <div class="space-y-2">
                        <Label class="block text-[14px] font-medium text-[#737373]">Content Status</Label>
                        <div class="flex items-center gap-3">
                            <Switch.Root 
                                checked={isContentActive} 
                                onCheckedChange={(checked) => isContentActive = checked}
                            >
                                <Switch.Thumb />
                            </Switch.Root>
                            <span class="text-[14px] text-[#737373]">{isContentActive ? 'Active' : 'Inactive'}</span>
                        </div>
                        
                        <input type="hidden" name="active" value={isContentActive ? 'true' : 'false'} />
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<LibrarySelectDialog 
    bind:open={showLibraryDialog} 
    onSelect={handleLibrarySelect} 
/>