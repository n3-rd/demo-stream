<script lag="ts">
    import { onMount } from 'svelte';
    export let callObject;

    let videoInput;
    let localVideoStream;

    function playLocalVideoFile(evt) {
        let videoEl = document.getElementById('local-vid');
        let file = evt.target.files[0];
        let type = file.type;
        if (!videoEl.canPlayType(type)) {
            alert('cannot play that file');
            return;
        }
        videoEl.src = URL.createObjectURL(file);
        videoEl.play().then(() => {
            if (typeof videoEl.mozCaptureStream == 'function') {
                localVideoStream = videoEl.mozCaptureStream();
            } else if (typeof videoEl.captureStream == 'function') {
                localVideoStream = videoEl.captureStream();
            }
        });
    }

    async function shareVideo() {
        if (localVideoStream) {
            await callObject.startScreenShare({ mediaStream: localVideoStream });
        } else {
            alert('No video stream available to share.');
        }
    }

    onMount(() => {
        videoInput = document.getElementById('vid-file-picker');
        videoInput.addEventListener('change', playLocalVideoFile, false);
    });
</script>

<div class="absolute bottom-0 right-0">
    <input id="vid-file-picker" type="file" accept="video/*" />
    <video id="local-vid" controls></video>
    <button on:click={shareVideo}>Share video through screenshare stream</button>
</div>

<style>
    video {
        width: 100%;
        max-width: 600px;
        margin-top: 10px;
    }
    button {
        margin-top: 10px;
    }
</style>