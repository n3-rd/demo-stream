<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { Button } from '$lib/components/ui/button';
    import { toast } from 'svelte-sonner';
    import { pickerOpen } from '../../store.js';
    import { get } from 'svelte/store';
    import { currentVideoUrl } from '$lib/callStores.js';
    import { playVideoStore } from '$lib/stores/playStore.js';
    import { PlayCircle } from 'lucide-svelte';

    export let callObject;

    let videoInput;
    let localVideoStream;
    let localAudioStream;
    let videoEl;
    $:{
        console.log('playVideoStore', $playVideoStore);
        if($playVideoStore && videoEl){
            videoEl.play();
        }
    }

    const videoURL = $currentVideoUrl;

    async function fetchVideoBlob(url) {
        const response = await fetch(url);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    }

    async function playLocalVideoFile(evt: Event) {
        videoEl = document.getElementById('local-vid') as HTMLVideoElement;
        if (!videoEl) {
            console.error('Video element not found');
            return;
        }
        let file = (evt.target as HTMLInputElement).files?.[0];
        if (!file) {
            console.error('No file selected');
            return;
        }
        let type = file.type;
        if (!videoEl.canPlayType(type)) {
            toast('Cannot play that file type');
            return;
        }
        videoEl.src = URL.createObjectURL(file);
        videoEl.volume = 0.01;
        await videoEl.play();
        await captureStream(videoEl);
        await shareVideo();
    }

    async function captureStream(videoEl: HTMLVideoElement) {
        try {
            let stream;
            if ('captureStream' in videoEl) {
                // For browsers that support captureStream (Chrome, Edge)
                stream = (videoEl as any).captureStream();
            } else if ('mozCaptureStream' in videoEl) {
                // For Firefox
                stream = (videoEl as any).mozCaptureStream();
            } else {
                // Fallback for other browsers
                stream = await createMediaStreamFromVideo(videoEl);
            }

            localVideoStream = new MediaStream(stream.getVideoTracks());
            localAudioStream = new MediaStream(stream.getAudioTracks());

            // Simulate hot reload effect
            await new Promise(resolve => setTimeout(resolve, 1000));
            await shareVideo();
        } catch (error) {
            console.error('Error capturing stream:', error);
            toast('Unable to capture video stream. This may be due to cross-origin restrictions.');
            // Fallback: try to create a stream from the video source
            await createStreamFromSource(videoEl.src);
        }
    }

    function createMediaStreamFromVideo(video: HTMLVideoElement): MediaStream {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        const fps = 30;

        const stream = canvas.captureStream(fps);
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(video);
        const destination = audioCtx.createMediaStreamDestination();
        source.connect(destination);

        stream.addTrack(destination.stream.getAudioTracks()[0]);

        setInterval(() => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }, 1000 / fps);

        return stream;
    }

    async function createStreamFromSource(src: string) {
        try {
            const response = await fetch(src);
            const blob = await response.blob();
            const mediaSource = new MediaSource();
            const video = document.createElement('video');
            video.src = URL.createObjectURL(mediaSource);
            
            await new Promise<void>((resolve) => {
                mediaSource.addEventListener('sourceopen', async () => {
                    const sourceBuffer = mediaSource.addSourceBuffer(blob.type);
                    const arrayBuffer = await blob.arrayBuffer();
                    sourceBuffer.appendBuffer(arrayBuffer);
                    resolve();
                });
            });

            await video.play();
            localVideoStream = new MediaStream(video.captureStream().getVideoTracks());
            localAudioStream = new MediaStream(video.captureStream().getAudioTracks());
            await shareVideo();
        } catch (error) {
            console.error('Error creating stream from source:', error);
            toast('Unable to share video. Please try a different file or source.');
        }
    }

    let isPaused = true;

    function togglePlay() {
        if (videoEl) {
            if (videoEl.paused) {
                videoEl.play();
            } else {
                videoEl.pause();
            }
            isPaused = videoEl.paused;
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
                });
                console.log('Screen share started successfully');
                
                // Retry mechanism
                retryCount = 0;
                checkVideoPlayback();
            } catch (error) {
                // console.error('Error starting screen share:', error);
                // toast('Failed to start screen share: ' + error.message);
            }
        } else {
            console.log('No video or audio stream available to share');
            toast('No video or audio stream available to share.');
        }
    }

    function checkVideoPlayback() {
        setTimeout(() => {
            const remoteVideos = document.querySelectorAll('video:not(#local-vid)');
            const allPlaying = Array.from(remoteVideos).every(video => !(video as HTMLVideoElement).paused);

            if (!allPlaying && retryCount < 1) { // Retry only once
                console.log(`Retry ${retryCount + 1}: Restarting screen share`);
                retryCount++;
                setTimeout(shareVideo, 1000); // Add a delay before retrying
            } else if (!allPlaying) {
                console.error('Failed to start video playback for all participants after retries');
                toast('Video playback issues. Please try refreshing the page.');
            }
        }, 2000);
    }

    function stopVideo() {
        videoEl = document.getElementById('local-vid');
        if (videoEl) {
            videoEl.pause();
            videoEl.src = '';
            if (localVideoStream) {
                localVideoStream.getTracks().forEach(track => track.stop());
                localVideoStream = null;
            }
            if (localAudioStream) {
                localAudioStream.getTracks().forEach(track => track.stop());
                localAudioStream = null;
            }
        }
        // Stop screen share
        callObject.stopScreenShare();

        // Reset the video input element to allow re-uploading the same file
        if (videoInput) {
            videoInput.value = '';
        }
    }

    function togglePicker() {
        pickerOpen.set(!get(pickerOpen));
    }

    function handleParticipantJoined(event) {
        console.log('Participant joined:', event.participant);
        shareVideo();
    }

    onMount(async () => {
        if (videoInput) {
            videoInput.addEventListener('change', playLocalVideoFile, false);
        }
        // Automatically play the video from the URL
        videoEl = document.getElementById('local-vid');
        const blobURL = videoURL;
        videoEl.src = blobURL;
        videoEl.volume = 0.01;
        await videoEl.play();
        await captureStream(videoEl);
        // pause and restart video from the start
        videoEl.pause();
        videoEl.currentTime = 0;

        // Subscribe to playVideoStore
        playVideoStore.subscribe(async (value) => {
            if (value && videoEl) {
                await videoEl.play();
            }
        });

        videoEl.addEventListener('play', () => isPaused = false);
        videoEl.addEventListener('pause', () => isPaused = true);

        // Add event listener for participant joined
        callObject.on('participant-joined', handleParticipantJoined);
    });

    onDestroy(() => {
        // Remove event listener when component is destroyed
        callObject.off('participant-joined', handleParticipantJoined);
    });

    $:{
        console.log('pickerOpen k', $pickerOpen);
    }

    // Add this line to control the visibility of the video picker popup
    let isVideoPickerVisible = false;

    // Add a function to toggle the video picker visibility
    function toggleVideoPicker() {
        isVideoPickerVisible = !isVideoPickerVisible;
    }
</script>

<div class="relative w-full h-full min-w-full h-full">
    <video
    crossOrigin="anonymous"
    id="local-vid" controls loop class="w-full h-full object-cover z-[30] absolute" volume="0.1"></video>

    {#if isPaused }
        <div class="absolute inset-0 flex items-center justify-center z-[31]">
            <button on:click={togglePlay} class="text-white opacity-80 hover:opacity-100 transition-opacity">
                <PlayCircle size={80} />
            </button>
        </div>
    {/if}

    {#if isVideoPickerVisible}
        <div class="video-picker-popup absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999]">
            <div class="bg-white p-4 rounded-lg shadow-lg w-full max-w-md">
             
                <input type="file" accept="video/*" on:change={playLocalVideoFile} class="mb-4" />
                <div class="flex justify-between">
                    <Button on:click={toggleVideoPicker}>Cancel</Button>
                    <Button on:click={() => {
                        toggleVideoPicker();
                        shareVideo();
                    }}>Share Video</Button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .video-picker-popup {
        backdrop-filter: blur(4px);
    }
</style>
