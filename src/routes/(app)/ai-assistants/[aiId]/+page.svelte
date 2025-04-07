<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import Sidenav from '$lib/components/layout/sidenav.svelte';
    import { enhance } from "$app/forms";
    import { toast } from "svelte-sonner";
    import { page } from '$app/stores';
    import { invalidateAll } from "$app/navigation";
    import { Upload } from 'lucide-svelte';

    export let data;
    const { aiAssistant } = data;

    function formatDate(date: string) {
        return new Date(date).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
    }

    let fileInput: HTMLInputElement;

    function handleFileUpload() {
        // In a real implementation, this would handle file uploading
        if (fileInput.files && fileInput.files.length > 0) {
            toast.success('File uploaded successfully');
        }
    }
</script>

<div class="flex h-screen bg-[#eceef3]">
    <Sidenav activePage="ai-assistants" />
    
    <div class="flex-1 overflow-auto p-6 mt-[6rem]">
        <div class="mx-auto space-y-6">
            <!-- Header with AI Assistant name and Add to Knowledge Base button -->
            <div class="bg-white rounded-[8px] h-[69px] flex items-center justify-between px-6">
                <h1 class="text-[24px] font-bold leading-[118%] text-[#808080] font-['Poppins']">{aiAssistant.name}</h1>
                <Button 
                    class="bg-[#577AB7] h-[39px] rounded-[3px] font-semibold text-[16px] text-white  px-6"
                >
                    Add to Knowledge Base
                </Button>
            </div>
            
            <!-- Knowledge Base section -->
            <div class="space-y-2">
                <h2 class="text-lg font-semibold text-[#737373] ml-2 font-['Poppins']">Knowledge Base</h2>
                
                <!-- Knowledge Base Table -->
                <div class=" rounded-[8px] overflow-hidden flex flex-col gap-4">
                    <!-- Table Header -->
                    <div class="bg-white h-[48px] flex items-center px-6 border-b border-gray-100">
                        <div class="grid grid-cols-4 w-full gap-4">
                            <div class="text-[16px] font-semibold text-[#737373] flex items-center font-['Poppins']">Create Date</div>
                            <div class="text-[16px] font-semibold text-[#737373] flex items-center font-['Poppins']">File Name</div>
                            <div class="text-[16px] font-semibold text-[#737373] flex items-center font-['Poppins']">Title</div>
                            <div class="text-[16px] font-semibold text-[#737373] flex items-center font-['Poppins']">Actions</div>
                        </div>
                    </div>

                    <!-- Table Rows -->
                    {#each aiAssistant.knowledgeBase as item}
                        <div class="bg-white h-[64px] flex items-center px-6 border-t border-gray-100">
                            <div class="grid grid-cols-4 w-full gap-4">
                                <div class="text-[16px] font-normal text-[#808080] flex items-center font-['Poppins']">
                                    {formatDate(item.createDate)}
                                </div>
                                <div class="text-[16px] font-normal text-[#808080] flex items-center font-['Poppins']">
                                    {item.fileName || '-'}
                                </div>
                                <div class="text-[16px] font-medium text-[#7798D2] flex items-center font-['Poppins']">
                                    {item.title}
                                </div>
                                <div class="flex items-center">
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        class="text-[#808080] hover:text-[#577AB7]"
                                    >
                                        Edit
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        class="text-red-500 hover:text-red-700"
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
            
            <!-- Engagement section -->
            <div class="space-y-2">
                <h2 class="text-lg font-semibold text-[#737373] ml-2 font-['Poppins']">Engagement</h2>
                
                <!-- Engagement Table -->
                <div class=" rounded-[8px] overflow-hidden flex flex-col gap-4">
                    <!-- Table Header -->
                    <div class="bg-white h-[48px] flex items-center px-6 border-b border-gray-100">
                        <div class="grid grid-cols-4 w-full gap-4">
                            <div class="text-[16px] font-semibold text-[#737373] flex items-center font-['Poppins']">Date</div>
                            <div class="text-[16px] font-semibold text-[#737373] flex items-center font-['Poppins']">Interaction</div>
                            <div class="text-[16px] font-semibold text-[#737373] flex items-center font-['Poppins']">AI Response</div>
                            <div class="text-[16px] font-semibold text-[#737373] flex items-center font-['Poppins']">Training</div>
                        </div>
                    </div>

                    <!-- Table Rows -->
                    {#each aiAssistant.engagement as item}
                        <div class="bg-white py-4 px-6 border-t border-gray-100">
                            <div class="grid grid-cols-4 w-full gap-4">
                                <div class="text-[16px] font-normal text-[#808080] flex items-start font-['Poppins']">
                                    {formatDate(item.date)}
                                </div>
                                <div class="text-[16px] font-normal text-[#808080] font-['Poppins'] bg-[#ECEFF3] p-4 rounded-[3px] h-[126px]">
                                    {item.interaction || 'No interaction recorded'}
                                </div>
                                <div class="text-[16px] font-normal text-[#808080] font-['Poppins'] bg-[#ECEFF3] p-4 rounded-[3px] h-[126px]">
                                    {item.aiResponse || 'No response recorded'}
                                </div>
                                <div class="flex flex-col h-full">
                                    <div class="bg-[#ECEFF3] p-4 rounded-[3px] h-[124px] mb-2">
                                        <input 
                                            type="file" 
                                            class="hidden" 
                                            bind:this={fileInput}
                                            on:change={handleFileUpload}
                                        />
                                        <div class="flex flex-col items-center justify-center h-full">
                                            <button 
                                                class="p-2 mb-2 rounded-full bg-gray-200"
                                                on:click={() => fileInput.click()}
                                            >
                                                <Upload class="h-5 w-5 text-gray-500" />
                                            </button>
                                            <button 
                                                class="text-[#808080] text-[16px] font-normal font-['Poppins']"
                                                on:click={() => fileInput.click()}
                                            >
                                                Choose File
                                            </button>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        class="text-[#808080] border border-gray-200 h-auto py-2"
                                    >
                                        <span class="flex items-center gap-2">
                                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M17 7h-3V4c0-.55-.45-1-1-1H7c-.55 0-1 .45-1 1v3H3c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h3v3c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-3h3c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1z" fill="#666666"/>
                                            </svg>
                                            Save to AI-I
                                        </span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>
</div> 