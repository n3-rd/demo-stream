<script>
    import micOnIcon from './assets/mic_on.svg';
    import micOffIcon from './assets/mic_off.svg';
    import NoVideoPlaceholder from './NoVideoPlaceholder.svelte';
    import VideoStreamerTile from './VideoStreamerTile.svelte';
    import Controls from './Controls.svelte';
    import { onMount } from 'svelte';

    export let participant;
    export let callObject;
    export let screen;
    export let screensList;
    export let host = false;
    export let name;
    export let videoURL;

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
            videoSrc = new MediaStream([screenTrack.track]);
            videoTrackSet = true;
        }
    }

    let audioTrackSet = false;
    let audioSrc;
    $: audioTrack = participant?.tracks?.audio;
    $: {
        if (audioTrack?.state === 'playable' && !audioTrackSet && !host) {
            audioSrc = new MediaStream([audioTrack.persistentTrack]);
            audioTrackSet = true;
        }
    }

    // Separate audio source for screen audio
    let screenAudioSrc;
    $: {
        if (screen && screenAudioTrack?.state === 'playable' && !host) {
            screenAudioSrc = new MediaStream([screenAudioTrack.track]);
        } else {
            screenAudioSrc = null;
        }
    }

    let screenVideoSrc;
    $: {
        if (screen && screenTrack?.state === 'playable' && !videoTrackSet) {
            screenVideoSrc = new MediaStream([screenTrack.track]);
            videoTrackSet = true;
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

    let videoEl;
    let localVideoStream;
    let localAudioStream;

    async function captureStream(videoEl) {
        if (typeof videoEl.captureStream == 'function') {
            localVideoStream = videoEl.captureStream();
        }
        const videoTracks = localVideoStream.getVideoTracks();
        localVideoStream = new MediaStream(videoTracks);
        const audioTracks = videoEl.captureStream().getAudioTracks();
        if (audioTracks.length > 0) {
            localAudioStream = new MediaStream(audioTracks);
        }
    }

    async function shareVideo() {
        if (localVideoStream) {
            try {
                const combinedStream = new MediaStream([
                    ...localVideoStream.getVideoTracks(),
                    ...(localAudioStream ? localAudioStream.getAudioTracks() : [])
                ]);
                await callObject.startScreenShare({
                    mediaStream: combinedStream,
                    videoSource: 'mediaStream',
                    audioSource: localAudioStream ? 'mediaStream' : false,
                    systemAudio: 'include'
                });
            } catch (error) {
                console.error('Error starting screen share:', error);
            }
        }
    }

    $: if (host && videoEl && videoURL) {
        videoEl.src = videoURL;
        videoEl.play().then(() => {
            captureStream(videoEl).then(shareVideo);
        });
    }
</script>

<div class={screen ? 'video-tile screen hidden' : 'video-tile max-h-96 rounded-lg'}>
    <!-- {#if host}
        <video 
            bind:this={videoEl}
            controls
            class="w-full h-auto"
        ></video>
    {:else}
       
        <video 
            autoplay
            playsInline
            class="w-full h-auto"
        ></video>
    {/if} -->

    {#if !participant?.local && audioSrc}
        <audio id={`audio-${participant?.session_id}`} autoPlay playsInline use:srcObject={audioSrc} muted={host}>
            <track kind="captions" />
        </audio>
    {/if}

    {#if screenAudioSrc}
        <audio id={`screen-audio-${screen?.session_id}`} autoPlay playsInline use:srcObject={screenAudioSrc} muted={host}>
            <track kind="captions" />
        </audio>
    {/if}

    {#if screenVideoSrc}
        <video id={`screen-video-${screen?.session_id}`} autoPlay playsInline use:srcObject={screenVideoSrc} muted={host}>
            <!-- <track kind="captions" /> -->
        </video>
    {/if}

    {#if videoSrc}
        <video id={`video-${participant?.session_id}`} autoPlay playsInline use:srcObject={videoSrc} muted={host}>
            <track kind="captions" />
        </video>
    {/if}

    <!-- {#if !participant?.video && (!screen || screen?.length === 0)}
        <NoVideoPlaceholder {participant} />
    {/if} -->

    {#if participant?.video && !participant?.local}
        <span class="audio-icon">
            <img src={participant?.audio ? micOnIcon : micOffIcon} alt="Toggle local audio" />
        </span>
    {/if}

    {#if participant?.local}
        <Controls {callObject} {screensList} {host} />
        {#if host}
            <VideoStreamerTile {callObject} />
        {/if}
    {/if}

    {#if participant?.user_name}
        <div class="participant-name">{participant.user_name}</div>
    {/if}
</div>

<style>
    .video-tile {
        position: relative;
        flex: 1 1 350px;
        /* margin: 10px 20px; */
        /* min-height: 100px; */
        flex-direction: column;
        justify-content: center;
        align-items: center;
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
        max-height: 50vh;
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