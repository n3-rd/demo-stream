<script>
    import { onMount } from 'svelte';
    import daily from '@daily-co/daily-js';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import camOnIcon from './assets/vid_on.svg';
    import camOffIcon from './assets/vid_off.svg';
    import micOnIcon from './assets/mic_on.svg';
    import micOffIcon from './assets/mic_off.svg';
    import screenIcon from './assets/screen.svg';
    import leaveIcon from './assets/leave_call.svg';
    import { Button } from '$lib/components/ui/button';

    export let callObject;
    export let isScreenSharing;
    export let toggleScreenShare;

    let browserSupport;
    let camOn;
    let micOn;

    onMount(() => {
        if (browser) {
            browserSupport = daily?.supportedBrowser();
        }
        setLocalDevices();
    });
    const setLocalDevices = () => {
        if (!callObject) return;
        camOn = callObject.localVideo();
        micOn = callObject.localAudio();
    };
    const toggleVideo = () => {
        if (!callObject) return;
        const currentVid = callObject.localVideo();
        camOn = !currentVid;
        callObject.setLocalVideo(!currentVid);
    };
    const toggleAudio = () => {
        if (!callObject) return;
        const currentAudio = callObject.localAudio();
        micOn = !currentAudio;
        callObject.setLocalAudio(!currentAudio);
    };
    const leaveCall = async () => {
        if (!callObject) return;
        await callObject.leave();
        await callObject.destroy();
        document?.body?.classList?.remove('in-call');
        goto(`/`);
    };
</script>

<div class="controls-container">
    <div class="devices">
        <button on:click={toggleVideo}>
            <img src={camOn ? camOnIcon : camOffIcon} alt="Toggle local video" />
        </button>
        <button on:click={toggleAudio}>
            <img src={micOn ? micOnIcon : micOffIcon} alt="Toggle local audio" />
        </button>
        <!-- Only show the screen share button if the browser actually supports it -->
        {#if browserSupport?.supportsScreenShare}
            <button on:click={toggleScreenShare}>
                <img src={screenIcon} alt={isScreenSharing ? "Stop screen share" : "Start screen share"} />
            </button>
        {/if}
    </div>
    <!-- End call locally and return to home screen -->
    <Button class="leave" on:click={leaveCall} variant="destructive" >
        <img src={leaveIcon} alt="Leave call" />
    </Button>
</div>

<style>
    img {
        height: 24px;
    }
    .controls-container {
        position: absolute;
        bottom: 40px;
        left: 8px;
        justify-content: space-between;
        display: flex;
        width: calc(100% - 16px);
        z-index: 20;
    }
    .devices {
        border-radius: 12px;
        background-color: var(--dark-blue);
        opacity: 0.85;
        padding: 14px 10px 15px;
    }
    button {
        background-color: transparent;
        border: none;
        cursor: pointer;
    }
    button.leave {
        background-color: var(--red);
        opacity: 0.85;
        padding: 14px 16px 15px;
        border-radius: 12px;
    }
    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>