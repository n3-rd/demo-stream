<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { currentVideoUrl, currentPdfUrl, currentDocxUrl, currentImageUrl } from '$lib/callStores';
    import { sendMessage } from '$lib/helpers/sendMessage';

    export let isHost: boolean;
    export let isRepresentative: boolean;
    export let room: any;
    export let roomName: string = '';

    const dispatch = createEventDispatcher();

    let content = [] as Array<{
        id: string;
        title: string;
        description?: string;
        file: string; // blob id
        thumbnail?: string | null; // blob id
        active?: boolean;
        // DB columns
        type?: string; // 'video' | 'pdf' | 'docx' | 'image'
        library_type?: string[]; // roles
        // normalized fields for UI
        roles?: string[];
        fileKind?: string;
        collectionId?: string;
    }>;
    let loading = false;

    async function loadContent() {
        try {
            loading = true;

            // Load all content for this room's owner company via internal API
            if (room?.owner_company) {
                const response = await fetch(`/api/content-library?owner=${encodeURIComponent(room.owner_company)}`);
                if (response.ok) {
                    const data = await response.json();
                    content = (data.items || []).map((item: any) => ({
                        ...item,
                        roles: item.library_type || [],
                        fileKind: item.type || 'unknown',
                        collectionId: item.collectionId || 'content_library'
                    }));
                    return;
                }
            }
        } catch (error) {
            console.error('Error loading content:', error);
        } finally {
            loading = false;
        }
    }

    // Check if content is active in the room
    function isContentActive(contentId: string, forHost: boolean) {
        if (!room) return true; // Default to active if room not found
        const contentField = forHost ? 'host_content_active' : 'representative_content_active';
        if (!room[contentField] || room[contentField][contentId] === undefined) {
            return true;
        }
        return room[contentField][contentId];
    }

    // Filter content based on role and active status
    $: hostContent = content
        .filter(item => (item.roles || []).includes('host'))
        .filter(item => room?.host_content?.includes(item.id))
        .filter(item => isContentActive(item.id, true));
        
    $: repContent = content
        .filter(item => (item.roles || []).includes('representative'))
        .filter(item => room?.representative_content?.includes(item.id))
        .filter(item => isContentActive(item.id, false));

    // Determine which content sections to show
    $: showHostContent = isHost || isRepresentative;
    $: showRepContent = isRepresentative;

    function handleMediaSelect(item: any) {
        console.log('Media selected:', {
            item,
            isHost,
            isRepresentative,
            roomName,
            hasRoomId: !!room?.id
        });
        
        // Clear ALL stores first
        currentVideoUrl.set('');
        currentPdfUrl.set('');
        currentDocxUrl.set('');
        currentImageUrl.set('');
        
        const fileUrl = getFileUrl(item);
        const kind = (item.fileKind || '').toLowerCase();
        const isVideo = kind === 'video';
        const isPdf = kind === 'pdf';
        const isDocx = kind === 'docx' || kind === 'doc';
        const isImage = kind === 'image';
        
        console.log('File details:', {
            fileUrl,
            kind,
            isVideo,
            isPdf,
            isDocx,
            isImage,
            fileName: item.file
        });
        
        if (isImage) {
            currentImageUrl.set(fileUrl);
            broadcastMediaUpdate('image_url_update', {
                fileUrl: fileUrl,
                fromHost: isHost,
                fromRepresentative: isRepresentative
            });
        } else if (isVideo) {
            currentVideoUrl.set(fileUrl);
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
        } else if (isDocx) {
            currentDocxUrl.set(fileUrl);
            broadcastMediaUpdate('docx_url_update', {
                fileUrl: fileUrl,
                fromHost: isHost,
                fromRepresentative: isRepresentative
            });
        } else {
            // Unknown kind: default to trying video first
            currentVideoUrl.set(fileUrl);
            dispatch('videoSelect', item);
            broadcastMediaUpdate('video_url_update', {
                videoUrl: fileUrl,
                fromHost: isHost,
                fromRepresentative: isRepresentative
            });
        }
    }

    function broadcastMediaUpdate(eventType: string, messageData: any) {
        if (!room?.id) return;
        if (!roomName) {
            console.error('Room name is not available for broadcasting media update');
            return;
        }
        const message = { eventType, messageBody: JSON.stringify(messageData) };
        try {
            const targetRoom = roomName || room.id;
            sendMessage(targetRoom, Date.now(), JSON.stringify(message), targetRoom);
        } catch (error) {
            console.error('Error broadcasting media update:', error);
        }
    }

    function getFileUrl(file: any) {
        if (!file) return '';
        return `/api/files/${file.collectionId || file.collection || 'content_library'}/${file.id}/${file.file}`;
    }

    function getThumbnailUrl(content: any) {
        if (content.thumbnail) {
            return `/api/files/${content.collectionId || content.collection || 'content_library'}/${content.id}/${content.thumbnail}`;
        }
        return '';
    }

    onMount(() => {
        loadContent();
    });
