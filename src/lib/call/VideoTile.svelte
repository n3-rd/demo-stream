<script>
    import Controls from './Controls.svelte';
    import micOnIcon from './assets/mic_on.svg';
    import micOffIcon from './assets/mic_off.svg';
    import NoVideoPlaceholder from './NoVideoPlaceholder.svelte';
    import VideoStreamerTile from './VideoStreamerTile.svelte';

    export let participant;
    export let callObject;
    export let screen;
    export let screensList;
    export let host = false;
    export let name;

    let videoTrackSet = false;
    let videoSrc;
    $: videoTrack = participant?.tracks?.video;
    $: screenTrack = screen?.tracks?.screenVideo;
    $: screenAudioTrack = screen?.tracks?.screenAudio;
    $: {
        if (!screen && videoTrack?.state === 'playable' && !videoTrackSet) {
            videoSrc = new MediaStream([videoTrack.persistentTrack]);
            videoTrackSet = true;
        } else if (screen && screenTrack?.state === 'playable' && !videoTrackSet) {
            videoSrc = new MediaStream([screenTrack.track, audioTrack.track]);
            videoTrackSet = true;
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
</script>

<div class={screen ? 'video-tile screen' : 'video-tile'}>
    {#if !videoSrc}
        <NoVideoPlaceholder {participant} />
    {:else}
        <video
            id={`video-${participant?.session_id || screen?.session_id}`}
            autoPlay
            muted
            playsInline
            use:srcObject={videoSrc}
        />
    {/if}

    {#if !participant?.video && (!screen || screen?.length === 0)}
        <NoVideoPlaceholder {participant} />
    {/if}

    {#if !participant?.local && audioSrc}
        <audio id={`audio-${participant?.session_id}`} autoPlay playsInline use:srcObject={audioSrc}>
            <track kind="captions" />
        </audio>
    {/if}

    {#if participant?.video && !participant?.local}
        <span class="audio-icon">
            <img src={participant?.audio ? micOnIcon : micOffIcon} alt="Toggle local audio" />
        </span>
    {/if}

    {#if participant?.local}
        <Controls {callObject} {screensList} />
        {#if host}
            <VideoStreamerTile {callObject} />
        {/if}
    {/if}

    <div class="participant-name">{name}</div>
</div>

<style>
    .video-tile {
        position: relative;
        flex: 1 1 350px;
        margin: 10px 20px;
        min-height: 100px;
        display: flex;
    }
    .video-tile.screen {
        flex: 0;
        max-height: 50vh;
    }
    video {
        width: 100%;
        border-radius: 8px;
    }
    .screen video {
        max-height: inherit;
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