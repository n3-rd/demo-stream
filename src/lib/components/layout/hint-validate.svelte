<script lang="ts">
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
	{@render children?.()}
</div>
