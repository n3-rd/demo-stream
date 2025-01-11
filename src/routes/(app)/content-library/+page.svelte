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

    let selectedTab = "all";

    $: filteredContent = selectedTab === "all" 
        ? content 
        : content.filter(item => item.type === selectedTab);

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
                <h1 class="text-3xl font-bold">Content Library</h1>
                <Button on:click={() => goto('/upload')}>Upload Content</Button>
            </div>

            <Tabs value={selectedTab} onValueChange={(value) => selectedTab = value} class="w-full">
                <TabsList class="grid w-full grid-cols-4 lg:w-[400px]">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="video">Videos</TabsTrigger>
                    <TabsTrigger value="pdf">PDFs</TabsTrigger>
                    <TabsTrigger value="document">Documents</TabsTrigger>
                </TabsList>

                <TabsContent value={selectedTab} class="mt-6">
                    {#if filteredContent.length === 0}
                        <div class="text-center py-12">
                            <p class="text-gray-500">No content found in this category</p>
                        </div>
                    {:else}
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {#each filteredContent as item}
                                <Card class="overflow-hidden">
                                    <CardHeader>
                                        <div class="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                                            {#if item.type === 'video' && item.thumbnail}
                                                <img
                                                    src={`${PUBLIC_POCKETBASE_INSTANCE}/api/files/content_library/${item.id}/${item.thumbnail}`}
                                                    alt={item.title}
                                                    class="w-full h-full object-cover"
                                                />
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
                </TabsContent>
            </Tabs>
        </div>
    </div>
</div> 