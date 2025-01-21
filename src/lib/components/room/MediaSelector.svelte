<script lang="ts">
    import { page } from '$app/stores';
    import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';
    import { onMount } from 'svelte';
    import { createEventDispatcher } from 'svelte';

    export let isHost: boolean;
    export let isRepresentative: boolean;
    export let room: any;

    const dispatch = createEventDispatcher();

    let content = [];
    let loading = true;
    let error = null;

    async function loadContent() {
        try {
            loading = true;
            console.log('Loading content for:', { 
                isHost, 
                isRepresentative, 
                roomId: room?.id,
                hasHostContent: !!room?.host_content,
                hasRepContent: !!room?.representative_content,
                expandedData: room?.expand
            });
            
            if (isHost) {
                content = room?.expand?.host_content || [];
                console.log('Host content loaded:', content);
            } else if (isRepresentative) {
                content = room?.expand?.representative_content || [];
                console.log('Representative content loaded:', content);
            }
            
            if (content.length === 0) {
                console.log('No content found for current role');
                if (isHost) {
                    error = 'No host content available';
                } else if (isRepresentative) {
                    error = 'No representative content available';
                }
            }
            
            loading = false;
        } catch (err) {
            console.error('Error loading content:', err);
            error = 'Failed to load content';
            loading = false;
        }
    }

    function handleVideoSelect(item: any) {
        console.log('Video selected:', item);
        dispatch('videoSelect', item);
    }

    function handleVideoClick(video) {
        console.log('Video clicked:', {
            video,
            hasFile: !!video?.file,
            collectionId: video?.collectionId,
            id: video?.id,
            file: video?.file,
            fileUrl: getFileUrl(video)
        });
        dispatch('videoSelect', video);
    }

    onMount(() => {
        loadContent();
    });

    function getFileUrl(file: any) {
        if (!file) return '';
        return `${PUBLIC_POCKETBASE_INSTANCE}/api/files/${file.collectionId}/${file.id}/${file.file}`;
    }

    function getThumbnailUrl(content: any) {
        if (content.thumbnail) {
            return `${PUBLIC_POCKETBASE_INSTANCE}/api/files/${content.collectionId}/${content.id}/${content.thumbnail}`;
        }
        return ''; // Return a default thumbnail URL if needed
    }
</script>

<div class="content-selector !pb-20 bg-black/50">
    {#if loading}
        <div class="loading">Loading content...</div>
    {:else if error}
        <div class="error">{error}</div>
    {:else if content?.length}
        <div class="flex flex-col gap-8 p-4">
            <!-- Host Content -->
            {#if content.filter(video => room?.host_content?.includes(video.id)).length > 0}
                <div class="content-section">
                    <h2 class="text-xl font-semibold mb-4 text-white">Host Content</h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {#each content.filter(video => room?.host_content?.includes(video.id)) as video}
                            <button 
                                class="relative aspect-video bg-black/50 rounded overflow-hidden hover:ring-2 ring-primary"
                                on:click={() => handleVideoClick(video)}
                            >
                                <img 
                                    src={getThumbnailUrl(video)} 
                                    alt={video.title}
                                    class="w-full h-full object-cover"
                                />
                                <div class="absolute bottom-0 left-0 right-0 bg-black/50 p-2 text-sm text-white truncate">
                                    {video.title}
                                </div>
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Representative Content -->
            {#if content.filter(video => room?.representative_content?.includes(video.id)).length > 0}
                <div class="content-section">
                    <h2 class="text-xl font-semibold mb-4 text-white">Representative Content</h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {#each content.filter(video => room?.representative_content?.includes(video.id)) as video}
                            <button 
                                class="relative aspect-video bg-black/50 rounded overflow-hidden hover:ring-2 ring-primary"
                                on:click={() => handleVideoClick(video)}
                            >
                                <img 
                                    src={getThumbnailUrl(video)} 
                                    alt={video.title}
                                    class="w-full h-full object-cover"
                                />
                                <div class="absolute bottom-0 left-0 right-0 bg-black/50 p-2 text-sm text-white truncate">
                                    {video.title}
                                </div>
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    {:else}
        <div class="flex items-center justify-center h-full text-white">
            No content available
        </div>
    {/if}
</div>

<style>
    .content-selector {
        @apply p-4;
    }
    
    .loading, .error {
        @apply text-center py-8 text-white;
    }
    
    .error {
        @apply text-red-500;
    }

    .content-section:empty {
        @apply hidden;
    }
</style> 