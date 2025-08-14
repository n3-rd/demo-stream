<script lang="ts">
	import { PUBLIC_ANT_MEDIA_URL } from '$env/static/public';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { createEventDispatcher } from 'svelte';
    
    export let participants;
    export let selfName: string = '';
    
console.log("participants from representative-indicator.svelte", participants);

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
        
        // Cookie fallback for selfName if not provided via prop
        if (!selfName) {
            try {
                const cookie = document.cookie.split('; ').find(c => c.startsWith('rep_user='));
                if (cookie) {
                    const value = decodeURIComponent(cookie.split('=')[1] || '');
                    const rep = JSON.parse(value);
                    if (rep && rep.name) selfName = rep.name;
                }
            } catch {}
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

    function extractNameFromId(id: string): string {
        const last = (id || '').toString().split('-').pop() || '';
        return last.replace(/_+representative$/i, '').replace(/_/g, ' ').trim() || 'Representative';
    }

    function isRepresentative(participant: any) {
        if (!participant) return false;
        if (typeof participant === 'string') {
            const suffix = (participant.toString().split('-').pop() || '');
            return /_representative$/i.test(suffix);
        }
        if (participant.isRepresentative !== undefined) return !!participant.isRepresentative;
        if (participant.name) return /_representative$/i.test(String(participant.name));
        if (participant.streamId) {
            const suffix = (String(participant.streamId).split('-').pop() || '');
            return /_representative$/i.test(suffix);
        }
        return false;
    }

    function getParticipantName(participant: any) {
        if (!participant) return 'Representative';
        if (typeof participant === 'string') return extractNameFromId(participant);
        if (participant.name) return String(participant.name).replace(/_+representative$/i, '');
        if (participant.streamName) return String(participant.streamName).replace(/_+representative$/i, '');
        if (participant.streamId) return extractNameFromId(String(participant.streamId));
        return 'Representative';
    }

    function normalizeName(value: string) {
        return (value || '').trim().toLowerCase();
    }

    function shouldShowIndicator(participant: any) {
        const participantName = getParticipantName(participant);
        if (!selfName) return true;
        return normalizeName(participantName) !== normalizeName(selfName);
    }

    $: visibleRepresentatives = (participants || []).filter((p: any) => isRepresentative(p) && shouldShowIndicator(p));

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
    {#key (typeof participant === 'string' ? participant : participant.streamId || participant.id)}
    <div class="representative-video">
        {#if typeof participant === 'string'}
            <iframe 
                src={`https://${PUBLIC_ANT_MEDIA_URL}/WebRTCAppEE/play.html?id=${encodeURIComponent(participant)}`} 
                frameborder="0" 
                allowfullscreen
            ></iframe>
        {:else}
            <iframe 
                src={`https://${PUBLIC_ANT_MEDIA_URL}/WebRTCAppEE/play.html?id=${encodeURIComponent(participant.streamId || participant.id)}`} 
                frameborder="0" 
                allowfullscreen
            ></iframe>
        {/if}
        <div class="name-tag">
            {getParticipantName(participant)} (Representative)
        </div>
    </div>
    {/key}
    {/each}
</div>
{/if}