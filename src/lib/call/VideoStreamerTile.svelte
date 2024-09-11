<script lang="ts">
    import { onMount } from 'svelte';
    import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
    export let callObject;

    let videoInput;
    let localVideoStream;
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
            // Ensure the localVideoStream contains both video and audio tracks
            if (localVideoStream) {
                const audioTracks = videoEl.captureStream().getAudioTracks();
                audioTracks.forEach(track => localVideoStream.addTrack(track));
            }
        });
    }

    async function shareVideo() {
        if (localVideoStream) {
            await callObject.startScreenShare({
                mediaStream: localVideoStream,
                displayMediaOptions: {
                    audio: true,
                    video: true
                }
            });
        } else {
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