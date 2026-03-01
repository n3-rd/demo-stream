<script>
	import { run } from 'svelte/legacy';

	import Navbar from '$lib/components/layout/navbar.svelte';
	import { Toaster, toast } from 'svelte-sonner';
	import '../../app.css';
	import { afterNavigate, beforeNavigate, goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	let pageRoute = $state($page);
	let inRoom = $state(false);
	let isEmbedPage = $state(false);

	afterNavigate((res)=>{
		pageRoute = $page;
		console.log('after navigate', pageRoute);
	})

run(() => {
	console.log('layout route', pageRoute);
	if(pageRoute.route.id === "/(app)/room/[roomId]"){
		inRoom = true;
	}
	else{
		inRoom = false;
	}

	// Check if current page is an embed page
	isEmbedPage = pageRoute.url.pathname.includes('/embed');
});
	let { data, children } = $props();

	const loggedIn = data.isLoggedIn;
	let user = data.user;
	let representatives = data.representatives;

	// if (!loggedIn && browser) {
	// 	toast.error('You must be logged in to access this page.');
	// 	goto('/login');
	// }
</script>
<Toaster />

<div class="div bg-bgfill">
	{#if !isEmbedPage}
		<Navbar {loggedIn} {user} {representatives} {inRoom} />
	{/if}
	{@render children?.()}
</div>
