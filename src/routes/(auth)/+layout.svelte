<script lang="ts">
	import { Toaster, toast } from 'svelte-sonner';
	import '../../app.css';

	let { data, children } = $props();
</script>

<Toaster />
{@render children?.()}
