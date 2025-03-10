<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { goto } from "$app/navigation";
    import { PUBLIC_POCKETBASE_INSTANCE } from "$env/static/public";
    import { FileVideo, FileText, FilePen, Trash2, Pencil, Play, ChevronLeft, ChevronRight } from "lucide-svelte";
    import Sidenav from '$lib/components/layout/sidenav.svelte';
    import { onMount } from 'svelte';

    export let data;
    const { content } = data;

    let selectedTab = 'host';
    let contentTypes = ['video', 'pdf', 'document'];
    let contentTypeLabels = {
        'video': 'Videos',
        'pdf': 'PDF Files',
        'document': 'Word Document Files'
    };
    
    // Store references to carousel containers
    let carouselContainers = {};
    // Track scroll position for each carousel
    let carouselScrollState = {};

    function handleTabChange(tab: string) {
        selectedTab = tab;
    }

    // Group content by type
    $: contentByType = contentTypes.map(type => {
        return {
            type,
            label: contentTypeLabels[type],
            items: content.filter(item => {
                const libraryTypeMatch = selectedTab === 'host'
                    ? item.library_type === 'host' || (Array.isArray(item.library_type) && item.library_type.includes('host'))
                    : item.library_type === 'representative' || (Array.isArray(item.library_type) && item.library_type.includes('representative'));

                return libraryTypeMatch && item.type === type;
            })
        };
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
           window.open(`${PUBLIC_POCKETBASE_INSTANCE}api/files/content_library/${item.id}/${item.file}`, '_blank');
        } else {
            window.open(`${PUBLIC_POCKETBASE_INSTANCE}api/files/content_library/${item.id}/${item.file}`, '_blank');
        }
    }
    
    function scrollCarousel(type: string, direction: 'left' | 'right') {
        const container = carouselContainers[type];
        if (!container) return;
        
        const scrollAmount = 230; // Slightly wider than card width to account for gap
        const scrollLeft = direction === 'left' 
            ? container.scrollLeft - scrollAmount 
            : container.scrollLeft + scrollAmount;
            
        container.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
        });
    }
    
    function bindCarouselContainer(node, type) {
        carouselContainers[type] = node;
        
        // Initialize scroll state
        if (!carouselScrollState[type]) {
            carouselScrollState[type] = {
                canScrollLeft: false,
                canScrollRight: node.scrollWidth > node.clientWidth
            };
        }
        
        // Add scroll event listener
        const handleScroll = () => {
            carouselScrollState[type] = {
                canScrollLeft: node.scrollLeft > 0,
                canScrollRight: node.scrollLeft + node.clientWidth < node.scrollWidth - 10
            };
            carouselScrollState = {...carouselScrollState};
        };
        
        node.addEventListener('scroll', handleScroll);
        
        // Initial check
        setTimeout(handleScroll, 100);
        
        return {
            destroy() {
                node.removeEventListener('scroll', handleScroll);
                delete carouselContainers[type];
            }
        };
    }
    
    // Check if carousel needs navigation
    function needsNavigation(type, items) {
        if (!items || items.length <= 4) return false;
        return true;
    }
</script>

