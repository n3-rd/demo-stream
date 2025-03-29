<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';
    import { currentVideoUrl, currentPdfUrl, currentDocxUrl } from '$lib/callStores';
    import { sendMessage } from '$lib/helpers/sendMessage';

    export let isHost: boolean;
    export let isRepresentative: boolean;
    export let room: any;
    export let roomName: string = '';

    const dispatch = createEventDispatcher();

    let content = [];
    let loading = false;

    async function loadContent() {
        try {
            loading = true;
            
            // First fetch the room with expanded content relations
            if (room?.id) {
                const roomResponse = await fetch(`${PUBLIC_POCKETBASE_INSTANCE}api/collections/rooms/records/${room.id}?expand=host_content,representative_content`);
                if (roomResponse.ok) {
                    const roomData = await roomResponse.json();
                    
                    // Update room with expanded content and active status
                    room = {
                        ...room,
                        host_content: roomData.host_content || [],
                        representative_content: roomData.representative_content || [],
                        host_content_active: roomData.host_content_active || {},
                        representative_content_active: roomData.representative_content_active || {},
                        expand: roomData.expand || {}
                    };
                    
                    console.log('Room data with content:', room);
                    
                    // If we have expanded content, use it directly
                    if (roomData.expand?.host_content?.length > 0 || roomData.expand?.representative_content?.length > 0) {
                        const hostContentItems = roomData.expand?.host_content || [];
                        const repContentItems = roomData.expand?.representative_content || [];
                        
                        // Combine and deduplicate content
                        content = [...hostContentItems, ...repContentItems]
                            .filter((item, index, self) => 
                                index === self.findIndex(t => t.id === item.id)
                            )
                            .map(item => ({
                                ...item,
                                type: item.library_type || ['host'] // Default to host if not specified
                            }));
                            
                        console.log('Content loaded from expanded room data:', content);
                        loading = false;
                        return;
                    }
                }
            }
            
            // Fallback: fetch all content for the company
            const filterValue = encodeURIComponent(`(owner_company='${room.owner_company}')`);
            const response = await fetch(`${PUBLIC_POCKETBASE_INSTANCE}api/collections/content_library/records?filter=${filterValue}`);
            const data = await response.json();
            content = data.items.map(item => ({
                ...item,
                type: item.library_type || ['host'] // Default to host if not specified
            }));
            console.log('Content loaded from company:', content);
            
        } catch (error) {
            console.error('Error loading content:', error);
        } finally {
            loading = false;
        }
    }

    // Check if content is active in the room
    function isContentActive(contentId, isHost) {
        if (!room) return true; // Default to active if room not found
        
        const contentField = isHost ? 'host_content_active' : 'representative_content_active';
        
        // If the field doesn't exist or the content isn't explicitly set to inactive, consider it active
        if (!room[contentField] || room[contentField][contentId] === undefined) {
            return true;
        }
        
        return room[contentField][contentId];
    }

    // Filter content based on user role and active status
    $: hostContent = content
        .filter(item => item.type.includes('host'))
        .filter(item => room?.host_content?.includes(item.id)) // Only show content that belongs to this room
        .filter(item => isContentActive(item.id, true));
        
    $: repContent = content
        .filter(item => item.type.includes('representative'))
        .filter(item => room?.representative_content?.includes(item.id)) // Only show content that belongs to this room
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
        
        const fileUrl = getFileUrl(item);
        const isVideo = item.file.endsWith('.mp4') || item.file.endsWith('.webm');
        const isPdf = item.file.endsWith('.pdf');
        const isDocx = item.file.endsWith('.docx') || item.file.endsWith('.doc');
        
        console.log('File details:', {
            fileUrl,
            isVideo,
            isPdf,
            isDocx,
            fileName: item.file
        });
        
        if (isVideo) {
            console.log('Setting video URL:', fileUrl);
            // Set the video URL directly in the store
            currentVideoUrl.set(fileUrl);
            // Also dispatch the event for backward compatibility
            dispatch('videoSelect', item);
            
            console.log('Broadcasting video update');
            broadcastMediaUpdate('video_url_update', {
                videoUrl: fileUrl,
                fromHost: isHost,
                fromRepresentative: isRepresentative
            });
        } else if (isPdf) {
            console.log('Setting PDF URL:', fileUrl);
            currentPdfUrl.set(fileUrl);
            
            console.log('Broadcasting PDF update');
            broadcastMediaUpdate('pdf_url_update', {
                fileUrl: fileUrl,
                fromHost: isHost,
                fromRepresentative: isRepresentative
            });
        } else if (isDocx) {
            console.log('Setting DOCX URL:', fileUrl);
            currentDocxUrl.set(fileUrl);
            
            console.log('Broadcasting DOCX update');
            broadcastMediaUpdate('docx_url_update', {
                fileUrl: fileUrl,
                fromHost: isHost,
                fromRepresentative: isRepresentative
            });
        }
    }

    function broadcastMediaUpdate(eventType: string, messageData: any) {
        if (!room?.id) return;
        
        // Ensure roomName is available
        if (!roomName) {
            console.error('Room name is not available for broadcasting media update');
            return;
        }
        
        const message = {
            eventType,
            messageBody: JSON.stringify(messageData)
        };
        
        try {
            console.log('Broadcasting media update:', {
                eventType,
                messageData,
                roomId: room.id,
                roomName
            });
            
            // Use roomName if available, otherwise fall back to room.id
            const targetRoom = roomName || room.id;
            
            sendMessage(
                targetRoom,
                Date.now(),
                JSON.stringify(message),
                targetRoom
            );
            
            console.log('Media update broadcast sent successfully');
        } catch (error) {
            console.error('Error broadcasting media update:', error);
        }
    }

    function getFileUrl(file: any) {
        if (!file) return '';
        return `${PUBLIC_POCKETBASE_INSTANCE}api/files/${file.collectionId}/${file.id}/${file.file}`;
    }

    function getThumbnailUrl(content: any) {
        if (content.thumbnail) {
            return `${PUBLIC_POCKETBASE_INSTANCE}api/files/${content.collectionId}/${content.id}/${content.thumbnail}`;
        }
        return ''; // Return a default thumbnail URL if needed
    }

    function getFileType(filename: string): string {
        if (filename.endsWith('.mp4') || filename.endsWith('.webm')) return 'video';
        if (filename.endsWith('.pdf')) return 'pdf';
        if (filename.endsWith('.docx') || filename.endsWith('.doc')) return 'docx';
        return 'unknown';
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
                        {@const fileType = getFileType(item.file)}
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
                            {:else if fileType === 'docx'}
                                <div class="w-full h-full flex items-center justify-center bg-blue-600 text-white">
                                    <img src="/icons/word.svg" alt="DOCX" class="w-[90px] h-[90px]" />
                                </div>
                            {/if}
                            
                        </button>
                            
                            <p class="text-white text-sm truncate font-semibold">{item.title}</p>
                            
                        </div>
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
                            {:else if fileType === 'docx'}
                                <div class="w-full h-full flex items-center justify-center bg-blue-600 text-white">
                                    <img src="/icons/word.svg" alt="DOCX" class="w-[90px] h-[90px]" />
                                </div>
                            {/if}
                            <div class="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                                <p class="text-white text-sm truncate">{item.title}</p>
                            </div>
                        </button>
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