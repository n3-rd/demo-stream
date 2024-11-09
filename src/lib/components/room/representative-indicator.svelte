<script lang="ts">
	import { PUBLIC_ANT_MEDIA_URL } from '$env/static/public';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    
    export let participants;
    
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

    function isRepresentative(participant) {
        const participantName = participant.split('-').pop();
        return participantName && participantName.includes('Representative');
    }

    function shouldShowIndicator(participant) {
        const participantName = participant.split('-').pop();
        const representativeName = participantName?.replace('Representative', '') || '';
        return representativeName !== urlRepresentativeName;
    }

    $: visibleRepresentatives = participants.filter(p => isRepresentative(p) && shouldShowIndicator(p));

    // $: {
    //     console.log('Current videoElements:', videoElements);
    //     console.log('Visible representatives:', visibleRepresentatives);
    //     visibleRepresentatives.forEach(participant => {
    //         console.log(`Stream for ${participant}:`, videoElements.get(participant));
    //     });
    // }
</script>

{#if visibleRepresentatives.length > 0}
<div class="absolute bottom-0 right-24 top-[37%] z-50 flex items-center gap-3 pointer-events-none">
    {#each visibleRepresentatives as participant}
    <div class="relative h-32 w-52 rounded-lg overflow-hidden bg-black">
        <div class="video-container h-full w-full">
          
            <iframe class="w-full h-full" src={`https://${PUBLIC_ANT_MEDIA_URL}/WebRTCAppEE/play.html?id=${participant}`} frameborder="0" allowfullscreen></iframe>
        
        </div>
        <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm">
            {participant.split('-').pop().replace('Representative', ' (Representative)').replace(/_/g, ' ') || 'Unknown'}
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