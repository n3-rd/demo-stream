<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';
    import { currentVideoUrl, currentPdfUrl } from '$lib/callStores';
    import { sendMessage } from '$lib/helpers/sendMessage';

    export let isHost: boolean;
    export let isRepresentative: boolean;
    export let room: any;

    const dispatch = createEventDispatcher();

    let content = [];
    let loading = false;

    async function loadContent() {
        try {
            loading = true;
            const filterValue = encodeURIComponent(`(owner_company='${room.owner_company}')`);
            const response = await fetch(`${PUBLIC_POCKETBASE_INSTANCE}/api/collections/content_library/records?filter=${filterValue}`);
            const data = await response.json();
            content = data.items.map(item => ({
                ...item,
                type: item.library_type || ['host'] // Default to host if not specified
            }));
            console.log('Content loaded:', content);
        } catch (error) {
            console.error('Error loading content:', error);
        } finally {
            loading = false;
        }
    }

    // Filter content based on user role
    $: hostContent = content.filter(item => item.type.includes('host'));
    $: repContent = content.filter(item => item.type.includes('representative'));

    // Determine which content sections to show
    $: showHostContent = isHost || isRepresentative;
    $: showRepContent = isRepresentative;

    function handleMediaSelect(item: any) {
        console.log('Media selected:', item);
        
        // Clear both stores first
        currentVideoUrl.set('');
        currentPdfUrl.set('');
        
        const fileUrl = getFileUrl(item);
        const isVideo = item.file.endsWith('.mp4') || item.file.endsWith('.webm');
        const isPdf = item.file.endsWith('.pdf');
        
        if (isVideo) {
            dispatch('videoSelect', item);
            broadcastMediaUpdate('video_url_update', {
                videoUrl: fileUrl,
                fromHost: isHost,
                fromRepresentative: isRepresentative
            });
        } else if (isPdf) {
            currentPdfUrl.set(fileUrl);
            broadcastMediaUpdate('pdf_url_update', {
                fileUrl: fileUrl,
                fromHost: isHost,
                fromRepresentative: isRepresentative
            });
        }
    }

    function broadcastMediaUpdate(eventType: string, messageData: any) {
        if (!room?.id) return;
        
        const message = {
            eventType,
            messageBody: JSON.stringify(messageData)
        };
        
        try {
            console.log('Broadcasting media update:', {
                eventType,
                messageData,
                roomId: room.id
            });
            
            sendMessage(
                room.id,
                Date.now(),
                JSON.stringify(message),
                room.id
            );
        } catch (error) {
            console.error('Error broadcasting media update:', error);
        }
    }

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

    function getFileType(filename: string): string {
        if (filename.endsWith('.mp4') || filename.endsWith('.webm')) return 'video';
        if (filename.endsWith('.pdf')) return 'pdf';
        return 'unknown';
    }

    onMount(() => {
        loadContent();
    });
</script>

<div class="bg-[#47484b] p-4 rounded-lg pb-24">
    {#if showHostContent && hostContent.length > 0}
        <div class="mb-8">
            <h2 class="text-white text-lg font-semibold mb-4">Host Content</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {#each hostContent as item}
                    {@const fileType = getFileType(item.file)}
                    <button
                        class="relative aspect-video bg-black rounded-lg overflow-hidden hover:ring-2 hover:ring-white/50 transition-all"
                        on:click={() => handleMediaSelect(item)}
                    >
                        {#if fileType === 'video'}
                            {#if item.thumbnail}
                                <img
                                    src={getThumbnailUrl(item)}
                                    alt={item.title}
                                    class="w-full h-full object-cover"
                                />
                            {:else}
                                <div class="w-full h-full flex items-center justify-center text-white">
                                    Video
                                </div>
                            {/if}
                        {:else if fileType === 'pdf'}
                            <div class="w-full h-full flex items-center justify-center bg-red-600 text-white">
                                PDF
                            </div>
                        {/if}
                        <div class="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                            <p class="text-white text-sm truncate">{item.title}</p>
                        </div>
                    </button>
                {/each}
            </div>
        </div>
    {/if}

    {#if showRepContent && repContent.length > 0}
        <div>
            <h2 class="text-white text-lg font-semibold mb-4">Representative Content</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {#each repContent as item}
                    {@const fileType = getFileType(item.file)}
                    <button
                        class="relative aspect-video bg-black rounded-lg overflow-hidden hover:ring-2 hover:ring-white/50 transition-all"
                        on:click={() => handleMediaSelect(item)}
                    >
                        {#if fileType === 'video'}
                            {#if item.thumbnail}
                                <img
                                    src={getThumbnailUrl(item)}
                                    alt={item.title}
                                    class="w-full h-full object-cover"
                                />
                            {:else}
                                <div class="w-full h-full flex items-center justify-center text-white">
                                    Video
                                </div>
                            {/if}
                        {:else if fileType === 'pdf'}
                            <div class="w-full h-full flex items-center justify-center bg-red-600 text-white">
                                PDF
                            </div>
                        {/if}
                        <div class="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                            <p class="text-white text-sm truncate">{item.title}</p>
                        </div>
                    </button>
                {/each}
            </div>
        </div>
    {/if}

    {#if loading}
        <div class="text-center py-8 text-white">Loading content...</div>
    {/if}

    {#if !loading && content.length === 0}
        <div class="text-center py-8 text-white">No content available</div>
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