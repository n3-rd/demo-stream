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
    import { onMount } from "svelte";
    import Sidenav from '$lib/components/layout/sidenav.svelte';
    import { PUBLIC_POCKETBASE_INSTANCE } from "$env/static/public";

    export let data;
    const { user, representatives, content } = data;

    let loading = false;
    let selectedType = content.type;
    let selectedLibraryType: string = Array.isArray(content.library_type) ? content.library_type[0] : content.library_type;
    let selectedFile: File | null = null;
    let thumbnailFile: File | null = null;
    let isUploading = false;
    let uploadProgress = 0;
    let uploadedChunks: Set<number> = new Set();
    let thumbnailPreviewUrl: string | null = content.thumbnail ? `${PUBLIC_POCKETBASE_INSTANCE}api/files/content_library/${content.id}/${content.thumbnail}` : null;

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
        isUploading = true;
        uploadProgress = 0;
        uploadedChunks.clear();

        try {
            const formData = new FormData(document.getElementById('editForm') as HTMLFormElement);
            
            // Create the proper form data structure matching server expectations
            const finalFormData = new FormData();
            finalFormData.append('title', formData.get('title') as string);
            finalFormData.append('description', formData.get('description') as string);
            finalFormData.append('type', selectedType);
            finalFormData.append('library_type', selectedLibraryType);
            
            if (selectedFile) {
                const filename = await uploadFile(selectedFile);
                finalFormData.append('file', selectedFile);
                finalFormData.append('file_ref', filename);
            }
            
            if (thumbnailFile) {
                finalFormData.append('thumbnail', thumbnailFile);
            }

            const response = await fetch('?/updateContent', {
                method: 'POST',
                body: finalFormData
            });

            const result = await response.json();

            if (result.type === 'success') {
                toast.success('Successfully updated content');
                await invalidateAll();
                goto('/content-library');
            } else {
                toast.error(result.message || 'Error updating content entry');
            }
        } catch (error) {
            console.error('Update error:', error);
            toast.error('Error updating content');
        } finally {
            isUploading = false;
        }
    }

    async function handleDelete() {
        try {
            const response = await fetch('?/deleteContent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams()
            });

            const result = await response.json();

            if (result.type === 'success') {
                toast.success('Successfully deleted content');
                await invalidateAll();
                goto('/content-library');
            } else {
                toast.error(result.message || 'Error deleting content');
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Error deleting content');
        }
    }
</script>

