<script>import Header from '$lib/header/Header.svelte';
	import { Toaster, toast } from 'svelte-sonner';
import '../app.css';</script>
<Toaster />

<!-- <Header></Header> -->

<main>
	<slot></slot>
</main>

<footer>
	<p>
		visit <a target="_blank" rel="noreferrer noopenner" href="https://www.daily.co/blog/tag/svelte/">Daily's blog</a> to learn more
	</p>
</footer>
