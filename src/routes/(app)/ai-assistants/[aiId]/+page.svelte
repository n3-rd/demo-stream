<script lang="ts">
    import { run, preventDefault } from 'svelte/legacy';

    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import Sidenav from '$lib/components/layout/sidenav.svelte';
    import { enhance } from "$app/forms";
    import { toast } from "svelte-sonner";
    import { page } from '$app/stores';
    import { invalidateAll } from "$app/navigation";
    import { Upload, Link2, Archive, RotateCcw, Trash2, Loader2 } from 'lucide-svelte';
    import * as Tabs from "$lib/components/ui/tabs";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Select from "$lib/components/ui/select";

    let { data } = $props();
    const { aiAssistant, viewrooms, trainingFilesResolved = [] } = data;

    function formatFileType(type: string): string {
        if (!type) return '—';
        if (type.includes('pdf')) return 'PDF';
        if (type.includes('wordprocessingml') || type.includes('msword')) return 'DOCX';
        return type.split('/').pop()?.toUpperCase() ?? type;
    }

    function formatDate(date: string) {
        return new Date(date).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
    }

    let fileInput: HTMLInputElement = $state();
    let uploading = $state(false);
    let showConnectViewroomDialog = $state(false);
    /** Always string[] (viewroom IDs). Normalize from expanded PB relation or raw array. */
    let selectedViewrooms: string[] = $state(normalizeViewroomIds(aiAssistant.viewrooom_connections));


    function normalizeViewroomIds(conn: unknown): string[] {
        if (!conn || !Array.isArray(conn)) return [];
        return conn.map((c) => (typeof c === 'string' ? c : (c as { id: string })?.id)).filter(Boolean);
    }
    let showArchiveDialog = $state(false);

    function handleFileUpload() {
        if (fileInput?.files?.length) {
            (async () => {
                uploading = true;
                try {
                    for (const file of fileInput.files) {
                        await submitFileUpload(file);
                    }
                } finally {
                    uploading = false;
                }
            })();
        }
    }
    
    async function submitFileUpload(file: File) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`/api/ai-assistants/${aiAssistant.id}/upload-training-file`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                toast.success('File uploaded successfully');
                await invalidateAll();
            } else {
                toast.error(result.message || 'Failed to upload file');
            }
        } catch (err) {
            console.error('Error uploading file:', err);
            toast.error('Failed to upload file');
        } finally {
            await invalidateAll();
        }
    }
    run(() => {
        if (showConnectViewroomDialog) {
            selectedViewrooms = normalizeViewroomIds(aiAssistant.viewrooom_connections);
        }
    });
</script>

