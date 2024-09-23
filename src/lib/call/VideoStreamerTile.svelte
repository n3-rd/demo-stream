<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { Button } from '$lib/components/ui/button';
    import { toast } from 'svelte-sonner';
    import { pickerOpen } from '../../store.js';
    import { get } from 'svelte/store';
    import { currentVideoUrl } from '$lib/callStores.js';
    import { playVideoStore } from '$lib/stores/playStore.js';

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
        if (typeof videoEl.captureStream === 'function') {
            const stream = videoEl.captureStream();
            localVideoStream = new MediaStream(stream.getVideoTracks());
            localAudioStream = new MediaStream(stream.getAudioTracks());
            
            // Simulate hot reload effect
            await new Promise(resolve => setTimeout(resolve, 1000));
            await shareVideo();
        } else {
            console.error('captureStream is not supported in this browser');
            toast('Screen sharing is not supported in this browser');
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
            const allPlaying = Array.from(remoteVideos).every(video => !video.paused);

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

    onMount(async () => {
        if (videoInput) {
            videoInput.addEventListener('change', playLocalVideoFile, false);
        }
        // Automatically play the video from the URL
        videoEl = document.getElementById('local-vid');
        const blobURL = await fetchVideoBlob(videoURL);
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
    });

    $:{
        console.log('pickerOpen k', $pickerOpen);
    }
</script>

<div>
    <Button on:click={togglePicker} variant="outline" class="bg-white text-black hover:bg-gray-100 mb-2 z-[999] hidden">
        Show Video Picker
    </Button>
</div>

<div class="video-picker-popup bg-white border border-gray-300 rounded-t-lg p-4 shadow-lg w-fit top-[22rem] h-fit right-40 absolute left-0 z-[999]"
    style="display: {$pickerOpen ? 'block' : 'none'};">
    <video id="local-vid" controls loop class="w-full max-w-xs mb-2" volume="0.1"></video>
</div>

<style>
    .video-picker-popup {
        background-color: white;
        border: 1px solid #ccc;
        border-radius: 5px;
        padding: 10px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    video {
        width: 100%;
        max-width: 300px;
        margin-top: 10px;
    }
    button {
        margin-top: 10px;
    }
</style>