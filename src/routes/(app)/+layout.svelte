<script>
	import Navbar from '$lib/components/layout/navbar.svelte';
	import { Toaster, toast } from 'svelte-sonner';
	import '../../app.css';
	import { afterNavigate, beforeNavigate, goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	let pageRoute = $page;
	let inRoom = false;

	afterNavigate((res)=>{
		// console.log('before navigate', res);
		pageRoute = $page;
		console.log('after navigate', pageRoute);
	})


$:{
	console.log('layout route', pageRoute);
	if(pageRoute.route.id === "/(app)/room/[roomId]"){
		inRoom = true;
	}
	else{
		inRoom = false;
	}
}
	export let data;

	const loggedIn = data.isLoggedIn;
	let user = data.user;
	let representatives = data.representatives;

	if (!loggedIn && browser) {
		toast.error('You must be logged in to access this page.');
		goto('/login');
	}
</script>
<Toaster />

<div class="div bg-bgfill">
	<Navbar {loggedIn} {user} {representatives} {inRoom} />
	<slot></slot>
</div>
