<script lang="ts">
    import { onMount } from 'svelte';
    import { Button } from '$lib/components/ui/button';
    import { toast } from 'svelte-sonner';
    export let callObject;

    let videoInput;
    let localVideoStream;
    let localAudioStream;
    let showVideoPicker = false;

    function playLocalVideoFile(evt) {
        let videoEl = document.getElementById('local-vid');
        let file = evt.target.files[0];
        let type = file.type;
        if (!videoEl.canPlayType(type)) {
            toast('cannot play that file');
            return;
        }
        videoEl.src = URL.createObjectURL(file);
        videoEl.play().then(() => {
            if (typeof videoEl.mozCaptureStream == 'function') {
                localVideoStream = videoEl.mozCaptureStream();
            } else if (typeof videoEl.captureStream == 'function') {
                localVideoStream = videoEl.captureStream();
            }
            // Ensure the localVideoStream contains only video tracks
            if (localVideoStream) {
                const videoTracks = localVideoStream.getVideoTracks();
                localVideoStream = new MediaStream(videoTracks);
            }
            // Extract audio tracks separately
            const audioTracks = videoEl.captureStream().getAudioTracks();
            if (audioTracks.length > 0) {
                localAudioStream = new MediaStream(audioTracks);
                console.log('Audio tracks captured:', audioTracks);
                // Attach the audio stream to the video element
                videoEl.srcObject = new MediaStream([...videoEl.srcObject.getVideoTracks(), ...audioTracks]);
            } else {
                console.log('No audio tracks found');
            }
        }).catch(error => {
            console.error('Error playing video file:', error);
        });
    }

    async function shareVideo() {
        console.log('shareVideo() called');
        if (localVideoStream) {
            try {
                console.log('Combining video and audio streams');
                // Combine video and audio streams
                const combinedStream = new MediaStream([
                    ...localVideoStream.getVideoTracks(),
                    ...(localAudioStream ? localAudioStream.getAudioTracks() : [])
                ]);

                console.log('Starting screen share');
                await callObject.startScreenShare({
                    mediaStream: combinedStream,
                    videoSource: 'mediaStream',
                    audioSource: localAudioStream ? 'mediaStream' : false
                });
            } catch (error) {
                console.error('Error starting screen share:', error);
                toast('Failed to start screen share: ' + error.message);
            }
        } else {
            console.log('No video stream available to share');
            toast('No video stream available to share.');
        }
    }

    function stopVideo() {
        let videoEl = document.getElementById('local-vid');
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

    function toggleVideoPicker() {
        showVideoPicker = !showVideoPicker;
    }

    onMount(() => {
        if (videoInput) {
            videoInput.addEventListener('change', playLocalVideoFile, false);
        }
    });
</script>

<div class="video-picker-container z-[999]">
    <button class="toggle-button" on:click={toggleVideoPicker}>
        {showVideoPicker ? 'Hide Video Picker' : 'Show Video Picker'}
    </button>
    <div class="video-picker-popup" class:hide={!showVideoPicker}>
        <input bind:this={videoInput} id="vid-file-picker" type="file" accept="video/*" on:change={playLocalVideoFile} />
        <video id="local-vid" controls loop></video>
        <Button on:click={shareVideo}>Share video</Button>
        <Button on:click={stopVideo}>Stop video</Button>
    </div>
</div>

<style>
    .video-picker-container {
        position: absolute;
        top: 0;
        left: 0;
        margin: 10px;
    }
    .toggle-button {
        background-color: #007bff;
        color: white;
        border: none;
        padding: 10px;
        border-radius: 5px;
        cursor: pointer;
    }
    .video-picker-popup {
        background-color: white;
        border: 1px solid #ccc;
        border-radius: 5px;
        padding: 10px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        margin-top: 10px;
    }
    .video-picker-popup.hide {
        display: none;
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