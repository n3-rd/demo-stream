<script>
	import Navbar from '$lib/components/layout/navbar.svelte';
	import { Toaster, toast } from 'svelte-sonner';

	import '../../app.css';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	export let data;
	console.log(data)
	const loggedIn = data.isLoggedIn;
	let user = data.user;
	if (!loggedIn && browser) {
		toast.error('You must be logged in to access this page.');
		console.log('You must be logged in to access this page.');
		goto('/login');
	}
</script>
<Toaster />

<div class="div bg-bgfill">
	<Navbar {loggedIn} {user} />
	<slot></slot>
</div>