<div class="flex h-screen bg-[#F5F5F5]">
    <Sidenav activePage="content-library" />
    
    <div class="flex-1 overflow-auto p-6">
        <div class="max-w-[1115px] mx-auto space-y-6">
            <!-- Header -->
            <div class="bg-white rounded-[8px] h-[69px] flex items-center justify-between px-6">
                <h1 class=" text-[24px] font-bold leading-[118%] text-[#808080]">Edit Content</h1>
                <div class="flex gap-4">
                    <Button 
                        type="button"
                        variant="destructive"
                        on:click={handleDelete}
                        class="h-[39px] bg-red-500 hover:bg-red-600 rounded-[3px] font-semibold text-[16px] text-white flex items-center justify-center"
                    >
                        Delete
                    </Button>
                    <Button 
                        type="submit" 
                        form="editForm"
                        disabled={isUploading} 
                        class="h-[39px] bg-[#577AB7] rounded-[3px] font-semibold text-[16px] text-white flex items-center justify-center"
                    >
                        {#if isUploading}
                            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                            {uploadProgress.toFixed(2)}%
                        {:else}
                            Update
                        {/if}
                    </Button>
                </div>
            </div>

            <!-- Main Content -->
            <div class="bg-white rounded-[8px] p-8">
                <form id="editForm" on:submit={handleSubmit} enctype="multipart/form-data" class="space-y-8">
                    <!-- Title -->
                    <div class="space-y-2">
                        <Label for="title" class="block  text-[14px] font-medium text-[#737373]">Title</Label>
                        <Input 
                            type="text" 
                            id="title" 
                            name="title" 
                            required 
                            value={content.title}
                            class="w-full h-[38px] border-[#9E9E9E] rounded-[5px]" 
                        />
                    </div>

                    <!-- Type of Content -->
                    <div class="space-y-2">
                        <Label class="block  text-[14px] font-medium text-[#737373]">Type of Content</Label>
                        <div class="flex gap-8 items-center">
                            {#each contentTypes as type}
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <div class="relative w-[15px] h-[15px]">
                                        <input 
                                            type="radio" 
                                            name="content_type" 
                                            value={type.value}
                                            checked={selectedType === type.value}
                                            on:change={() => handleTypeChange(type.value)}
                                            class="absolute inset-0 opacity-0 z-10 cursor-pointer"
                                        />
                                        <div class="w-[15px] h-[15px] rounded-full bg-[#D9D9D9] {selectedType === type.value ? 'ring-2 ring-[#577AB7]' : ''}"></div>
                                    </div>
                                    <span class=" text-[14px] text-[#737373]">{type.label}</span>
                                </label>
                            {/each}
                        </div>
                    </div>

                    <!-- Description -->
                    <div class="space-y-2">
                        <Label for="description" class="block  text-[14px] font-medium text-[#737373]">Description</Label>
                        <Textarea 
                            id="description" 
                            name="description" 
                            value={content.description}
                            class="w-full h-[145px] border-[#9E9E9E] rounded-[5px] resize-none" 
                        />
                    </div>

                    <!-- File Upload -->
                    <div class="space-y-2">
                        <Label for="file" class="block  text-[14px] font-medium text-[#737373]">Replace File (Optional)</Label>
                        <div class="relative h-[38px]">
                            <Input 
                                type="file" 
                                id="file" 
                                name="file" 
                                accept={allowedFileTypes[selectedType]}
                                on:change={handleFileChange}
                                class="absolute inset-0 opacity-0 z-10 cursor-pointer"
                            />
                            <div class="w-full h-full border border-[#9E9E9E] rounded-[5px] flex items-center px-3 bg-white">
                                <span class="text-[#737373]">{selectedFile?.name || content.file || 'No file chosen'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Thumbnail -->
                    <div class="space-y-2">
                        <Label for="thumbnail" class="block  text-[14px] font-medium text-[#737373]">Content Thumbnail</Label>
                        <div class="relative h-[38px]">
                            <Input 
                                type="file" 
                                id="thumbnail" 
                                name="thumbnail" 
                                accept="image/*"
                                on:change={handleThumbnailChange}
                                class="absolute inset-0 opacity-0 z-10 cursor-pointer"
                            />
                            <div class="w-full h-full border border-[#9E9E9E] rounded-[5px] flex items-center px-3 bg-white">
                                <span class="text-[#737373]">{thumbnailFile?.name || (content.thumbnail ? 'Current thumbnail' : 'No file chosen')}</span>
                            </div>
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

                    <!-- Library Type Selection -->
                    <div class="space-y-2">
                        <Label class="block  text-[14px] font-medium text-[#737373]">Library Type</Label>
                        <div class="flex gap-8 items-center">
                            {#each libraryTypes as type}
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <div class="relative w-[15px] h-[15px]">
                                        <input 
                                            type="radio" 
                                            name="library_type" 
                                            value={type.value}
                                            checked={selectedLibraryType === type.value}
                                            on:change={() => selectedLibraryType = type.value}
                                            class="absolute inset-0 opacity-0 z-10 cursor-pointer"
                                        />
                                        <div class="w-[15px] h-[15px] rounded-full bg-[#D9D9D9] {selectedLibraryType === type.value ? 'ring-2 ring-[#577AB7]' : ''}"></div>
                                    </div>
                                    <span class=" text-[14px] text-[#737373]">{type.label}</span>
                                </label>
                            {/each}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div> 