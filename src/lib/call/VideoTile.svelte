<script>
    import micOnIcon from './assets/mic_on.svg';
    import micOffIcon from './assets/mic_off.svg';
    import NoVideoPlaceholder from './NoVideoPlaceholder.svelte';
    import VideoStreamerTile from './VideoStreamerTile.svelte';
    import Controls from './Controls.svelte';
    import { onMount, onDestroy, tick } from 'svelte';

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
    $: screenTrack = participant?.tracks?.screenVideo;
    $: screenAudioTrack = participant?.tracks?.screenAudio;
    $: {
        if (screenTrack?.state === 'playable' && !videoTrackSet) {
            videoSrc = new MediaStream([screenTrack.track]);
            videoTrackSet = true;
        } else if (videoTrack?.state === 'playable' && !videoTrackSet) {
            videoSrc = new MediaStream([videoTrack.persistentTrack]);
            videoTrackSet = true;
        }
    }

    let audioTrackSet = false;
    let audioSrc;
    $: audioTrack = participant?.tracks?.audio;
    $: {
        if (screenAudioTrack?.state === 'playable' && !audioTrackSet) {
            audioSrc = new MediaStream([screenAudioTrack.track]);
            audioTrackSet = true;
        } else if (audioTrack?.state === 'playable' && !audioTrackSet) {
            audioSrc = new MediaStream([audioTrack.persistentTrack]);
            audioTrackSet = true;
        }
    }

    // Separate audio source for screen audio
    let screenAudioSrc;
    $: {
        if (screenAudioTrack?.state === 'playable') {
            screenAudioSrc = new MediaStream([screenAudioTrack.track]);
        } else {
            screenAudioSrc = null;
        }
    }

    let screenVideoSrc;
    $: {
        if (screen && screenTrack?.state === 'playable') {
            screenVideoSrc = new MediaStream([screenTrack.track]);
        }
    }

    // Reactive statement to constantly check for changes in screen video
    $: {
        if (screen && screenTrack?.state === 'playable') {
            screenVideoSrc = new MediaStream([screenTrack.track]);
        } else {
            screenVideoSrc = null;
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
                    videoSource: localVideoStream ? 'mediaStream' : false,
                    audioSource: localAudioStream ? 'mediaStream' : false,
                    systemAudio: 'include',
                    screenVideoSendSettings: 'motion-optimized',
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

    function handleTrackStarted(event) {
        const { track } = event;
        if (track.kind === 'video' && track.label.includes('screen')) {
            screenVideoSrc = new MediaStream([track]);
        }
    }

    function handleTrackStopped(event) {
        const { track } = event;
        if (track.kind === 'video' && track.label.includes('screen')) {
            screenVideoSrc = null;
        }
    }

    function handleScreenShareStarted(event) {
        console.log('Screen share started', event);
        if (event.participant.tracks.screenVideo) {
            videoSrc = new MediaStream([event.participant.tracks.screenVideo.track]);
        }
        if (event.participant.tracks.screenAudio) {
            audioSrc = new MediaStream([event.participant.tracks.screenAudio.track]);
        }
    }

    function handleScreenShareStopped(event) {
        console.log('Screen share stopped', event);
        if (event.participant.session_id === participant.session_id) {
            videoSrc = null;
            audioSrc = null;
        }
    }

    const updateParticipants = (e) => {
    console.log('[update participants]', e);
    if (!callObject) return;
    participants = Object.values(callObject.participants()).map(participant => {
        return {
            ...participant,
            isScreenSharing: participant.tracks.screenVideo?.state === 'playable'
        };
    });
};

    let retryCount = 0;
    const maxRetries = 3;

    async function setupVideo() {
        await tick();
        if (videoSrc && !participant?.local) {
            const video = document.getElementById(`video-${participant?.session_id}`);
            if (video) {
                video.srcObject = videoSrc;
                try {
                    await video.play();
                    retryCount = 0;
                } catch (error) {
                    console.error('Error playing video:', error);
                    if (retryCount < maxRetries) {
                        retryCount++;
                        setTimeout(setupVideo, 1000);
                    } else {
                        console.error('Failed to play video after retries');
                    }
                }
            }
        }
    }

    $: {
        if (videoSrc) {
            setupVideo();
        }
    }

    onMount(() => {
        callObject.on('track-started', handleTrackStarted);
        callObject.on('track-stopped', handleTrackStopped);
        callObject.on('screen-share-started', handleScreenShareStarted);
        callObject.on('screen-share-stopped', handleScreenShareStopped);
    });

    onDestroy(() => {
        callObject.off('track-started', handleTrackStarted);
        callObject.off('track-stopped', handleTrackStopped);
        callObject.off('screen-share-started', handleScreenShareStarted);
        callObject.off('screen-share-stopped', handleScreenShareStopped);
    });
</script>

<div class={screen ? 'video-tile screen' : 'video-tile max-h-96 rounded-lg'}>
    {#if audioSrc}
        <audio id={`audio-${participant?.session_id}`} autoPlay playsInline use:srcObject={audioSrc}>
            <track kind="captions" />
        </audio>
    {/if}

    {#if videoSrc}
        <video id={`video-${participant?.session_id}`} class="hidden" autoPlay playsInline use:srcObject={videoSrc}>
            <track kind="captions" />
        </video>
    {/if}

    {#if participant?.video && !participant?.local}
        <span class="audio-icon">
            <img src={participant?.audio ? micOnIcon : micOffIcon} alt="Toggle local audio" />
        </span>
    {/if}

    {#if participant?.local}
        <!-- <Controls {callObject} {screensList} {host} /> -->
        {#if host}
            <VideoStreamerTile {callObject} />
        {/if}
    {/if}

    <!-- {#if participant?.user_name}
        <div class="participant-name">{participant.user_name}</div>
    {/if} -->

    {#if participant.isScreenSharing}
        <video 
            autoplay 
            playsinline 
            use:srcObject={screenVideoSrc}
            class="screen-share-video"
        >
            <track kind="captions" />
        </video>
        {#if screenAudioSrc}
            <audio 
                autoplay 
                playsinline 
                use:srcObject={screenAudioSrc}
            >
                <track kind="captions" />
            </audio>
        {/if}
    {/if}
</div>

<style>
    .video-tile {
        position: relative;
        flex: 1 1 350px;
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
        height: 100%;
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