<div class="flex h-screen bg-[#F5F5F5]">
    <Sidenav activePage="content-library" />
    
    <div class="flex-1 overflow-auto">
        <div class="p-6  mx-auto">
            <!-- Header Section -->
            <div class="bg-white rounded-[8px] p-4 mb-6 flex justify-between items-center">
                <div class="flex space-x-8">
                    <button 
                        class=" text-[24px] leading-[118%] {selectedTab === 'host' ? 'text-[#577AB7] font-bold' : 'text-[#737373]'}"
                        on:click={() => handleTabChange('host')}
                    >
                        Host Content
                    </button>
                    <button 
                        class=" text-[24px] leading-[118%] {selectedTab === 'representative' ? 'text-[#577AB7] font-bold' : 'text-[#737373]'}"
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

            <!-- Content Carousels -->
            {#each contentByType as contentGroup}
                {#if contentGroup.items.length > 0}
                    <div class="mb-8">
                        <h2 class="text-[16px] font-medium text-[#737373] mb-4">{contentGroup.label}</h2>
                        
                        <div class="relative bg-white rounded-lg p-4 shadow-sm">
                            <!-- Left Navigation Button -->
                            {#if needsNavigation(contentGroup.type, contentGroup.items) && carouselScrollState[contentGroup.type]?.canScrollLeft}
                                <button 
                                    class="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center hover:bg-gray-100 border border-gray-100"
                                    on:click={() => scrollCarousel(contentGroup.type, 'left')}
                                >
                                <img src="/icons/icon-carousel-back.svg" class="w-6 h-6 text-[#737373]" />
                                </button>
                            {/if}
                            
                            <!-- Content Cards -->
                            <div class="overflow-hidden px-8">
                                <div 
                                    class="flex gap-6 py-2 overflow-x-auto scrollbar-hide" 
                                    use:bindCarouselContainer={contentGroup.type}
                                    style="scroll-behavior: smooth; -ms-overflow-style: none; scrollbar-width: none;"
                                >
                                    {#each contentGroup.items as item}
                                        <div class="bg-[#ECEFF3] rounded-[2px] p-2 flex-shrink-0 shadow-sm hover:shadow-md transition-shadow duration-200 w-[221.66px]">
                                            <div class="relative">
                                                {#if item.thumbnail}
                                                    <img
                                                        src={`${PUBLIC_POCKETBASE_INSTANCE}api/files/content_library/${item.id}/${item.thumbnail}`}
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
                                                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                                                    on:click={()=>{
                                                        handleContentClick(item);
                                                    }}
                                                    >
                                                        <div class="w-[37.16px] h-[35.04px] bg-white rounded-full flex items-center justify-center shadow-md">
                                                           <Play class="w-[17px] h-[27.53px] text-[#577AB7]" 
                                                           />
                                                        </div>
                                                    </div>
                                                {/if}
                                                <div class="absolute top-2 right-2 flex gap-2">
                                                    <button 
                                                        class="w-[21.23px] h-[19.11px] bg-[#577AB7] rounded-full flex items-center justify-center shadow-sm"
                                                        on:click|stopPropagation={() => goto(`/content-library/${item.id}/edit`)}
                                                    >
                                                        <Pencil class="w-[14.16px] h-[12.74px] text-[#ECEFF3]" />
                                                    </button>
                                                    <button 
                                                        class="w-[21.23px] h-[19.11px] bg-[#EB3223] rounded-full flex items-center justify-center shadow-sm"
                                                        on:click|stopPropagation={() => {/* Handle delete */}}
                                                    >
                                                        <Trash2 class="w-[14.16px] h-[12.74px] text-[#ECEFF3]" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div class="mt-2">
                                                <h3 class="font-semibold text-[14px] leading-[120%] text-[#577AB7] truncate">{item.title}</h3>
                                                <p class="font-light text-[11px] leading-[120%] text-black/50">ID {item.id}</p>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                            
                            <!-- Right Navigation Button -->
                            {#if needsNavigation(contentGroup.type, contentGroup.items) && carouselScrollState[contentGroup.type]?.canScrollRight}
                                <button 
                                    class="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center hover:bg-gray-100 border border-gray-100"
                                    on:click={() => scrollCarousel(contentGroup.type, 'right')}
                                >
                                    <img src="/icons/icon-carousel-front.svg" class="w-6 h-6 text-[#737373]" />
                                </button>
                            {/if}
                        </div>
                    </div>
                {/if}
            {/each}

            {#if contentByType.every(group => group.items.length === 0)}
                <div class="text-center py-12 bg-white rounded-[8px]">
                    <p class="text-[#737373] ">No content found in this category</p>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    /* Hide scrollbar for Chrome, Safari and Opera */
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
</style> 