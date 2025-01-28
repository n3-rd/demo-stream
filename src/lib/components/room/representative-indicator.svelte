<script lang="ts">
	import { PUBLIC_ANT_MEDIA_URL } from '$env/static/public';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    
    export let participants;
    
console.log("participants from representative-indicator.svelte", participants);

    let urlRepresentativeName: string;
    let videoElements = new Map();
    
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
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .fixed-indicator {
        position: absolute;
        bottom: 0;
        right: 10px;
        top: 37%;
        z-index: 50;
        display: flex;
        align-items: center;
        gap: 3px;
        pointer-events: none;
    }
</style>

{#if visibleRepresentatives.length > 0}
<div class="fixed-indicator">
    {#each visibleRepresentatives as participant}
    <div class="relative h-32 w-52 rounded-lg overflow-hidden bg-black">
        <div class="video-container h-full w-full">
            <iframe 
                class="w-full h-full" 
                src={`https://${PUBLIC_ANT_MEDIA_URL}/WebRTCAppEE/play.html?id=${participant}`} 
                frameborder="0" 
                allowfullscreen
            ></iframe>
        </div>
        <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm">
            {getParticipantName(participant)} (Representative)
        </div>
    </div>
    {/each}
</div>
{/if}