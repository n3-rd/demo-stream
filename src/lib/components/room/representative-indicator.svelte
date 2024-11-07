<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    
    export let participants;
    
    let urlRepresentativeName: string;
    let videoElements = new Map();
    
    // Add the srcObject directive
    function srcObject(node, stream) {
        node.srcObject = stream;
        return {
            update(newStream) {
                if (node.srcObject != newStream) {
                    node.srcObject = newStream;
                }
            },
        };
    }

    function isRepresentative(participant) {
        const participantName = participant.split('-').pop();
        return participantName && participantName.includes('Representative');
        
    }

    function shouldShowIndicator(participant) {
        const participantName = participant.split('-').pop();
        const representativeName = participantName.replace('Representative', ' ');
        return representativeName !== urlRepresentativeName;
    }

    $: visibleRepresentatives = participants.filter(p => isRepresentative(p) && shouldShowIndicator(p));

    onMount(() => {
        // Start camera for each representative
        visibleRepresentatives.forEach(async (participant) => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                videoElements.set(participant, stream);
                videoElements = videoElements; // Trigger Svelte reactivity
            } catch (err) {
                console.error('Error accessing camera for representative:', err);
            }
        });

        return () => {
            // Cleanup video streams when component is destroyed
            videoElements.forEach(stream => {
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
            });
        };
    });
</script>

{#if visibleRepresentatives.length > 0}
<div class="absolute bottom-0 right-24 top-[37%] z-50 flex items-center gap-3 pointer-events-none">
    {#each visibleRepresentatives as participant}
    <div class="relative bg-red-500 h-32 w-52 rounded-lg overflow-hidden">
        <div class="video-container h-full w-full">
           
                <video 
                    autoplay
                    playsinline
                    use:srcObject={videoElements.get(participant)}
                    class="w-full h-full object-cover"
                >
                    <track kind="captions" />
                </video>
            
        </div>
        <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
            {participant.split('-').pop().replace('Representative', ' (Representative)') || 'Unknown'}
        </div>
    </div>
    {/each}
</div>
{/if}

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
</style>