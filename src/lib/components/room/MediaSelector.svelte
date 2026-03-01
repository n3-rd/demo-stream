<script lang="ts">
    import { run } from 'svelte/legacy';

    import { createEventDispatcher, onMount } from 'svelte';
    import { currentVideoUrl, currentPdfUrl, currentDocxUrl, currentImageUrl } from '$lib/callStores';
    import { sendMessage } from '$lib/helpers/sendMessage';
    import { normalizeContent } from '$lib/utils/content';

    interface Props {
        isHost: boolean;
        isRepresentative: boolean;
        room: any;
        roomName?: string;
        hostContentItems?: any[];
        repContentItems?: any[];
    }

    let {
        isHost,
        isRepresentative,
        room,
        roomName = '',
        hostContentItems = [],
        repContentItems = []
    }: Props = $props();

    const dispatch = createEventDispatcher();

    run(() => {
        if (import.meta.env.DEV) {
            console.log('MediaSelector props:', { isHost, isRepresentative, room, roomName, hostContentItems, repContentItemsLength: repContentItems?.length ?? 0 });
            console.log('is representative', isRepresentative);
            console.log('hostContentItems', hostContentItems);
            console.log('repContentItems', repContentItems);
        }
    });

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
    let hostContent = $derived(normalizeContent(hostContentItems)
        .filter(item => {
            const isIncluded = room?.host_content?.includes(item.id);
            return isIncluded;
        })
        .filter(item => isContentActive(item.id, true)));
        
    let repContent = $derived(normalizeContent(repContentItems)
        .filter(item => {
            const isIncluded = room?.representative_content?.includes(item.id);
            return isIncluded;
        })
        .filter(item => isContentActive(item.id, false)));

    run(() => {
        // Remove logging
        // console.log("hostContent", hostContent);
        // console.log("repContent", repContent);
    });

    // Determine which content sections to show
    let showHostContent = $derived(isHost);
    let showRepContent = $derived(isRepresentative);

    function handleMediaSelect(item) {
        // Determine file type based on database types
        const determineFileType = (content) => {
            const type = (content.type || '').toLowerCase();
            
            // Explicit type mapping based on database types
            const typeMap = {
                'document': 'docx',
                'video': 'video',
                'pdf': 'pdf',
                'image': 'image'
            };

            return typeMap[type] || 'unknown';
        };

        const fileType = determineFileType(item);

        // Dispatch the media select event with the correct file type
        dispatch('videoSelect', {
            ...item,
            type: fileType
        });
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
        
        // Use optimized streaming endpoint for videos
        const fileType = (file.type || '').toLowerCase();
        if (fileType === 'video') {
            console.log('filelog', file);
            return `${file.file}`;
        }
        
        console.log('filelog', file);

        // Use regular endpoint for other files
        return `${file.file}`;
    }

    function getThumbnailUrl(content: any) {
        if (content.thumbnail) {
            return `/api/files/${content.collectionId || content.collection || 'content_library'}/${content.id}/${content.thumbnail}`;
        }
        return '';
    }

    onMount(() => {
        // Content is now passed as props, so no need to load here
    });

    // Modify the getFirstHostContent method to be more robust
    export function getFirstHostContent() {
        try {
            // Normalize host content items
            const normalizedHostContent = normalizeContent(hostContentItems || []);

            // Filter content based on room's host content
            const filteredContent = normalizedHostContent.filter(item => {
                const isIncluded = room?.host_content?.includes(item.id);
                return isIncluded;
            });

            // Further filter active content
            const activeContent = filteredContent.filter(item => {
                const isActive = isContentActive(item.id, true);
                return isActive;
            });
            
            // Return the first active content item
            const firstItem = activeContent.length > 0 ? activeContent[0] : null;
            
            return firstItem;
        } catch (error) {
            console.error('Error getting first host content:', error);
            return null;
        }
    }

    // Update the rendering logic in the template
    function getMediaIcon(fileType) {
        switch (fileType) {
            case 'video':
                return '/icons/play.svg';
            case 'pdf':
                return '/icons/pdf.svg';
            case 'document':
                return '/icons/word.svg';
            case 'image':
                return '/icons/image.svg';
            default:
                return '/icons/media.svg';
        }
    }
</script>

<div class="bg-bgdefault md:p-4 pb-24">
    {#if showHostContent}
        <div class="mb-8">
            <h2 class="text-white text-lg font-semibold mb-4">Host Content</h2>
            {#if hostContent.length > 0}
                <div class="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {#each hostContent as item}
                        {@const fileType = (item.type || 'unknown').toLowerCase()}
                        <div class="flex flex-col gap-3">
                            <button
                            class="relative aspect-video bg-black overflow-hidden hover:ring-2 hover:ring-white/50 transition-all"
                            onclick={() => handleMediaSelect(item)}
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
                            {:else if fileType === 'document'}
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
                        {@const fileType = (item.type || 'unknown').toLowerCase()}
                        <button
                            class="relative aspect-video bg-black  overflow-hidden hover:ring-2 hover:ring-white/50 transition-all"
                            onclick={() => handleMediaSelect(item)}
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
                            {:else if fileType === 'document'}
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
                    {/each}
                </div>
            {:else}
                <div class="text-center py-4 text-white">No active representative content available</div>
            {/if}
        </div>
    {/if}

    {#if hostContent.length === 0 && repContent.length === 0}
        <div class="text-center py-8 text-white">No content available for this room</div>
    {/if}
</div>