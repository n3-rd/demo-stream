<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Card } from "$lib/components/ui/card";
    import { Pencil, Video, Image as ImageIcon, FileText, Play, Plus } from 'lucide-svelte';
    import Sidenav from '$lib/components/layout/sidenav.svelte';
    import { goto } from "$app/navigation";
    import { Dialog } from "$lib/components/ui/dialog";
    import { toast } from "svelte-sonner";
    import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';

    export let data;
    const { user, videos, sharedVideos } = data;

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function handleVideoClick(video: any) {
        goto(`/room?video=${video.id}`);
    }
</script>

<div class="flex h-screen bg-gray-100">
    <Sidenav activePage="content-library" />
    
    <div class="flex-1 overflow-auto">
        <div class="container mx-auto p-6 space-y-8">
            <!-- Company Content Library -->
            <section>
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold">Company Content Library</h2>
                    {#if !user.representative}
                        <Button href="/upload" class="bg-primary hover:bg-primary/90 text-white">
                            <Plus class="h-4 w-4 mr-2" />
                            Add Content
                        </Button>
                    {/if}
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {#each videos as video}
                        <Card class="relative overflow-hidden group">
                            <!-- Thumbnail -->
                            <div class="aspect-video relative">
                                <img 
                                    src={video.thumbnail ? `${PUBLIC_POCKETBASE_INSTANCE}/api/files/${video.collectionId}/${video.id}/${video.thumbnail}` : '/placeholder-video.jpg'} 
                                    alt={video.title}
                                    class="w-full h-full object-cover"
                                />
                                <div class="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button 
                                        variant="ghost" 
                                        size="icon"
                                        class="text-white hover:text-primary"
                                        on:click={() => handleVideoClick(video)}
                                    >
                                        <Play class="h-12 w-12" />
                                    </Button>
                                </div>
                            </div>

                            <!-- Video Info -->
                            <div class="p-4">
                                <h3 class="font-semibold truncate">{video.title}</h3>
                                <p class="text-sm text-gray-500 mt-1">{formatDate(video.created)}</p>
                                {#if video.desc}
                                    <p class="text-sm text-gray-600 mt-2 line-clamp-2">{video.desc}</p>
                                {/if}
                            </div>
                        </Card>
                    {/each}
                </div>

                {#if videos.length === 0}
                    <div class="text-center py-12 bg-white rounded-lg shadow-sm">
                        <Video class="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 class="text-lg font-medium text-gray-900">No videos yet</h3>
                        <p class="mt-2 text-sm text-gray-500">
                            {#if !user.representative}
                                Get started by uploading your first video.
                            {:else}
                                No videos have been shared with you yet.
                            {/if}
                        </p>
                        {#if !user.representative}
                            <Button href="/upload" class="mt-4 bg-primary hover:bg-primary/90 text-white">
                                <Plus class="h-4 w-4 mr-2" />
                                Add First Video
                            </Button>
                        {/if}
                    </div>
                {/if}
            </section>

            <!-- Shared Content (for representatives) -->
            {#if user.representative && sharedVideos.length > 0}
                <section class="mt-8">
                    <h2 class="text-2xl font-bold mb-4">Shared With Me</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {#each sharedVideos as video}
                            <Card class="relative overflow-hidden group">
                                <!-- Thumbnail -->
                                <div class="aspect-video relative">
                                    <img 
                                        src={video.thumbnail ? `${PUBLIC_POCKETBASE_INSTANCE}/api/files/${video.collectionId}/${video.id}/${video.thumbnail}` : '/placeholder-video.jpg'} 
                                        alt={video.title}
                                        class="w-full h-full object-cover"
                                    />
                                    <div class="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            class="text-white hover:text-primary"
                                            on:click={() => handleVideoClick(video)}
                                        >
                                            <Play class="h-12 w-12" />
                                        </Button>
                                    </div>
                                </div>

                                <!-- Video Info -->
                                <div class="p-4">
                                    <h3 class="font-semibold truncate">{video.title}</h3>
                                    <p class="text-sm text-gray-500 mt-1">{formatDate(video.created)}</p>
                                    {#if video.desc}
                                        <p class="text-sm text-gray-600 mt-2 line-clamp-2">{video.desc}</p>
                                    {/if}
                                </div>
                            </Card>
                        {/each}
                    </div>
                </section>
            {/if}
        </div>
    </div>
</div>

<style>
    /* Add any custom styles here if needed */
</style> 