</script>

<div class="bg-[#9D9D9F] p-4 rounded-lg pb-24">
    {#if showHostContent}
        <div class="mb-8">
            <h2 class="text-white text-lg font-semibold mb-4">Host Content</h2>
            {#if hostContent.length > 0}
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {#each hostContent as item}
                    {#if item.active}
                        {@const fileType = (item.fileKind || 'unknown').toLowerCase()}
                        <div class="flex flex-col gap-3">
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
                                    <div class="absolute inset-0 flex items-center justify-center shadow-lg">
                                        <img src="/icons/play.svg" alt="Play" class="w-10 h-10" />
                                    </div>
                                {:else}
                                    <div class="w-full h-full flex items-center justify-center text-white">
                                        Video
                                    </div>
                                {/if}
                            {:else if fileType === 'pdf'}
                                <div class="w-full h-full flex items-center justify-center bg-white text-white">
                                    <img src="/icons/pdf.svg" alt="PDF" class="w-[90px] h-[90px]" />
                                </div>
                            {:else if fileType === 'docx' || fileType === 'doc'}
                                <div class="w-full h-full flex items-center justify-center bg-blue-600 text-white">
                                    <img src="/icons/word.svg" alt="DOCX" class="w-[90px] h-[90px]" />
                                </div>
                            {:else if fileType === 'image'}
                                {#if item.thumbnail}
                                    <img
                                        src={getThumbnailUrl(item)}
                                        alt={item.title}
                                        class="w-full h-full object-cover"
                                    />
                                {:else}
                                    <img
                                        src={getFileUrl(item)}
                                        alt={item.title}
                                        class="w-full h-full object-cover"
                                    />
                                {/if}
                                <div class="absolute inset-0 flex items-center justify-center shadow-lg">
                                    <img src="/icons/image.svg" alt="View" class="w-10 h-10" />
                                </div>
                            {:else}
                                <div class="w-full h-full flex items-center justify-center text-white">
                                    Media
                                </div>
                            {/if}
                        </button>
                            
                            <p class="text-white text-sm truncate font-semibold">{item.title}</p>
                            
                        </div>
                        {/if}
                    {/each}
                </div>
            {:else}
                <div class="text-center py-4 text-white">No active host content available</div>
            {/if}
        </div>
    {/if}

    {#if showRepContent}
        <div>
            <h2 class="text-white text-lg font-semibold mb-4">Representative Content</h2>
            {#if repContent.length > 0}
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {#each repContent as item}
                    {#if item.active}
                        {@const fileType = (item.fileKind || 'unknown').toLowerCase()}
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
                            {:else if fileType === 'docx' || fileType === 'doc'}
                                <div class="w-full h-full flex items-center justify-center bg-blue-600 text-white">
                                    <img src="/icons/word.svg" alt="DOCX" class="w-[90px] h-[90px]" />
                                </div>
                            {:else if fileType === 'image'}
                                {#if item.thumbnail}
                                    <img
                                        src={getThumbnailUrl(item)}
                                        alt={item.title}
                                        class="w-full h-full object-cover"
                                    />
                                {:else}
                                    <img
                                        src={getFileUrl(item)}
                                        alt={item.title}
                                        class="w-full h-full object-cover"
                                    />
                                {/if}
                            {:else}
                                <div class="w-full h-full flex items-center justify-center text-white">
                                    Media
                                </div>
                            {/if}
                            <div class="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                                <p class="text-white text-sm truncate">{item.title}</p>
                            </div>
                        </button>
                        {/if}
                    {/each}
                </div>
            {:else}
                <div class="text-center py-4 text-white">No active representative content available</div>
            {/if}
        </div>
    {/if}

    {#if loading}
        <div class="text-center py-8 text-white">Loading content...</div>
    {/if}

    {#if !loading && content.length === 0}
        <div class="text-center py-8 text-white">No content available for this room</div>
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