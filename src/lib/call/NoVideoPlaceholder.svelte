<script>
	import { onMount } from 'svelte';
	import micOnIcon from './assets/mic_on.svg';
	import micOffIcon from './assets/mic_off.svg';

	export let participant;
	let displayName;
	$:{
		console.log('participant from placeholder',participant);
	}

	onMount(() => {
		// Use saved name in local storage as fall back if local username isn't available
		if (participant?.local) {
			const savedName = localStorage.getItem('DAILY_SVELTE_NAME');
			displayName = participant?.user_name || savedName || '';
		} else {
			displayName = participant?.user_name || '';
		}
	});
</script>

<div class="video-placeholder">
	<div class="participant flex flex-col gap-2 items-center">
		<img class="h-18 w-18 rounded-full" src={`https://ui-avatars.com/api/?name=${participant?.user_name}?background="#000000"`} alt="participant placeholder"/>
		<div class="name font-semibold">{displayName}</div>
		<img src={participant?.audio ? micOnIcon : micOffIcon} alt="Toggle local audio" />
	</div>

</div>

<style>
	.video-placeholder {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border-radius: 8px;
		background-color: var(--blue);
		z-index: 10;
		display: flex;
		justify-content: center;
		align-items: center;
		color: var(--white);
	}
	.name {
		margin-right: 0.75rem;
	}
</style>
