<script lang="ts">
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
</script>

<div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
	<slot />
</div>
