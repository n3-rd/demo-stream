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
        return participant.isRepresentative || 
               (participant.metaData && JSON.parse(participant.metaData).isRepresentative) ||
               (participant.streamId && participant.streamId.includes('Representative'));
    }

    function getParticipantName(participant) {
        try {
            if (participant.metaData) {
                const metadata = JSON.parse(participant.metaData);
                if (metadata.name) return metadata.name;
            }
            
            if (participant.streamName) {
                return participant.streamName.replace(/_/g, ' ');
            }
            
            if (participant.streamId) {
                const parts = participant.streamId.split('-');
                if (parts.length > 1) {
                    return parts[parts.length - 1].replace(/_/g, ' ').replace('Representative', '');
                }
            }
            
            if (participant.name) {
                return participant.name;
            }
            
            return 'Guest User';
        } catch (e) {
            console.error('Error parsing participant name:', e);
            return 'Guest User';
        }
    }

    function shouldShowIndicator(participant) {
        const participantName = getParticipantName(participant);
        return participantName !== urlRepresentativeName;
    }

    $: visibleRepresentatives = participants.filter(p => isRepresentative(p) && shouldShowIndicator(p));

    $: {
        console.log('Participants:', participants);
        console.log('Visible Representatives:', visibleRepresentatives);
    }
</script>

{#if visibleRepresentatives.length > 0}
<div class="absolute bottom-0 right-10 top-[37%] md:right-24 md:top-[37%] z-50 flex items-center gap-3 pointer-events-none">
    {#each visibleRepresentatives as participant}
    <div class="relative h-32 w-52 rounded-lg overflow-hidden bg-black">
        <div class="video-container h-full w-full">
            <iframe class="w-full h-full" src={`https://${PUBLIC_ANT_MEDIA_URL}/WebRTCAppEE/play.html?id=${participant.streamId}`} frameborder="0" allowfullscreen></iframe>
        </div>
        <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm">
            {getParticipantName(participant)} {isRepresentative(participant) ? '(Representative)' : ''}
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