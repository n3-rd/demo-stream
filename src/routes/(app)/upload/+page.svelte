<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Textarea } from "$lib/components/ui/textarea";
    import * as Select from "$lib/components/ui/select";
    import { toast } from "svelte-sonner";
    import { goto } from "$app/navigation";
    import { enhance } from "$app/forms";
    import { Loader2 } from "lucide-svelte";
    import { onDestroy } from "svelte";

    export let data;
    const { user, representatives } = data;

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
        if (!selectedFile) {
            toast.error('Please select a file');
            return;
        }

        isUploading = true;
        uploadProgress = 0;
        uploadedChunks.clear();

        try {
            const filename = await uploadFile(selectedFile);

            const formData = new FormData(event.target as HTMLFormElement);
            formData.append('file_ref', filename);

            if (thumbnailFile) {
                formData.append('thumbnail', thumbnailFile);
            }

            const response = await fetch('?/uploadContent', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.status === 200) {
                toast.success('Successfully uploaded content');
                goto('/content-library');
            } else {
                toast.error('Error creating content entry');
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

<div class="container mx-auto p-6 max-w-2xl">
    <div class="bg-white rounded-lg shadow-lg p-6">
        <h1 class="text-2xl font-bold mb-6">Upload Content</h1>

        <form
            on:submit={handleSubmit}
            enctype="multipart/form-data"
            class="space-y-6"
        >
            <!-- Content Type -->
            <div class="space-y-2">
                <Label for="type">Content Type</Label>
                <Select.Root>
                    <Select.Trigger class="w-full">
                        <Select.Value>{contentTypes.find(t => t.value === selectedType)?.label || "Select content type"}</Select.Value>
                    </Select.Trigger>
                    <Select.Content>
                        {#each contentTypes as type}
                            <Select.Item 
                                value={type.value}
                                on:click={() => handleTypeChange(type.value)}
                            >
                                {type.label}
                            </Select.Item>
                        {/each}
                    </Select.Content>
                    <Select.Input name="type" value={selectedType} />
                </Select.Root>
            </div>

            <!-- Library Type -->
            <div class="space-y-2">
                <Label>Library Type</Label>
                <Select.Root on:select={handleLibraryTypeSelect}>
                    <Select.Trigger class="w-full">
                        <Select.Value placeholder="Select library type" />
                    </Select.Trigger>
                    <Select.Content>
                        {#each libraryTypes as type}
                            <Select.Item 
                                value={type.value}
                                on:click={() => selectedLibraryType = type.value}
                            >
                                {type.label}
                            </Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
                <input type="hidden" name="library_type" value={selectedLibraryType} />
            </div>

            <!-- Title -->
            <div class="space-y-2">
                <Label for="title">Title</Label>
                <Input type="text" id="title" name="title" required />
            </div>

            <!-- Description -->
            <div class="space-y-2">
                <Label for="description">Description</Label>
                <Textarea id="description" name="description" />
            </div>

            <!-- File Upload -->
            <div class="space-y-2">
                <Label for="file">File</Label>
                <Input 
                    type="file" 
                    id="file" 
                    name="file" 
                    accept={allowedFileTypes[selectedType]} 
                    on:change={handleFileChange}
                    required 
                />
                <p class="text-sm text-gray-500">
                    {#if selectedType === 'video'}
                        Supported formats: MP4, WebM
                    {:else if selectedType === 'pdf'}
                        Supported format: PDF
                    {:else}
                        Supported formats: DOC, DOCX, XLS, XLSX
                    {/if}
                </p>
            </div>

        
                <div class="space-y-2">
                    <Label for="thumbnail">Thumbnail (optional)</Label>
                    <div class="space-y-4">
                        {#if thumbnailPreviewUrl}
                            <div class="relative aspect-video w-full max-w-md mx-auto">
                                <img 
                                    src={thumbnailPreviewUrl} 
                                    alt="Thumbnail preview" 
                                    class="rounded-lg object-cover w-full h-full"
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
                        <Input 
                            type="file" 
                            id="thumbnail" 
                            name="thumbnail" 
                            accept="image/*"
                            on:change={handleThumbnailChange}
                        />
                        <p class="text-sm text-gray-500">Supported formats: JPG, PNG, WebP</p>
                    </div>
                </div>
            

            <!-- Share with Representatives -->
            <div class="space-y-2">
                <Label>Share with Representatives</Label>
                <Select.Root multiple>
                    <Select.Trigger class="w-full">
                        <Select.Value placeholder="Select representatives" />
                    </Select.Trigger>
                    <Select.Content>
                        {#each representatives as rep}
                            <Select.Item 
                                value={rep.id}
                                on:click={() => handleRepresentativeChange(rep.id)}
                            >
                                {rep.name}
                            </Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
                <input type="hidden" name="shared_with" value={selectedRepresentatives.join(',')} />
            </div>

            <div class="flex justify-end space-x-4">
                <Button
                    type="button"
                    variant="outline"
                    on:click={() => goto('/content-library')}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={isUploading || !selectedFile || !selectedLibraryType}>
                    {#if isUploading}
                        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                        Uploading... {uploadProgress.toFixed(2)}%
                    {:else}
                        Upload
                    {/if}
                </Button>
            </div>
        </form>
    </div>
</div>