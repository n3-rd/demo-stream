<script lang="ts">
    import { onMount } from 'svelte';
    import { Button } from '$lib/components/ui/button';
    import { toast } from 'svelte-sonner';
    import * as Popover from "$lib/components/ui/popover";

    export let callObject;

    let videoInput;
    let localVideoStream;
    let localAudioStream;

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
            }
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
                    audioSource: localAudioStream ? 'mediaStream' : false,
                    systemAudio: 'include'
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

    onMount(() => {
        if (videoInput) {
            videoInput.addEventListener('change', playLocalVideoFile, false);
        }
    });
</script>

<Popover.Root>
    <Popover.Trigger>
        <div class="w-full absolute left-0 flex">
            <Button variant="outline" class="bg-white text-black hover:bg-gray-100 mb-2 z-[999]">
                Show Video Picker
            </Button>
        </div>
    </Popover.Trigger>
    <Popover.Content class="w-full bg-transparent shadow-none mt-4 border-none">
        <div class="video-picker-popup bg-white border border-gray-300 rounded-t-lg p-4 shadow-lg w-fit">
            <input bind:this={videoInput} id="vid-file-picker" type="file" accept="video/*" class="mb-2" on:change={playLocalVideoFile} />
            <video id="local-vid" controls loop class="w-full max-w-xs mb-2"></video>
            <div class="flex space-x-2">
                <Button on:click={shareVideo}>Share video</Button>
                <Button on:click={stopVideo}>Stop video</Button>
            </div>
        </div>
    </Popover.Content>
</Popover.Root>

<style>
    .video-picker-popup {
        background-color: white;
        border: 1px solid #ccc;
        border-radius: 5px;
        padding: 10px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        margin-top: 10px;
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