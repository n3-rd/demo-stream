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
    import { useForm, HintGroup, Hint, validators, required } from 'svelte-use-form';
    import * as Switch from "$lib/components/ui/switch";

    export let data;
    const { user, representatives, content } = data;
    const form = useForm();

    let loading = false;
    let selectedType = content.type;
    let selectedLibraryType: string = Array.isArray(content.library_type) ? content.library_type[0] : content.library_type;
    let selectedFile: File | null = null;
    let thumbnailFile: File | null = null;
    let isUploading = false;
    let uploadProgress = 0;
    let uploadedChunks: Set<number> = new Set();
    let thumbnailPreviewUrl: string | null = content.thumbnail ? `${PUBLIC_POCKETBASE_INSTANCE}api/files/content_library/${content.id}/${content.thumbnail}` : null;
    let isContentActive = content.active === undefined ? true : !!content.active;

    const CHUNK_SIZE = 512 * 1024; // 500KB chunks (reduced from 1MB for Vercel)

    const contentTypes = [
        { value: 'video', label: 'Video' },
        { value: 'pdf', label: 'PDF' },
        { value: 'document', label: 'Document' },
        { value: 'image', label: 'Image' }
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
        image: 'image/*'
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
        
        if (!$form.valid) {
            toast.error('Please fix the validation errors');
            return;
        }
        
        if (!thumbnailFile && !content.thumbnail) {
            toast.error('Please select a thumbnail');
            return;
        }
        
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
            
            // Explicitly add the active status as a string "true" or "false"
            finalFormData.append('active', isContentActive.toString());
            
            if (selectedFile) {
                const filename = await uploadFile(selectedFile);
                // Don't send the file, just the reference to the chunked file
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

<div class="flex bg-[#eceef3]">
    <Sidenav activePage="content-library" />
    
    <div class="flex-1 overflow-auto p-6 mt-[6rem]">
        <div class=" mx-auto space-y-6">
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
                        disabled={isUploading || !$form.valid} 
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
                <form id="editForm" on:submit={handleSubmit} use:form enctype="multipart/form-data" class="space-y-8">
                    <!-- Title and id -->
                    <div class="space-y-2 flex justify-between items-center gap-24">
                        <div class="title w-1/2">
                            <Label for="title" class="block  text-[14px] font-medium text-[#737373]">Title</Label>
                            <input 
                                type="text" 
                                id="title" 
                                name="title" 
                                required 
                                value={content.title}
                                use:validators={[required]}
                                class="w-full h-[38px] border border-[#9E9E9E] rounded-[5px] px-3 py-2 {$form.title && $form.title.errors?.required ? 'border-red-500' : ''}" 
                            />
                            <HintGroup for="title">
                                <Hint on="required" class="text-red-500 text-sm">Title is required</Hint>
                            </HintGroup>
                        </div>
                        <div class="id w-1/2 pb-[0.5rem]">
                            <Label for="id" class="block  text-[14px] font-medium text-[#737373]">Assigned ID</Label>
                            <input 
                                type="text" 
                                id="id" 
                                name="id" 
                                required 
                                value={content.id}
                               disabled
                                class="w-full h-[38px] border border-[#9E9E9E] rounded-[5px] px-3 py-2"
                            />
                        </div>
                    </div>

                    <!-- Type of Content -->
                    <div class="space-y-2 flex justify-between items-center gap-24">
                        <div class="type w-1/2">
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
                        <div class="status w-1/2">
                            <!-- Content Status -->
              
                     <Label class="block text-[14px] font-medium text-[#737373]">Content Status</Label>
                     <div class="flex items-center gap-3">
                         <Switch.Root 
                             checked={isContentActive} 
                             onCheckedChange={(checked) => isContentActive = checked}
                         >
                             <Switch.Thumb class="bg-[#01eb71]" />
                         </Switch.Root>
                         <span class="text-[14px] text-[#737373]">{isContentActive ? 'Active' : 'Inactive'}</span>
                     </div>
                     
                     <!-- Hidden input to ensure the value is properly submitted -->
                     <input type="hidden" name="active" value={isContentActive ? 'true' : 'false'} />
               
                         </div>
                    </div>

                    <!-- Description -->
                    <div class="space-y-2">
                        <Label for="description" class="block  text-[14px] font-medium text-[#737373]">Brief Description</Label>
                        <textarea 
                            id="description" 
                            name="description" 
                            use:validators={[required]}
                            class="w-full h-[145px] border border-[#9E9E9E] rounded-[5px] resize-none px-3 py-2 {$form.description && $form.description.errors?.required ? 'border-red-500' : ''}"
                        >{content.description}</textarea>
                        <HintGroup for="description">
                            <Hint on="required" class="text-red-500 text-sm">Description is required</Hint>
                        </HintGroup>
                    </div>

<div class="flex justify-between gap-24">

<div class="w-1/2 flex flex-col gap-3">
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
                                <span class="text-[#737373]">{selectedFile?.name.slice(0, 40) || content.file.slice(0, 40) || 'No file chosen'}</span>
                            </div>
                        </div>
                    </div>

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
                                            required
                                        />
                                        <div class="w-[15px] h-[15px] rounded-full bg-[#D9D9D9] {selectedLibraryType === type.value ? 'ring-2 ring-[#577AB7]' : ''}"></div>
                                    </div>
                                    <span class=" text-[14px] text-[#737373]">{type.label}</span>
                                </label>
                            {/each}
                        </div>
                    </div>

                 </div>

                 <div class="w-1/2 flex flex-col gap-3">
                                      <!-- Thumbnail -->
                    <div class="space-y-2">
                        <Label for="thumbnail" class="block  text-[14px] font-medium text-[#737373]">Content Thumbnail</Label>
                        <div class="relative h-[38px]">
                            <input 
                                type="file" 
                                id="thumbnail" 
                                name="thumbnail" 
                                accept="image/*"
                                on:change={handleThumbnailChange}
                                required={!content.thumbnail}
                                class="absolute inset-0 opacity-0 z-10 cursor-pointer"
                            />
                            <div class="w-full h-full border border-[#9E9E9E] rounded-[5px] flex items-center px-3 bg-white {!thumbnailFile && !content.thumbnail ? 'border-red-500' : ''}">
                                <span class="text-[#737373]">{thumbnailFile?.name || (content.thumbnail ? 'Current thumbnail' : 'No file chosen')}</span>
                            </div>
                        </div>
                        {#if !thumbnailFile && !content.thumbnail}
                            <div class="text-red-500 text-sm">Thumbnail is required</div>
                        {/if}
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
                 </div>
                </form>
            </div>
        </div>
    </div>
</div> 