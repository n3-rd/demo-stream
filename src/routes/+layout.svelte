<script>import Header from '$lib/header/Header.svelte';
	import { Toaster, toast } from 'svelte-sonner';
import '../app.css';</script>
<Toaster />

<!-- <Header></Header> -->

<main>
	<slot></slot>
</main>

