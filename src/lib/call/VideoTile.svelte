<script>
    import Controls from './Controls.svelte';
    import micOnIcon from './assets/mic_on.svg';
    import micOffIcon from './assets/mic_off.svg';
    import NoVideoPlaceholder from './NoVideoPlaceholder.svelte';
    import VideoStreamerTile from './VideoStreamerTile.svelte';
    import { Button } from '$lib/components/ui/button';

    export let participant;
    export let callObject;
    export let host = false;
    export let name;

    let videoTrackSet = false;
    let videoSrc;
    let isScreenSharing = false;

    $: videoTrack = participant?.tracks?.video;
    $: screenVideoTrack = participant?.tracks?.screenVideo;
    $: screenAudioTrack = participant?.tracks?.screenAudio;

    $: {
        if (screenVideoTrack?.state === 'playable') {
            isScreenSharing = true;
            videoSrc = new MediaStream([screenVideoTrack.persistentTrack]);
            if (screenAudioTrack?.state === 'playable') {
                videoSrc.addTrack(screenAudioTrack.persistentTrack);
            }
            videoTrackSet = true;
        } else if (videoTrack?.state === 'playable') {
            isScreenSharing = false;
            videoSrc = new MediaStream([videoTrack.persistentTrack]);
            videoTrackSet = true;
        } else {
            isScreenSharing = false;
            videoSrc = null;
            videoTrackSet = false;
        }
    }

    let audioTrackSet = false;
    let audioSrc;
    $: audioTrack = participant?.tracks?.audio;
    $: {
        if (audioTrack?.state === 'playable' && !audioTrackSet) {
            audioSrc = new MediaStream([audioTrack.persistentTrack]);
            audioTrackSet = true;
        }
    }

    function srcObject(node, stream) {
        node.srcObject = stream;
        return {
            update(newStream) {
                if (node.srcObject != newStream) {
                    node.srcObject = newStream;
                }
            }
        };
    }

    // Function to toggle screen sharing
    async function toggleScreenShare() {
        if (callObject) {
            try {
                if (isScreenSharing) {
                    console.log('Screen sharing active, stopping screen share');
                    await callObject.stopScreenShare();
                    
                    console.log('Restoring camera video');
                    // Use the Daily.co API to switch back to the camera
                    await callObject.setLocalVideo(true);
                } else {
                    console.log('Starting screen share');
                    await callObject.startScreenShare();
                }
                
                // Wait for a moment to allow the changes to propagate
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Update local state based on the new call state
                const participants = callObject.participants();
                const localParticipant = participants.local;
                
                isScreenSharing = !!localParticipant.screens[0];
                videoTrack = localParticipant.tracks.video;
                screenVideoTrack = localParticipant.tracks.screenVideo;
                
                // Force a re-evaluation of the reactive statement
                videoTrack = videoTrack;
                screenVideoTrack = screenVideoTrack;
            } catch (error) {
                console.error('Error toggling screen share:', error);
            }
        }
    }
</script>


<div class="video-tile">
    {#if !videoSrc}
        <NoVideoPlaceholder {participant} />
    {:else}
        <video
            id={`video-${participant?.session_id}`}
            class={isScreenSharing ? 'screen-share' : ''}
            autoPlay
            muted={participant?.local}
            playsInline
            use:srcObject={videoSrc}
        />
    {/if}

    {#if !participant?.video && !isScreenSharing}
        <NoVideoPlaceholder {participant} />
    {/if}

    {#if !participant?.local && audioSrc && !isScreenSharing}
        <audio id={`audio-${participant?.session_id}`} autoPlay playsInline use:srcObject={audioSrc}>
            <track kind="captions" />
        </audio>
    {/if}

    {#if participant?.video && !participant?.local && !isScreenSharing}
        <span class="audio-icon">
            <img src={participant?.audio ? micOnIcon : micOffIcon} alt="Toggle local audio" />
        </span>
    {/if}

    {#if participant?.local}
        <Controls {callObject} {isScreenSharing} {toggleScreenShare} />
        {#if host}
            <VideoStreamerTile {callObject} />
        {/if}
    {/if}

    <div class="participant-name">
        {participant?.user_name}
        {#if isScreenSharing}
            (Screen)
        {/if}
    </div>
</div>

<style>
    .video-tile {
        position: relative;
        flex: 1 1 350px;
        margin: 10px 20px;
        min-height: 100px;
        max-height: 350px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        overflow: hidden;
    }
    video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 8px;
    }
    video.screen-share {
        object-fit: contain;
    }
    .audio-icon {
        position: absolute;
        right: 0.5rem;
        bottom: 0.75rem;
        background-color: var(--dark-grey);
        padding: 0.5rem 0.5rem 0.25rem;
        border-radius: 50%;
        opacity: 0.8;
    }
    .participant-name {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        background-color: rgba(0, 0, 0, 0.5);
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.875rem;
    }
</style>