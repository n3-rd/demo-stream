<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    
    export let participants;
    export let callObject;

    let urlRepresentativeName: string;
    let currentUserSessionId: string;
    
    $: urlRepresentativeName = $page.url.searchParams.get('representativeName');

    onMount(() => {
        if (callObject) {
            callObject.on('participant-updated', updateParticipantVideo);
            currentUserSessionId = callObject.participants().local.session_id;
        }
    });

    function updateParticipantVideo(event) {
        const { participant } = event;
        if (isRepresentative(participant) && shouldShowIndicator(participant)) {
            const videoElement = document.getElementById(`video-${participant.session_id}`) as HTMLVideoElement;
            if (videoElement && participant.tracks.video.state === 'playable') {
                videoElement.srcObject = new MediaStream([participant.tracks.video.track]);
            }
        }
    }

    function isRepresentative(participant) {
        return participant.user_name && participant.user_name.includes('(Representative)');
    }

    function shouldShowIndicator(participant) {
        const representativeName = participant.user_name.replace(' (Representative)', '');
        return representativeName !== urlRepresentativeName && 
               participant.session_id !== currentUserSessionId;
    }

    $: visibleRepresentatives = participants.filter(p => isRepresentative(p) && shouldShowIndicator(p));
</script>

{#if visibleRepresentatives.length > 0}
<div class="absolute bottom-0 right-24 top-[37%] z-50 flex items-center gap-3 pointer-events-none">
    {#each visibleRepresentatives as participant}
    <div class="relative bg-red-500 h-32 w-52 rounded-lg overflow-hidden">
        <video 
            id={`video-${participant.session_id}`}
            autoplay
            playsinline
            muted
            class="w-full h-full object-cover object-center"
        >
            <track kind="captions" />
        </video>
        <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
            {participant.user_name || 'Unknown'}
        </div>
    </div>
    {/each}
</div>
{/if}
