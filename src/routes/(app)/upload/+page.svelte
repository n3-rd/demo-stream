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

    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

    const contentTypes = [
        { value: 'video', label: 'Video' },
        { value: 'pdf', label: 'PDF' },
        { value: 'document', label: 'Document' }
    ];

    const libraryTypes = [
        { value: 'host', label: 'Host Library' },
        { value: 'representative', label: 'Representative Library' },
        { value: 'both', label: 'Both' }
    ];

    const allowedFileTypes = {
        video: 'video/*',
        pdf: 'application/pdf',
        document: '.doc,.docx,.xls,.xlsx'
    };

    function handleFileChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            selectedFile = input.files[0];
        }
    }

    function handleThumbnailChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            thumbnailFile = input.files[0];
            thumbnailPreviewUrl = URL.createObjectURL(input.files[0]);
        }
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

    function handleRepresentativeChange(value: string) {
        const repId = value;
        if (selectedRepresentatives.includes(repId)) {
            selectedRepresentatives = selectedRepresentatives.filter(id => id !== repId);
        } else {
            selectedRepresentatives = [...selectedRepresentatives, repId];
        }
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
        
        if (!$form.valid) {
            toast.error('Please fix the validation errors');
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

    async function handleLibrarySelect(libraryType: string) {
        showLibraryDialog = false;
        isUploading = true;
        uploadProgress = 0;
        uploadedChunks.clear();

        try {
            const filename = await uploadFile(selectedFile!);
            const formData = new FormData(document.getElementById('uploadForm') as HTMLFormElement);
            
            // Create the proper form data structure matching server expectations
            const finalFormData = new FormData();
            finalFormData.append('title', formData.get('title') as string);
            finalFormData.append('description', formData.get('description') as string);
            finalFormData.append('type', selectedType);
            finalFormData.append('file', selectedFile!); // Send the actual file
            finalFormData.append('file_ref', filename); // Send the chunked file reference
            finalFormData.append('library_type', libraryType);
            
            if (selectedRepresentatives.length > 0) {
                finalFormData.append('representatives', selectedRepresentatives.join(','));
            }
            
            if (thumbnailFile) {
                finalFormData.append('thumbnail', thumbnailFile);
            }

            const response = await fetch('?/uploadContent', {
                method: 'POST',
                body: finalFormData
            });

            const result = await response.json();

            if (result.type === 'success') {
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
    });
</script>

<div class="flex h-screen bg-[#F5F5F5]">
    <Sidenav activePage="content-library" />
    
    <div class="flex-1 overflow-auto p-6">
        <div class="max-w-[1115px] mx-auto space-y-6">
            <!-- Header -->
            <div class="bg-white rounded-[8px] h-[69px] flex items-center justify-between px-6">
                <h1 class=" text-[24px] font-bold leading-[118%] text-[#808080]">Upload Content</h1>
                <Button 
                    type="submit" 
                    form="uploadForm"
                    disabled={isUploading || !selectedFile || !$form.valid} 
                    class="w-[85px] h-[39px] bg-[#577AB7] rounded-[3px] font-semibold text-[16px] text-white flex items-center justify-center"
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
                <form id="uploadForm" on:submit={handleSubmit} use:form enctype="multipart/form-data" class="space-y-8">
                    <!-- Title -->
                    <div class="space-y-2">
                        <Label for="title" class="block  text-[14px] font-medium text-[#737373]">Title</Label>
                        <input 
                            type="text" 
                            id="title" 
                            name="title" 
                            required 
                            use:validators={[required]}
                            class="w-full h-[38px] border border-[#9E9E9E] rounded-[5px] px-3 py-2 {$form.title && $form.title.errors?.required ? 'border-red-500' : ''}" 
                        />
                        <HintGroup for="title">
                            <Hint on="required" class="text-red-500 text-sm">Title is required</Hint>
                        </HintGroup>
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
                                <span class=" text-[14px] text-[#737373]">Word</span>
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
                                class="w-full h-[145px] border border-[#9E9E9E] rounded-[5px] resize-none px-3 py-2 {$form.description && $form.description.errors?.required ? 'border-red-500' : ''}" 
                            ></textarea>
                            <span class="absolute right-4 top-4  text-[18px] font-semibold text-[#737373]">Add Image</span>
                        </div>
                        <HintGroup for="description">
                            <Hint on="required" class="text-red-500 text-sm">Description is required</Hint>
                        </HintGroup>
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
                                    on:change={handleFileChange}
                                    required 
                                    class="absolute inset-0 opacity-0 z-10 cursor-pointer"
                                />
                                <div class="w-full h-full border border-[#9E9E9E] rounded-[5px] flex items-center px-3 bg-white {!selectedFile ? 'border-red-500' : ''}">
                                    <span class="text-[#737373]">{selectedFile?.name || 'No file chosen'}</span>
                                </div>
                            </div>
                            {#if !selectedFile}
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
                                    on:change={handleThumbnailChange}
                                    required
                                    class="absolute inset-0 opacity-0 z-10 cursor-pointer"
                                />
                                <div class="w-full h-full border border-[#9E9E9E] rounded-[5px] flex items-center px-3 bg-white {!thumbnailFile ? 'border-red-500' : ''}">
                                    <span class="text-[#737373]">{thumbnailFile?.name || 'No file chosen'}</span>
                                </div>
                            </div>
                            {#if !thumbnailFile}
                                <div class="text-red-500 text-sm">Thumbnail is required</div>
                            {/if}
                        </div>
                    </div>

                    <!-- Thumbnail Preview -->
                    {#if thumbnailPreviewUrl}
                        <div class="relative w-1/2 aspect-video">
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
                    {/if}
                </form>
            </div>
        </div>
    </div>
</div>

<LibrarySelectDialog 
    bind:open={showLibraryDialog} 
    onSelect={handleLibrarySelect} 
/>