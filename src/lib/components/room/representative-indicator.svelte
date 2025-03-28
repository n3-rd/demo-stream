<script lang="ts">
	import { PUBLIC_ANT_MEDIA_URL } from '$env/static/public';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    
    export let participants;
    
console.log("participants from representative-indicator.svelte", participants);

    let urlRepresentativeName: string;
    let videoElements = new Map();
    
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let containerX = 10;
    let containerY = 10;
    let containerWidth = 200;
    let containerHeight = 150;
    let containerElement;
    let videoContainerElement;

    function getVideoContainer() {
        // Try to find the video container
        const container = document.querySelector('.video-container');
        if (container) return container;
        
        // Fallback to the parent element if container not found
        return containerElement?.parentElement;
    }

    function handleMouseDown(event) {
        // Don't initiate drag on iframes or name-tags
        if (event.target.tagName === 'IFRAME' || event.target.classList.contains('name-tag')) {
            return;
        }

        isDragging = true;
        startX = event.clientX - containerX;
        startY = event.clientY - containerY;
        
        // Set the z-index higher during drag for better visibility
        if (containerElement) {
            containerElement.style.zIndex = "100";
        }
        
        event.preventDefault();
    }

    function handleTouchStart(event) {
        // Don't initiate drag on iframes or name-tags
        if (event.target.tagName === 'IFRAME' || event.target.classList.contains('name-tag')) {
            return;
        }

        isDragging = true;
        startX = event.touches[0].clientX - containerX;
        startY = event.touches[0].clientY - containerY;
        
        // Set the z-index higher during drag for better visibility
        if (containerElement) {
            containerElement.style.zIndex = "100";
        }
        
        event.preventDefault();
    }

    function updatePosition(clientX, clientY) {
        if (!isDragging) return;

        // Get video container and its position
        videoContainerElement = getVideoContainer();
        if (!videoContainerElement) return;
        
        const videoRect = videoContainerElement.getBoundingClientRect();
        const containerRect = containerElement.getBoundingClientRect();
        
        // Calculate relative positions
        const relativeX = clientX - videoRect.left - startX;
        const relativeY = clientY - videoRect.top - startY;
        
        // Calculate max bounds, leaving small margin
        const maxX = videoRect.width - containerRect.width - 5;
        const maxY = videoRect.height - containerRect.height - 5;
        
        // Update position with bounds checking
        containerX = Math.max(5, Math.min(relativeX, maxX));
        containerY = Math.max(5, Math.min(relativeY, maxY));
    }

    function handleMouseMove(event) {
        if (isDragging) {
            updatePosition(event.clientX, event.clientY);
            event.preventDefault();
        }
    }

    function handleTouchMove(event) {
        if (isDragging) {
            updatePosition(event.touches[0].clientX, event.touches[0].clientY);
            event.preventDefault();
        }
    }

    function handleEnd() {
        isDragging = false;
        // Reset z-index after drag
        if (containerElement) {
            containerElement.style.zIndex = "50";
        }
    }

    // Update container dimensions based on the number of visible representatives
    $: {
        if (visibleRepresentatives) {
            const repCount = visibleRepresentatives.length;
            // Base height for each rep + padding
            containerHeight = repCount * 120;
        }
    }

    onMount(() => {
        // Let's wait for the DOM to be fully rendered
        setTimeout(() => {
            // Get reference to our container
            containerElement = document.querySelector('.representatives-container');
            videoContainerElement = getVideoContainer();
            
            // Initialize position in the top-right corner
            if (videoContainerElement && containerElement) {
                const videoRect = videoContainerElement.getBoundingClientRect();
                const containerRect = containerElement.getBoundingClientRect();
                
                // Initial position: top-right corner
                containerX = videoRect.width - containerRect.width - 20;
                containerY = 20;
            }
        }, 100);
        
        // Add event listeners
        window.addEventListener('mousemove', handleMouseMove, { passive: false });
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleEnd);
        
        // Cleanup
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleEnd);
        };
    });

    function srcObject(node, stream) {
        if (node && stream) {
            try {
                node.srcObject = stream;
                node.play().catch(err => console.error('Error playing video:', err));
            } catch (err) {
                console.error('Error setting srcObject:', err);
            }
        }
        
        return {
            update(newStream) {
                if (node && newStream && node.srcObject !== newStream) {
                    try {
                        node.srcObject = newStream;
                        node.play().catch(err => console.error('Error playing video:', err));
                    } catch (err) {
                        console.error('Error updating srcObject:', err);
                    }
                }
            },
            destroy() {
                if (node) {
                    node.srcObject = null;
                }
            }
        };
    }

    function isRepresentative(participant: any) {
        if (typeof participant === 'string') {
            return participant.includes('_representative');
        } else if (participant && participant.streamId) {
            return participant.streamId.includes('_representative');
        }
        return false;
    }

    function getParticipantName(participant: any) {
        if (typeof participant === 'string') {
            const nameWithoutPrefix = participant.split('-').pop() || '';
            return nameWithoutPrefix.replace(/_+representative/g, '');
        } else if (participant && participant.streamId) {
            const nameWithoutPrefix = participant.streamId.split('-').pop() || '';
            return nameWithoutPrefix.replace(/_+representative/g, '');
        }
        return 'Unknown User';
    }

    function shouldShowIndicator(participant: any) {
        const participantName = getParticipantName(participant);
        return participantName !== urlRepresentativeName;
    }

    $: visibleRepresentatives = participants.filter(p => isRepresentative(p) && shouldShowIndicator(p));

    onMount(async () => {
        // Get URL parameters
        const params = new URLSearchParams(window.location.search);
        urlRepresentativeName = params.get('representativeName');

        if (urlRepresentativeName) {
            // If this is a representative, request camera access
            try {
                const mediaConstraints = {
                    video: true,
                    audio: true
                };

                // Request camera access
                const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
                console.log('Camera access granted for representative');

                // The stream will be handled by the WebRTC adaptor in the main room component
            } catch (err) {
                console.error('Error accessing camera:', err);
            }
        }
    });

    $: {
        console.log('Participants:', participants);
        console.log('Visible Representatives:', visibleRepresentatives);
    }
