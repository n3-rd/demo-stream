<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Card } from "$lib/components/ui/card";
    import { Pencil, Video, Image as ImageIcon, FileText } from 'lucide-svelte';
    import Sidenav from '$lib/components/layout/sidenav.svelte';

    type ContentType = 'Video' | 'Image' | 'PDF';
    type ContentItem = {
        id: string;
        title: string;
        type: ContentType;
    };

    // Sample data structure
    let hostContent: ContentItem[] = [
        { id: 'id0001', title: 'Title1', type: 'Video' },
        { id: 'id0002', title: 'Title3', type: 'Video' },
        { id: 'id0004', title: 'Title4', type: 'Image' },
        // ... add more items as needed
    ];

    let repContent: ContentItem[] = [
        { id: 'id0009', title: 'Title1', type: 'Video' },
        { id: 'id0009', title: 'Title1', type: 'Image' },
        // ... add more items as needed
    ];

    function getContentIcon(type: ContentType) {
        switch(type) {
            case 'Video':
                return Video;
            case 'Image':
                return ImageIcon;
            case 'PDF':
                return FileText;
            default:
                return FileText;
        }
    }

    function getContentColor(type: ContentType) {
        switch(type) {
            case 'Video':
                return 'bg-gray-200';
            case 'Image':
                return 'bg-red-400';
            case 'PDF':
                return 'bg-blue-200';
            default:
                return 'bg-gray-200';
        }
    }
</script>

<div class="flex h-screen bg-gray-100">
    <Sidenav activePage="content-library" />
    
    <div class="flex-1 overflow-auto">
        <div class="container mx-auto p-6 space-y-8">
            <!-- Host Content Library -->
            <section>
                <h2 class="text-2xl font-bold mb-4">Host Content Library</h2>
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {#each hostContent as item}
                        <Card class={`relative ${getContentColor(item.type)} p-4 aspect-square flex flex-col`}>
                            <Button 
                                variant="ghost" 
                                size="icon"
                                class="absolute top-2 right-2"
                            >
                                <Pencil class="h-4 w-4" />
                                <span class="sr-only">Edit</span>
                            </Button>

                            <div class="flex-1 flex items-center justify-center">
                                <svelte:component 
                                    this={getContentIcon(item.type)} 
                                    class="h-8 w-8"
                                />
                            </div>

                            <div class="mt-2 text-center">
                                <p class="text-sm font-medium truncate">{item.title}</p>
                                <p class="text-xs text-gray-600">{item.id}</p>
                            </div>
                        </Card>
                    {/each}
                </div>
            </section>

            <!-- Representative Content Library -->
            <section>
                <h2 class="text-2xl font-bold mb-4">Rep Content Library</h2>
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {#each repContent as item}
                        <Card class={`relative ${getContentColor(item.type)} p-4 aspect-square flex flex-col`}>
                            <Button 
                                variant="ghost" 
                                size="icon"
                                class="absolute top-2 right-2"
                            >
                                <Pencil class="h-4 w-4" />
                                <span class="sr-only">Edit</span>
                            </Button>

                            <div class="flex-1 flex items-center justify-center">
                                <svelte:component 
                                    this={getContentIcon(item.type)} 
                                    class="h-8 w-8"
                                />
                            </div>

                            <div class="mt-2 text-center">
                                <p class="text-sm font-medium truncate">{item.title}</p>
                                <p class="text-xs text-gray-600">{item.id}</p>
                            </div>
                        </Card>
                    {/each}
                </div>
            </section>
        </div>
    </div>
</div>

<style>
    /* Add any custom styles here if needed */
</style> 