<div class="flex h-screen bg-[#eceef3]">
    <Sidenav activePage="ai-assistants" />
    
    <div class="flex-1 overflow-auto p-4 sm:p-6 mt-[6rem]">
        <div class="mx-auto space-y-6">
            <!-- Header with AI Assistant name and Add to Knowledge Base button -->
            <div class="bg-white rounded-[8px] min-h-[69px] flex flex-col gap-3 py-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0">
                <div class="flex flex-wrap items-center gap-2 gap-y-3 min-w-0">
                    <h1 class="text-lg font-bold leading-[118%] text-[#808080] font-['Poppins'] sm:text-[24px] break-words">{aiAssistant.name}</h1>
                    <span class={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${aiAssistant.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {aiAssistant.status ? 'Active' : 'Archived'}
                    </span>
                </div>
                <div class="flex flex-wrap gap-2 flex-shrink-0">
                    {#if aiAssistant.status}
                        <Button 
                            class="bg-gray-200 text-gray-700 h-[39px] rounded-[3px] font-semibold text-[16px] flex items-center gap-2"
                            on:click={() => showArchiveDialog = true}
                        >
                            <Archive class="h-4 w-4" />
                            Archive
                        </Button>
                    {:else}
                        <form
                            method="POST"
                            onsubmit={preventDefault(async (e) => {
                                const formData = new FormData(e.target);
                                
                                try {
                                    const response = await fetch(`/api/ai-assistants/${aiAssistant.id}`, {
                                        method: 'PUT',
                                        body: formData
                                    });
                                    
                                    const result = await response.json();
                                    
                                    if (result.success) {
                                        toast.success('AI assistant restored successfully');
                                    } else {
                                        toast.error(result.message || 'Failed to restore AI assistant');
                                    }
                                } catch (error) {
                                    console.error('Error restoring:', error);
                                    toast.error('Failed to restore AI assistant');
                                } finally {
                                    await invalidateAll();
                                }
                            })}
                        >
                            <input type="hidden" name="status" value="true" />
                            <Button 
                                type="submit"
                                class="bg-blue-200 text-blue-700 h-[39px] rounded-[3px] font-semibold text-[16px] flex items-center gap-2"
                            >
                                <RotateCcw class="h-4 w-4" />
                                Restore
                            </Button>
                        </form>
                    {/if}
                </div>
            </div>
            
            <!-- ViewRoom Connections -->
            <div class="space-y-2">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 class="text-lg font-semibold text-[#737373] ml-2 font-['Poppins']">ViewRoom Connections</h2>
                    <Button 
                        variant="outline" 
                        class="text-[#577AB7] border-[#577AB7] h-9"
                        on:click={() => showConnectViewroomDialog = true}
                    >
                        <Link2 class="h-4 w-4 mr-2" />
                        Manage Connections
                    </Button>
                </div>
                
                <div class="bg-white rounded-[8px] p-4">
                    {#if normalizeViewroomIds(aiAssistant.viewrooom_connections).length === 0}
                        <div class="text-gray-500 italic">No ViewRoom connections</div>
                    {:else}
                        <div class="flex flex-wrap gap-2">
                            {#each normalizeViewroomIds(aiAssistant.viewrooom_connections) as connectionId}
                                {#if data.viewroomMap && data.viewroomMap[connectionId]}
                                    <div class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                        {data.viewroomMap[connectionId]}
                                    </div>
                                {:else}
                                    <div class="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                                        Unknown ViewRoom
                                    </div>
                                {/if}
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
            
            <!-- Knowledge Base section -->
            <div class="space-y-2">
                <h2 class="text-lg font-semibold text-[#737373] ml-2 font-['Poppins']">Knowledge Base</h2>
                
                <!-- Knowledge Base Table -->
                <div class="rounded-[8px] overflow-hidden flex flex-col gap-4">
                    <!-- Table Header -->
                    <div class="bg-white h-[48px] flex items-center px-6 border-b border-gray-100">
                        <div class="grid grid-cols-4 w-full gap-4">
                            <div class="text-[16px] font-semibold text-[#737373] flex items-center font-['Poppins']">Create Date</div>
                            <div class="text-[16px] font-semibold text-[#737373] flex items-center font-['Poppins']">File Name</div>
                            <div class="text-[16px] font-semibold text-[#737373] flex items-center font-['Poppins']">File Type</div>
                            <div class="text-[16px] font-semibold text-[#737373] flex items-center font-['Poppins']">Actions</div>
                        </div>
                    </div>

                    <!-- Table Rows - Files from trainingFilesResolved -->
                    {#if trainingFilesResolved && trainingFilesResolved.length > 0}
                        {#each trainingFilesResolved as file, index}
                            <div class="bg-white h-[64px] flex items-center px-6 border-t border-gray-100">
                                <div class="grid grid-cols-4 w-full gap-4">
                                    <div class="text-[16px] font-normal text-[#808080] flex items-center font-['Poppins']">
                                        {formatDate(aiAssistant.updated)}
                                    </div>
                                    <div class="text-[16px] font-normal text-[#808080] flex items-center font-['Poppins']">
                                        {file.title}
                                    </div>
                                    <div class="text-[16px] font-normal text-[#808080] flex items-center font-['Poppins']">
                                        {formatFileType(file.type)}
                                    </div>
                                    <div class="flex items-center">
                                        <form
                                            method="POST"
                                            onsubmit={preventDefault(async (e) => {
                                                const formData = new FormData(e.target);
                                                
                                                try {
                                                    const response = await fetch(`/api/ai-assistants/${aiAssistant.id}/remove-file`, {
                                                        method: 'POST',
                                                        body: formData
                                                    });
                                                    
                                                    const result = await response.json();
                                                    
                                                    if (result.success) {
                                                        toast.success('File removed successfully');
                                                    } else {
                                                        toast.error(result.message || 'Failed to remove file');
                                                    }
                                                } catch (error) {
                                                    console.error('Error removing file:', error);
                                                    toast.error('Failed to remove file');
                                                } finally {
                                                    await invalidateAll();
                                                }
                                            })}
                                        >
                                            <input type="hidden" name="fileIndex" value={index} />
                                            <Button 
                                                type="submit"
                                                variant="ghost" 
                                                size="sm"
                                                class="text-red-500 hover:text-red-700"
                                            >
                                                Delete
                                            </Button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    {:else}
                        <div class="bg-white h-[100px] flex items-center justify-center text-gray-500 italic">
                            No training files uploaded
                        </div>
                    {/if}
                    
                    <!-- Upload new file -->
                    <div class="bg-white p-6">
                        <input 
                            type="file" 
                            class="hidden" 
                            bind:this={fileInput}
                            onchange={handleFileUpload}
                            multiple
                            accept=".pdf,.docx,.doc"
                            disabled={uploading}
                        />
                        <Button 
                            variant="outline" 
                            class="w-full h-16 border-dashed border-2"
                            on:click={() => !uploading && fileInput?.click()}
                            disabled={uploading}
                        >
                            <div class="flex flex-col items-center justify-center">
                                {#if uploading}
                                    <Loader2 class="h-5 w-5 mb-1 text-gray-500 animate-spin" />
                                    <div class="text-sm text-gray-600">Uploading...</div>
                                {:else}
                                    <Upload class="h-5 w-5 mb-1 text-gray-500" />
                                    <div class="text-sm text-gray-600">Upload Training Files (PDF, Word)</div>
                                {/if}
                            </div>
                        </Button>
                    </div>
                </div>
            </div>
            
            <!-- Engagement section -->
            <div class="space-y-2">
                <h2 class="text-lg font-semibold text-[#737373] ml-2 font-['Poppins']">Engagement</h2>
                
                <!-- Engagement Table -->
                <div class="rounded-[8px] overflow-hidden flex flex-col gap-4">
                    <!-- Table Header -->
                    <div class="bg-white h-[48px] flex items-center px-6 border-b border-gray-100">
                        <div class="grid grid-cols-3 w-full gap-4">
                            <div class="text-[16px] font-semibold text-[#737373] flex items-center font-['Poppins']">Date</div>
                            <div class="text-[16px] font-semibold text-[#737373] flex items-center font-['Poppins']">First Prompt</div>
                            <div class="text-[16px] font-semibold text-[#737373] flex items-center font-['Poppins']">Interactions</div>
                        </div>
                    </div>

                    <!-- Engagements Table Content -->
                    {#if aiAssistant.engagements}
                        {#each typeof aiAssistant.engagements === 'string' ? JSON.parse(aiAssistant.engagements) : aiAssistant.engagements as engagement}
                            <div class="bg-white py-4 px-6 border-t border-gray-100">
                                <div class="grid grid-cols-3 w-full gap-4">
                                    <div class="text-[16px] font-normal text-[#808080] flex items-start font-['Poppins']">
                                        {formatDate(engagement.date)}
                                    </div>
                                    <div class="text-[16px] font-normal text-[#808080] font-['Poppins'] bg-[#ECEFF3] p-4 rounded-[3px]">
                                        {engagement.first_prompt || 'No prompt recorded'}
                                    </div>
                                    <div class="text-[16px] font-normal text-[#808080] font-['Poppins']">
                                        {engagement.interaction_count || 0} interactions
                                    </div>
                                </div>
                            </div>
                        {/each}
                    {:else}
                        <div class="bg-white h-[100px] flex items-center justify-center text-gray-500 italic">
                            No engagements recorded
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Connect ViewRoom Dialog -->
<Dialog.Root bind:open={showConnectViewroomDialog}>
    <Dialog.Content class="max-w-md bg-white rounded-lg p-5 shadow-lg">
        <form
            method="POST"
            action="?/updateViewrooms"
            use:enhance={() => {
                return async ({ result, update }) => {
                    await update();
                    if (result.type === 'success') {
                        showConnectViewroomDialog = false;
                        toast.success('ViewRoom connections updated successfully');
                        invalidateAll(); // This is the key to refreshing the data
                    } else if (result.type === 'failure') {
                        toast.error(result.data?.message || 'Failed to update connections');
                    }
                };
            }}
        >
            <input type="hidden" name="id" value={aiAssistant.id} />
            {#each selectedViewrooms as viewroomId}
                <input type="hidden" name="viewrooom_connections" value={viewroomId} />
            {/each}
            <div class="space-y-4">
                <h2 class="text-lg font-semibold text-[#808080]">Manage ViewRoom Connections</h2>
                
                <div class="space-y-1">
                    <div class="text-sm text-[#808080]">ViewRoom Connections</div>
                    <Select.Root>
                        <Select.Trigger class="w-full">
                            <div class="w-full flex justify-between items-center">
                                {#if selectedViewrooms.length > 0}
                                    <span class="truncate flex items-center gap-1 flex-wrap">
                                        {#each selectedViewrooms.slice(0, 6) as viewroomId, i}
                                            <span class="inline-flex items-center gap-1">
                                                <Link2 class="h-3 w-3" />
                                                {data.viewroomMap && data.viewroomMap[viewroomId] ? data.viewroomMap[viewroomId] : viewroomId}
                                                {i < Math.min(selectedViewrooms.slice(0, 6).length - 1, 5) ? ', ' : ''}
                                            </span>
                                        {/each}
                                        {#if selectedViewrooms.length > 6}
                                            <span class="text-muted-foreground">...</span>
                                        {/if}
                                    </span>
                                {:else}
                                    <span class="text-muted-foreground">Select ViewRoom(s)...</span>
                                {/if}
                            </div>
                        </Select.Trigger>
                        <Select.Content class="w-full">
                            <div class="bg-[#ECEFF3] p-4 rounded-md max-h-[225px] overflow-y-auto">
                                {#each viewrooms || [] as viewroom}
                                    <div class="flex items-center justify-between gap-3 mb-3">
                                        <div class="flex items-center gap-2">
                                            <Link2 class="h-4 w-4 text-[#577AB7]" />
                                            <span class="font-[Poppins] text-[16px] leading-[118%] text-[#808080]">
                                                {viewroom.title}
                                            </span>
                                        </div>
                                        <div class="relative">
                                            <input 
                                                type="checkbox" 
                                                id="viewroom_{viewroom.id}" 
                                                value={viewroom.id}
                                                class="hidden peer"
                                                onchange={(e) => {
                                                    const checkbox = e.currentTarget;
                                                    if (checkbox.checked) {
                                                        selectedViewrooms = [...selectedViewrooms, viewroom.id];
                                                    } else {
                                                        selectedViewrooms = selectedViewrooms.filter(id => id !== viewroom.id);
                                                    }
                                                }}
                                                checked={selectedViewrooms.includes(viewroom.id)}
                                            />
                                            <label 
                                                for="viewroom_{viewroom.id}" 
                                                class="box-border w-[23px] h-[22px] bg-white border-2 border-[#808080] rounded-[2px] inline-block cursor-pointer peer-checked:bg-[#66A73B] peer-checked:border-[#66A73B] relative"
                                            >
                                                {#if selectedViewrooms.includes(viewroom.id)}
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
                
                <div class="flex justify-end pt-1">
                    <button 
                        type="button"
                        class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-1 text-sm rounded mr-2"
                        onclick={() => showConnectViewroomDialog = false}
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        class="bg-[#C2D1E8] hover:bg-[#A4B8D9] text-[#000000] px-4 py-1 text-sm rounded"
                    >
                        Save
                    </button>
                </div>
            </div>
        </form>
    </Dialog.Content>
</Dialog.Root>

<!-- Archive Dialog -->
<Dialog.Root bind:open={showArchiveDialog}>
    <Dialog.Content class="max-w-md bg-white rounded-lg p-5 shadow-lg">
        <form
            method="POST"
            onsubmit={preventDefault(async (e) => {
                const formData = new FormData(e.target);
                
                try {
                    const response = await fetch(`/api/ai-assistants/${aiAssistant.id}`, {
                        method: 'PUT',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        showArchiveDialog = false;
                        toast.success('AI assistant archived successfully');
                        invalidateAll();
                    } else {
                        toast.error(result.message || 'Failed to archive AI assistant');
                    }
                } catch (error) {
                    console.error('Error archiving:', error);
                    toast.error('Failed to archive AI assistant');
                } finally {
                    invalidateAll();
                }
            })}
        >
            <div class="space-y-4">
                <h2 class="text-lg font-semibold text-red-500">Archive AI Assistant</h2>
                <p class="text-gray-700">
                    Are you sure you want to archive this AI assistant? It will be moved to the "Archived" tab and won't be active anymore.
                </p>
                
                <input type="hidden" name="id" value={aiAssistant.id} />
                
                <div class="flex justify-end pt-1">
                    <button 
                        type="button"
                        class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-1 text-sm rounded mr-2"
                        onclick={() => showArchiveDialog = false}
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        class="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-1 text-sm rounded flex items-center gap-1"
                    >
                        <Archive class="h-4 w-4" />
                        Archive
                    </button>
                </div>
            </div>
        </form>
    </Dialog.Content>
</Dialog.Root>