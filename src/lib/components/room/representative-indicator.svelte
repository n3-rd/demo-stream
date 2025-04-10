<script lang="ts">
	import { PUBLIC_ANT_MEDIA_URL } from '$env/static/public';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { createEventDispatcher } from 'svelte';
    
    export let participants;
    
console.log("participants from representative-indicator.svelte", participants);

    let urlRepresentativeName: string;
    let videoElements = new Map();
    
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let containerX = 0;
    let containerY = 0;
    let containerWidth = 200;
    let containerHeight = 150;
    let containerElement;
    let videoContainerElement;

    const dispatch = createEventDispatcher();

    function getVideoContainer() {
        const container = document.querySelector('.video-container');
        if (!container) {
            console.error('Video container not found');
        }
        return container;
    }

    function handleMouseDown(event) {
        if (event.target.tagName === 'IFRAME' || event.target.classList.contains('name-tag')) {
            return;
        }
        
        isDragging = true;
        startX = event.clientX - containerX;
        startY = event.clientY - containerY;
        event.preventDefault();
    }

    function updatePosition(clientX, clientY) {
        if (!isDragging || !videoContainerElement || !containerElement) return;

        const videoRect = videoContainerElement.getBoundingClientRect();
        const containerRect = containerElement.getBoundingClientRect();
        
        let newX = clientX - videoRect.left - startX;
        let newY = clientY - videoRect.top - startY;
        
        newX = Math.max(0, Math.min(newX, videoRect.width - containerRect.width));
        newY = Math.max(0, Math.min(newY, videoRect.height - containerRect.height));
        
        containerX = newX;
        containerY = newY;
    }

    function handleMouseMove(event) {
        if (isDragging) {
            updatePosition(event.clientX, event.clientY);
            event.preventDefault();
        }
    }

    function handleEnd() {
        isDragging = false;
    }

    $: if (visibleRepresentatives && videoContainerElement && containerElement) {
        containerHeight = Math.min(150, visibleRepresentatives.length * 120 + 8);
        
        const videoRect = videoContainerElement.getBoundingClientRect();
        
        containerX = videoRect.width - containerWidth - 20;
        containerY = videoRect.height - containerHeight - 20;
    }

    onMount(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleEnd);
        
        setTimeout(() => {
            containerElement = document.querySelector('.representatives-container');
            videoContainerElement = getVideoContainer();
            
            if (videoContainerElement && containerElement) {
                const videoRect = videoContainerElement.getBoundingClientRect();
                
                containerX = videoRect.width - containerWidth - 20;
                containerY = videoRect.height - containerHeight - 20;
                
                console.log("Initial positioning:", { containerX, containerY, 
                    videoWidth: videoRect.width, videoHeight: videoRect.height });
            } else {
                console.error("Could not find required elements for positioning");
            }
        }, 200);
        
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(() => {
                if (videoContainerElement && containerElement) {
                    const videoRect = videoContainerElement.getBoundingClientRect();
                    
                    if (containerX + containerWidth > videoRect.width) {
                        containerX = Math.max(0, videoRect.width - containerWidth - 20);
                    }
                    
                    if (containerY + containerHeight > videoRect.height) {
                        containerY = Math.max(0, videoRect.height - containerHeight - 20);
                    }
                }
            });
            
            setTimeout(() => {
                if (videoContainerElement) {
                    resizeObserver.observe(videoContainerElement);
                }
            }, 300);
        }
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleEnd);
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
        left: {containerX}px;
        top: {containerY}px;
        width: {containerWidth}px;
        height: {containerHeight}px;
    "
    on:mousedown={handleMouseDown}
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