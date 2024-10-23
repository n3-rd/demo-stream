<script>
    import micOnIcon from './assets/mic_on.svg';
    import micOffIcon from './assets/mic_off.svg';
    import NoVideoPlaceholder from './NoVideoPlaceholder.svelte';
    import VideoStreamerTile from './VideoStreamerTile.svelte';
    import Controls from './Controls.svelte';
    import { onMount, onDestroy, tick } from 'svelte';
    import { playVideoStore } from '$lib/stores/playStore.js';
    import { PlayCircle } from 'lucide-svelte';
    import Hls from 'hls.js';
	import { writable } from 'svelte/store';
	import { activeSpeaker, currentVideoUrl } from '$lib/callStores';

    export let participant;
    export let callObject;
    export let screen;
    export let screensList;
    export let host = false;
    export let name;
    export let roomId;
    

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
    let videoUrl;
    $: {
        videoUrl = $currentVideoUrl || `/static/video${roomId[0].associated_video}`;
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
        } else {
            screenVideoSrc = null;
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
    let isPlaying = false;

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
        console.log('shareVideo() called');
        if (localVideoStream && localAudioStream) {
            try {
                console.log('Starting screen share');
                const combinedStream = new MediaStream([
                    ...localVideoStream.getTracks(),
                    ...localAudioStream.getTracks()
                ]);
                await callObject.startScreenShare({
                    mediaStream: combinedStream,
                    videoTrackSettings: {
                        maxFramerate: 30,
                        maxBitrate: 3000000 // 3 Mbps
                    }
                });
                console.log('Screen share started successfully');
                
                // Notify other participants that a video is being shared
                callObject.sendAppMessage({ type: 'video-share-started' }, '*');
            } catch (error) {
                console.error('Error starting screen share:', error);
                toast('Failed to start screen share: ' + error.message);
            }
        } else {
            console.log('No video or audio stream available to share');
            toast('No video or audio stream available to share.');
        }
    }

    async function playVideo() {
        if (videoEl) {
            try {
                await videoEl.play();
                isPlaying = true;
                captureStream(videoEl).then(shareVideo);
                playVideoStore.set(true); // Update the store to trigger play in VideoStreamerTile
            } catch (error) {
                console.error('Error playing video:', error);
            }
        }
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
            videoSrc = new MediaStream([event.participant.tracks.screenVideo.persistentTrack]);
        }
        if (event.participant.tracks.screenAudio) {
            audioSrc = new MediaStream([event.participant.tracks.screenAudio.persistentTrack]);
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

    function handleActiveSpeakerChanged(event) {
        console.log('Active speaker changed:', event);
        activeSpeaker.set(event.activeSpeaker.peerId);
    }

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

    // New reactive statement to determine if the video should be displayed
    let shouldDisplayVideo;
    $: {
        shouldDisplayVideo = videoSrc && (!host || (host && $playVideoStore) || participant.isScreenSharing);
        console.log('shouldDisplayVideo', shouldDisplayVideo);
    }

    onMount(() => {
        callObject.on('track-started', handleTrackStarted);
        callObject.on('track-stopped', handleTrackStopped);
        callObject.on('screen-share-started', handleScreenShareStarted);
        callObject.on('screen-share-stopped', handleScreenShareStopped);
        callObject.on('participants-updated', updateParticipants);
        callObject.on('participant-left', updateParticipants);
        callObject.on('participant-joined', updateParticipants);
        callObject.on('active-speaker-change', handleActiveSpeakerChanged);

        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(videoUrl);
            hls.attachMedia(videoEl);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoEl.play();
            });
        } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
            videoEl.src = videoURL;
            videoEl.addEventListener('loadedmetadata', () => {
                videoEl.play();
            });
        }
    });

    onDestroy(() => {
        callObject.off('track-started', handleTrackStarted);
        callObject.off('track-stopped', handleTrackStopped);
        callObject.off('screen-share-started', handleScreenShareStarted);
        callObject.off('screen-share-stopped', handleScreenShareStopped);
        callObject.off('participants-updated', updateParticipants);
        callObject.off('participant-left', updateParticipants);
        callObject.off('participant-joined', updateParticipants);
    });
</script>

<div class={screen ? 'video-tile screen' : 'video-tile rounded-lg'} class:h-full={host}>
    {#if audioSrc && !participant?.local} <!-- Added condition to check if not local -->
        <audio id={`audio-${participant?.session_id}`} autoPlay playsInline use:srcObject={audioSrc}>
            <track kind="captions" />
        </audio>
    {/if}

    {#if participant?.local}
        {#if host}
            <VideoStreamerTile {callObject} />
        {/if}
    {/if}

    {#if shouldDisplayVideo }
        <!-- <video 
            id={`video-${participant?.session_id}`}
            playsInline 
            controls
            class={host ? 'host-video' : 'participant-video'}
            bind:this={videoEl}
        >
            <track kind="captions" />
        </video> -->

        <!-- {#if host && !$playVideoStore}
            <div class="play-button h-screen min-w-full absolute flex justify-center items-center z-[999]">
                <button on:click={() => playVideoStore.set(true)}>
                    <PlayCircle size={48} class="cursor-pointer" />
                </button>
            </div>
        {/if} -->
    {/if}

    {#if participant?.video && !participant?.local}
        <span class="audio-icon">
            <img src={participant?.audio ? micOnIcon : micOffIcon} alt="Toggle local audio" />
        </span>
    {/if}

    {#if participant.isScreenSharing && !participant?.local}
        <!-- <video 
            playsinline 
            use:srcObject={screenVideoSrc}
            class="screen-share-video"
        >
            <track kind="captions" />
        </video> -->
        {#if screenAudioSrc && host}
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
        /* max-height: 50vh; */
    }
    .host-video {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
    .participant-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 8px;
    }
    .screen-share-video {
        width: 100%;
        height: 100%;
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
    .play-button {
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 4rem;
        color: white;
        border-radius: 50%;
        padding: 1rem;
    }
</style>
