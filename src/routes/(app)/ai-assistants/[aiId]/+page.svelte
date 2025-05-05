<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import Sidenav from '$lib/components/layout/sidenav.svelte';
    import { enhance } from "$app/forms";
    import { toast } from "svelte-sonner";
    import { page } from '$app/stores';
    import { invalidateAll } from "$app/navigation";
    import { Upload, Link2, Archive, RotateCcw, Trash2 } from 'lucide-svelte';
    import * as Tabs from "$lib/components/ui/tabs";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Select from "$lib/components/ui/select";

    export let data;
    const { aiAssistant, viewrooms } = data;

    function formatDate(date: string) {
        return new Date(date).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
    }

    let fileInput: HTMLInputElement;
    let showConnectViewroomDialog = false;
    let selectedViewrooms = aiAssistant.viewrooom_connections || [];
    let showArchiveDialog = false;

    function handleFileUpload() {
        if (fileInput.files && fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('id', aiAssistant.id);
            
            for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('training_files', fileInput.files[i]);
            }
            
            submitFileUpload(formData);
        }
    }
    
    async function submitFileUpload(formData) {
        try {
            const response = await fetch(`?/uploadFiles`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            console.log('File upload result:', result);
            
            // Handle various success response formats
            if (result.success || 
                result.type === 'success' || 
                (typeof result.data === 'string' && result.data.includes('success'))) {
                toast.success('File uploaded successfully');
                invalidateAll();
            } else {
                toast.error(result.message || 'Failed to upload file');
            }
        } catch (err) {
            console.error('Error uploading file:', err);
            toast.error('Failed to upload file');
        } finally {
            // Always invalidate to refresh the data
             invalidateAll();
        }
    }
</script>

<div class="flex h-screen bg-[#eceef3]">
    <Sidenav activePage="ai-assistants" />
    
    <div class="flex-1 overflow-auto p-6 mt-[6rem]">
        <div class="mx-auto space-y-6">
            <!-- Header with AI Assistant name and Add to Knowledge Base button -->
            <div class="bg-white rounded-[8px] h-[69px] flex items-center justify-between px-6">
                <div class="flex items-center gap-3">
                    <h1 class="text-[24px] font-bold leading-[118%] text-[#808080] font-['Poppins']">{aiAssistant.name}</h1>
                    <span class={`px-2 py-1 text-xs rounded-full ${aiAssistant.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {aiAssistant.status ? 'Active' : 'Archived'}
                    </span>
                </div>
                <div class="flex gap-2">
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
                            action="?/restore"
                            use:enhance={() => {
                                return async ({ result }) => {
                                    try {
                                        if (result.type === 'success') {
                                            toast.success('AI assistant restored successfully');
                                        } else {
                                            toast.error('Failed to restore AI assistant');
                                        }
                                    } catch (err) {
                                        console.error('Error restoring:', err);
                                        toast.error('An unexpected error occurred');
                                    } finally {
                                        // Always invalidate to refresh the data
                                        await invalidateAll();
                                    }
                                };
                            }}
                        >
                            <input type="hidden" name="id" value={aiAssistant.id} />
                            <Button 
                                type="submit"
                                class="bg-blue-200 text-blue-700 h-[39px] rounded-[3px] font-semibold text-[16px] flex items-center gap-2"
                            >
                                <RotateCcw class="h-4 w-4" />
                                Restore
                            </Button>
                        </form>
                    {/if}
                    <Button 
                        class="bg-[#577AB7] h-[39px] rounded-[3px] font-semibold text-[16px] text-white px-6"
                        on:click={() => showConnectViewroomDialog = true}
                    >
                        Add to Knowledge Base
                    </Button>
                </div>
            </div>
            
            <!-- ViewRoom Connections -->
            <div class="space-y-2">
                <div class="flex items-center justify-between">
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
                    {#if !aiAssistant.viewrooom_connections || aiAssistant.viewrooom_connections.length === 0}
                        <div class="text-gray-500 italic">No ViewRoom connections</div>
                    {:else}
                        <div class="flex flex-wrap gap-2">
                            {#each aiAssistant.viewrooom_connections as connectionId}
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

                    <!-- Table Rows - Files from training_files -->
                    {#if aiAssistant.training_files && aiAssistant.training_files.length > 0}
                        {#each aiAssistant.training_files as file, index}
                            <div class="bg-white h-[64px] flex items-center px-6 border-t border-gray-100">
                                <div class="grid grid-cols-4 w-full gap-4">
                                    <div class="text-[16px] font-normal text-[#808080] flex items-center font-['Poppins']">
                                        {formatDate(aiAssistant.updated)}
                                    </div>
                                    <div class="text-[16px] font-normal text-[#808080] flex items-center font-['Poppins']">
                                        {file}
                                    </div>
                                    <div class="text-[16px] font-normal text-[#808080] flex items-center font-['Poppins']">
                                        {file.split('.').pop().toUpperCase()}
                                    </div>
                                    <div class="flex items-center">
                                        <form
                                            method="POST"
                                            action="?/removeFile"
                                            use:enhance={() => {
                                                return async ({ result }) => {
                                                    try {
                                                        if (result.type === 'success') {
                                                            toast.success('File removed successfully');
                                                        } else {
                                                            toast.error('Failed to remove file');
                                                        }
                                                    } catch (err) {
                                                        console.error('Error removing file:', err);
                                                        toast.error('An unexpected error occurred');
                                                    } finally {
                                                        // Always invalidate to refresh the data
                                                        await invalidateAll();
                                                    }
                                                };
                                            }}
                                        >
                                            <input type="hidden" name="id" value={aiAssistant.id} />
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
                            on:change={handleFileUpload}
                            multiple
                            accept=".pdf,.docx,.doc"
                        />
                        <Button 
                            variant="outline" 
                            class="w-full h-16 border-dashed border-2"
                            on:click={() => fileInput.click()}
                        >
                            <div class="flex flex-col items-center justify-center">
                                <Upload class="h-5 w-5 mb-1 text-gray-500" />
                                <div class="text-sm text-gray-600">Upload Training Files (PDF, Word)</div>
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
                return async ({ result, formData }) => {
                    // Clear any existing entries first
                    const entries = Array.from(formData.entries());
                    for (const [key] of entries) {
                        if (key === 'viewrooom_connections') {
                            formData.delete(key);
                        }
                    }
                    
                    // Add all selected viewrooms explicitly
                    selectedViewrooms.forEach(id => {
                        formData.append('viewrooom_connections', id);
                    });
                    
                    try {
                        if (result.type === 'success') {
                            showConnectViewroomDialog = false;
                            toast.success('ViewRoom connections updated successfully');
                            invalidateAll();
                        } else if (result.type === 'failure') {
                            const errorMsg = typeof result.data?.message === 'string' 
                                ? result.data.message 
                                : 'Failed to update ViewRoom connections';
                            toast.error(errorMsg);
                        } else {
                            toast.error('An error occurred');
                        }
                    } catch (err) {
                        console.error('Error in updateViewrooms:', err);
                        toast.error('An unexpected error occurred');
                    } finally {
                        // Always invalidate to refresh the data
                        await invalidateAll();
                    }
                };
            }}
        >
            <div class="space-y-4">
                <h2 class="text-lg font-semibold text-[#808080]">Manage ViewRoom Connections</h2>
                
                <input type="hidden" name="id" value={aiAssistant.id} />
                
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
                                                on:change={(e) => {
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
                    
                    <!-- Add individual hidden inputs for each viewroom -->
                    {#each selectedViewrooms as viewroomId}
                        <input type="hidden" name="viewrooom_connections" value={viewroomId} />
                    {/each}
                </div>
                
                <div class="flex justify-end pt-1">
                    <button 
                        type="button"
                        class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-1 text-sm rounded mr-2"
                        on:click={() => showConnectViewroomDialog = false}
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
            action="?/archive"
            use:enhance={() => {
                return async ({ result }) => {
                    try {
                        if (result.type === 'success') {
                            showArchiveDialog = false;
                            toast.success('AI assistant archived successfully');
                             invalidateAll();
                        } else if (result.type === 'failure') {
                            toast.error('Failed to archive AI assistant');
                        } else {
                            toast.error('An error occurred');
                        }
                    } catch (err) {
                        console.error('Error archiving:', err);
                        toast.error('An unexpected error occurred');
                    } finally {
                        // Always invalidate to refresh the data
                         invalidateAll();
                    }
                };
            }}
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
                        on:click={() => showArchiveDialog = false}
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