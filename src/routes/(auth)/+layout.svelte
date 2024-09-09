<script lang="ts">
	import { Toaster, toast } from 'svelte-sonner';
	import '../../app.css';

	export let data;
</script>

<Toaster />
<slot />