</script>

<style>
    .video-container {
        position: relative;
     
    }
    
    .video-container video {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .representatives-container {
        position: absolute;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 8px;
        overflow: hidden;
        cursor: move;
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 4px;
        touch-action: none;
        z-index: 50;
        transition: transform 0.05s ease;
        user-select: none;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }

    .representatives-container:hover {
        background: rgba(0, 0, 0, 0.7);
    }

    .representative-video {
        position: relative;
        width: 100%;
        aspect-ratio: 16/9;
        border-radius: 4px;
        overflow: hidden;
        background: #000;
    }

    .name-tag {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 4px;
        font-size: 12px;
        text-align: center;
        pointer-events: none;
    }

    iframe {
        width: 100%;
        height: 100%;
        pointer-events: none;
        border: none;
    }
</style>

{#if visibleRepresentatives.length > 0}
<div 
    class="representatives-container"
    style="
        transform: translate({containerX}px, {containerY}px);
        width: {containerWidth}px;
        height: {containerHeight}px;
    "
    on:mousedown={handleMouseDown}
    on:touchstart={handleTouchStart}
    bind:this={containerElement}
>
    {#each visibleRepresentatives as participant}
    <div class="representative-video">
        <iframe 
            src={`https://${PUBLIC_ANT_MEDIA_URL}/WebRTCAppEE/play.html?id=${participant}`} 
            frameborder="0" 
            allowfullscreen
        ></iframe>
        <div class="name-tag">
            {getParticipantName(participant)} (Representative)
        </div>
    </div>
    {/each}
</div>
{/if}