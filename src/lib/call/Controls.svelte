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
	import { pickerOpen } from '../../store.js';
	import { Clapperboard, Video, VideoOff, Mic, MicOff, Monitor } from 'lucide-svelte';


	export let callObject;
	export let screensList;
	export let host;
	let browserSupport;
	let camOn;
	let micOn;

	$: disableScreenShare = screensList?.length > 0 && !screensList[0].local;

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
	const toggleScreenShare = () => {
		if (!callObject) return;

		/**
		 * If there's a live screen share and it's the local participant,
		 * toggle it off on button click. Otherwise, share screen.
		 */
		const isScreenSharing = screensList?.length > 0 && screensList[0].local;
		if (isScreenSharing) {
			callObject.stopScreenShare();
		} else {
			callObject.startScreenShare();
		}
	};
	const leaveCall = async () => {
		if (!callObject) return;
		await callObject.leave();
		await callObject.destroy();
		document?.body?.classList?.remove('in-call');
		
		goto(`/`);
	};

	const togglePicker = () => {
		pickerOpen.set(!$pickerOpen);
	};
</script>

<div class="controls-container w-full hidden">
    <div class="devices flex gap-3 items-center">
        <button on:click={toggleVideo}>
            <!-- <img src={camOn ? camOnIcon : camOffIcon} alt="Toggle local video" /> -->
			 {#if camOn}
			 <Video	color="#fff"/>
			 {:else}
			 <VideoOff color="#fff"/>
			 {/if}
        </button>
        <button on:click={toggleAudio}>
            <!-- <img src={micOn ? micOnIcon : micOffIcon} alt="Toggle local audio" color="#fff"/> -->
			 {#if micOn}
			 <Mic color="#fff"/>
			 {:else}
			 <MicOff color="#fff"/>
			 {/if}
        </button>
        {#if browserSupport?.supportsScreenShare}
            <button on:click={toggleScreenShare} disabled={disableScreenShare}>
                <!-- <img src={screenIcon} alt="Toggle screen share" color="#fff"/> -->
				<Monitor color="#fff"/>
            </button>
        {/if}
		
        <button
            on:click={() => {
                togglePicker();
            }}
        >
            <Clapperboard color="#fff" stroke-width="0.4" />
        </button>
    </div>
    <Button class="leave" on:click={leaveCall} variant="destructive">Leave Call</Button>
</div>


<style>
	img {
		height: 24px;
	}
	.controls-container {
		position: absolute;
		bottom: 5px;
		left: 8px;
		justify-content: space-between;
		/* display: flex; */
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
