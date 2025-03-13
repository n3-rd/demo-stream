<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { MoreHorizontal } from 'lucide-svelte';
    import Sidenav from '$lib/components/layout/sidenav.svelte';
    import * as Dialog from "$lib/components/ui/dialog";
    import { Label } from "$lib/components/ui/label";
    import { Input } from "$lib/components/ui/input";
    import { enhance } from "$app/forms";
    import { toast } from "svelte-sonner";
    import { invalidateAll } from "$app/navigation";

    // Dummy data for AI assistants
    const aiAssistants = [
        {
            id: '1',
            name: 'Name 1',
            created: '2024-02-23',
            lastUpdated: '2024-02-23'
        },
        {
            id: '2',
            name: 'Name 2',
            created: '2024-02-23',
            lastUpdated: '2024-02-23'
        },
        {
            id: '3',
            name: 'Name 3',
            created: '2024-02-23',
            lastUpdated: '2024-02-23'
        },
        {
            id: '4',
            name: 'Name 4',
            created: '2024-02-23',
            lastUpdated: '2024-02-23'
        },
        {
            id: '5',
            name: 'Name 5',
            created: '2024-02-23',
            lastUpdated: '2024-02-23'
        },
        {
            id: '6',
            name: 'Name 6',
            created: '2024-02-23',
            lastUpdated: '2024-02-23'
        }
    ];

    let showAddDialog = false;
    let newAssistantName = '';

    function formatDate(date: string) {
        return new Date(date).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: '2-digit'
        });
    }
</script>

<div class="flex h-screen bg-[#F5F5F5]">
    <Sidenav activePage="ai-assistants" />
    
    <div class="flex-1 overflow-auto p-6 mt-[6rem]">
        <div class="mx-auto space-y-6">
            <!-- Header with title and Add New AI button -->
            <div class="bg-white rounded-[8px] h-[69px] flex items-center justify-between px-6">
                <h1 class="text-[24px] font-bold leading-[118%] text-[#808080]">AI Assistant List</h1>
                <Button 
                    class="bg-[#577AB7] h-[39px] rounded-[3px] font-semibold text-[16px] text-white"
                    on:click={() => showAddDialog = true}
                >
                    Add New AI
                </Button>
            </div>

            <!-- AI Names section -->
            <div class="space-y-1">
                <h2 class="text-lg font-medium text-[#737373] ml-2">AI Names</h2>
                
                <!-- Table Header -->
                <div class="bg-white rounded-t-[8px] h-[55px] flex items-center px-6">
                    <div class="grid grid-cols-6 w-full gap-4">
                        <div class="text-[16px] font-semibold text-[#737373] flex items-center">Date</div>
                        <div class="text-[16px] font-semibold text-[#737373] flex items-center">AI Name</div>
                        <div class="text-[16px] font-semibold text-[#737373] flex items-center">Last Update</div>
                        <div class="text-[16px] font-semibold text-[#737373] flex items-center">Viewroom Connection</div>
                        <div class="text-[16px] font-semibold text-[#737373] flex items-center">Engagement</div>
                        <div class="text-[16px] font-semibold text-[#737373] flex items-center"></div>
                    </div>
                </div>

                <!-- Table Rows -->
                {#each aiAssistants as ai}
                    <div class="bg-white {ai.id === aiAssistants[aiAssistants.length-1].id ? 'rounded-b-[8px]' : ''} h-[73px] flex items-center px-6 border-t border-gray-100">
                        <div class="grid grid-cols-6 w-full gap-4">
                            <div class="text-[16px] font-normal text-[#808080] flex items-center">
                                {formatDate(ai.created)}
                            </div>
                            <div class="text-[16px] font-medium text-[#7798D2] flex items-center">
                                <a 
                                    href={`/ai-assistants/${ai.id}`}
                                    class="hover:underline"
                                >
                                    {ai.name}
                                </a>
                            </div>
                            <div class="text-[16px] font-normal text-[#808080] flex items-center">
                                {formatDate(ai.lastUpdated)}
                            </div>
                            <div class="flex items-center">
                                <button 
                                    class="text-[16px] font-normal text-[#808080]"
                                >
                                    show
                                </button>
                            </div>
                            <div class="flex items-center">
                                <button 
                                    class="text-[16px] font-normal text-[#808080]"
                                >
                                    show
                                </button>
                            </div>
                            <div class="flex items-center justify-end">
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal class="h-4 w-4" />
                                    <span class="sr-only">Open menu</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>

<!-- Add AI Assistant Dialog -->
<Dialog.Root bind:open={showAddDialog}>
    <Dialog.Content class="max-w-md bg-white rounded-lg p-5 shadow-lg">
        <form
            method="POST"
            action="?/create"
            use:enhance={() => {
                return async ({ result }) => {
                    if (result.type === 'success') {
                        await invalidateAll();
                        showAddDialog = false;
                        newAssistantName = '';
                        toast.success('AI assistant created successfully');
                    } else if (result.type === 'failure') {
                        const errorMsg = typeof result.data?.message === 'string' 
                            ? result.data.message 
                            : 'Failed to create AI assistant';
                        toast.error(errorMsg);
                    } else {
                        toast.error('An error occurred');
                    }
                };
            }}
        >
            <div class="space-y-4">
                <h2 class="text-lg font-semibold text-[#808080]">Add New AI Assistant</h2>
                
                <div class="space-y-1">
                    <div class="text-sm text-[#808080]">Assistant Name</div>
                    <input 
                        id="assistantName"
                        name="name"
                        value={newAssistantName}
                        placeholder="Enter assistant name"
                        class="w-full border border-gray-300 px-3 py-1.5 rounded text-sm"
                        required
                    />
                </div>
                
                <div class="flex justify-end pt-1">
                    <button 
                        type="submit"
                        class="bg-[#C2D1E8] hover:bg-[#A4B8D9] text-[#000000] px-4 py-1 text-sm rounded"
                    >
                        Add
                    </button>
                </div>
            </div>
        </form>
    </Dialog.Content>
</Dialog.Root> 