<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Tabs, TabsContent, TabsList, TabsTrigger } from "$lib/components/ui/tabs";
    import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { goto } from "$app/navigation";
    import { PUBLIC_POCKETBASE_INSTANCE } from "$env/static/public";
    import { FileVideo, FileText, FilePen } from "lucide-svelte";
    import Sidenav from '$lib/components/layout/sidenav.svelte';

    export let data;
    const { content } = data;

    let selectedTab = 'host';
    let selectedContentType = 'all';

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
            // For PDFs and documents, open in a new tab
            window.open(`${PUBLIC_POCKETBASE_INSTANCE}/api/files/content_library/${item.id}/${item.file}`, '_blank');
        }
    }
</script>

<div class="flex h-screen bg-gray-100">
    <Sidenav activePage="content-library" />
    
    <div class="flex-1 overflow-auto">
        <div class="container mx-auto p-6">
            <div class="flex justify-between items-center mb-6">
                <div class="flex space-x-4">
                    <button 
                        class="px-4 py-2 text-sm font-medium {selectedTab === 'host' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
                        on:click={() => handleTabChange('host')}
                    >
                        Host Content
                    </button>
                    <button 
                        class="px-4 py-2 text-sm font-medium {selectedTab === 'representative' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
                        on:click={() => handleTabChange('representative')}
                    >
                        Representative Content
                    </button>
                </div>
                <Button on:click={() => goto('/upload')}>Upload a Content</Button>
            </div>

            <div class="mb-6">
                <div class="border-b">
                    <div class="flex space-x-8">
                        <button 
                            class="px-4 py-2 text-sm font-medium {selectedContentType === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
                            on:click={() => handleContentTypeChange('all')}
                        >
                            All
                        </button>
                        <button 
                            class="px-4 py-2 text-sm font-medium {selectedContentType === 'video' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
                            on:click={() => handleContentTypeChange('video')}
                        >
                            Videos
                        </button>
                        <button 
                            class="px-4 py-2 text-sm font-medium {selectedContentType === 'pdf' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
                            on:click={() => handleContentTypeChange('pdf')}
                        >
                            PDFs
                        </button>
                        <button 
                            class="px-4 py-2 text-sm font-medium {selectedContentType === 'document' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
                            on:click={() => handleContentTypeChange('document')}
                        >
                            Documents
                        </button>
                    </div>
                </div>
            </div>

            {#if filteredContent.length === 0}
                <div class="text-center py-12">
                    <p class="text-gray-500">No content found in this category</p>
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {#each filteredContent as item}
                        <Card class="overflow-hidden">
                            <CardHeader>
                                <div class="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-4 w-full h-full relative">
                                    {#if item.thumbnail}
                                        <img
                                            src={`${PUBLIC_POCKETBASE_INSTANCE}/api/files/content_library/${item.id}/${item.thumbnail}`}
                                            alt={item.title}
                                            class="w-full h-full object-cover object-center"
                                        />
                                        <div class="absolute bottom-3 right-3 text-white text-xs font-bold">
                                           {item.type}
                                        </div>
                                    {:else}
                                        <svelte:component 
                                            this={getIcon(item.type)} 
                                            class="w-12 h-12 text-gray-400"
                                        />
                                    {/if}
                                </div>
                                <CardTitle>{item.title}</CardTitle>
                                <CardDescription class="line-clamp-2">{item.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p class="text-sm text-gray-500 capitalize">Type: {item.type}</p>
                                {#if item.shared_with?.length > 0}
                                    <p class="text-sm text-gray-500">Shared with {item.shared_with.length} representatives</p>
                                {/if}
                            </CardContent>
                            <CardFooter>
                                <Button 
                                    variant="secondary" 
                                    class="w-full"
                                    on:click={() => handleContentClick(item)}
                                >
                                    {item.type === 'video' ? 'Watch Video' : 'Open File'}
                                </Button>
                            </CardFooter>
                        </Card>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</div> 