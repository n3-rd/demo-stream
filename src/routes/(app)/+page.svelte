<script>
	import AvailableRooms from '$lib/components/layout/available-rooms.svelte';
	import Footer from '$lib/components/layout/footer.svelte';
	import Hero from '$lib/components/layout/hero.svelte';
	import HomeFaq from '$lib/components/layout/home-faq.svelte';
	export let data;
	const isLoggedIn = data.isLoggedIn;
	console.log('pagedata', data);
</script>

<div class="flex flex-col gap-8">
	<Hero {isLoggedIn} />
	<AvailableRooms />
	<HomeFaq />
	<Footer />
</div>
