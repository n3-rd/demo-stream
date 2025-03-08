<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { goto } from "$app/navigation";
    import { PUBLIC_POCKETBASE_INSTANCE } from "$env/static/public";
    import { FileVideo, FileText, FilePen, Trash2 } from "lucide-svelte";
    import Sidenav from '$lib/components/layout/sidenav.svelte';

    export let data;
    const { content } = data;

    let selectedTab = 'host';
    let selectedContentType = 'video';

    function handleTabChange(tab: string) {
        selectedTab = tab;
    }

    function handleContentTypeChange(type: string) {
        selectedContentType = type;
    }

    $: filteredContent = content.filter(item => {
        const libraryTypeMatch = selectedTab === 'host'
            ? item.library_type === 'host' || (Array.isArray(item.library_type) && item.library_type.includes('host'))
            : item.library_type === 'representative' || (Array.isArray(item.library_type) && item.library_type.includes('representative'));

        const contentTypeMatch = selectedContentType === 'all' || item.type === selectedContentType;

        return libraryTypeMatch && contentTypeMatch;
    });

    function getIcon(type: string) {
        switch (type) {
            case 'video':
                return FileVideo;
            case 'pdf':
                return FilePen;
            case 'document':
                return FileText;
            default:
                return FileText;
        }
    }

    function handleContentClick(item) {
        if (item.type === 'video') {
            goto(`/content-library/video/${item.id}`);
        } else {
            window.open(`${PUBLIC_POCKETBASE_INSTANCE}/api/files/content_library/${item.id}/${item.file}`, '_blank');
        }
    }
</script>

<div class="flex h-screen bg-[#F5F5F5]">
    <Sidenav activePage="content-library" />
    
    <div class="flex-1 overflow-auto">
        <div class="p-6 max-w-[1115px] mx-auto">
            <!-- Header Section -->
            <div class="bg-white rounded-[8px] p-4 mb-6 flex justify-between items-center">
                <div class="flex space-x-8">
                    <button 
                        class="font-['Poppins'] text-[24px] leading-[118%] {selectedTab === 'host' ? 'text-[#577AB7] font-bold' : 'text-[#737373]'}"
                        on:click={() => handleTabChange('host')}
                    >
                        Host Content
                    </button>
                    <button 
                        class="font-['Poppins'] text-[24px] leading-[118%] {selectedTab === 'representative' ? 'text-[#577AB7] font-bold' : 'text-[#737373]'}"
                        on:click={() => handleTabChange('representative')}
                    >
                        Representative Content
                    </button>
                </div>
                <div class="flex space-x-4">
                    <Button 
                        class="bg-[#577AB7] hover:bg-[#577AB7]/90 h-[39px] rounded-[3px] font-semibold text-[16px] text-white"
                        on:click={() => goto('/upload')}
                    >
                        Upload a Content
                    </Button>
                    <Button 
                        class="bg-[#577AB7] hover:bg-[#577AB7]/90 h-[39px] rounded-[3px] font-semibold text-[16px] text-white"
                    >
                        Create Room
                    </Button>
                </div>
            </div>

            <!-- Content Type Tabs -->
            <div class="bg-white rounded-[8px] p-4 mb-6">
                <div class="flex space-x-8">
                    <button 
                        class="font-['Poppins'] font-medium text-[16px] {selectedContentType === 'video' ? 'text-[#577AB7]' : 'text-[#737373]'}"
                        on:click={() => handleContentTypeChange('video')}
                    >
                        Videos
                    </button>
                    <button 
                        class="font-['Poppins'] font-medium text-[16px] {selectedContentType === 'pdf' ? 'text-[#577AB7]' : 'text-[#737373]'}"
                        on:click={() => handleContentTypeChange('pdf')}
                    >
                        PDF File
                    </button>
                    <button 
                        class="font-['Poppins'] font-medium text-[16px] {selectedContentType === 'document' ? 'text-[#577AB7]' : 'text-[#737373]'}"
                        on:click={() => handleContentTypeChange('document')}
                    >
                        Word Document File
                    </button>
                </div>
            </div>

            <!-- Content Grid -->
            {#if filteredContent.length === 0}
                <div class="text-center py-12 bg-white rounded-[8px]">
                    <p class="text-[#737373] font-['Poppins']">No content found in this category</p>
                </div>
            {:else}
                <div class="grid grid-cols-4 gap-6">
                    {#each filteredContent as item}
                        <div class="bg-[#ECEFF3] rounded-[2px] p-2">
                            <div class="relative">
                                {#if item.thumbnail}
                                    <img
                                        src={`${PUBLIC_POCKETBASE_INSTANCE}/api/files/content_library/${item.id}/${item.thumbnail}`}
                                        alt={item.title}
                                        class="w-[217.66px] h-[128.22px] object-cover rounded-[1px]"
                                    />
                                {:else}
                                    <div class="w-[217.66px] h-[128.22px] bg-[#ECEFF3] rounded-[1px] flex items-center justify-center">
                                        <svelte:component 
                                            this={getIcon(item.type)} 
                                            class="w-12 h-12 text-[#666666]"
                                        />
                                    </div>
                                {/if}
                                {#if item.type === 'video'}
                                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                        <div class="w-[37.16px] h-[35.04px] bg-white rounded-full flex items-center justify-center">
                                            <div class="w-[17px] h-[27.53px] bg-[#666666]" />
                                        </div>
                                    </div>
                                {/if}
                                <button 
                                    class="absolute top-2 right-2 w-[21.23px] h-[19.11px] bg-[#EB3223] rounded-full flex items-center justify-center"
                                    on:click={() => {/* Handle delete */}}
                                >
                                    <Trash2 class="w-[14.16px] h-[12.74px] text-[#ECEFF3]" />
                                </button>
                            </div>
                            <div class="mt-2">
                                <h3 class=" font-semibold text-[14px] leading-[120%] text-[#577AB7]">{item.title}</h3>
                                <p class=" font-light text-[11px] leading-[120%] text-black/50">ID {item.id}</p>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</div> 