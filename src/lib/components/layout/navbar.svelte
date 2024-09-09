<script lang="ts">
	import { page } from '$app/stores';
    import Sidebar from '$lib/components/layout/sidebar.svelte';
    import { Button } from '$lib/components/ui/button';
    export let loggedIn = false;
    let isMenuOpen = false;
	let pageData = $page.url;
    let isInMeeting: boolean;
	$:{
		console.log(pageData);
        isInMeeting = pageData.pathname.includes('demo');
	}

    function toggleMenu() {
        isMenuOpen = !isMenuOpen;
    }
</script>

{#if !isInMeeting}
<div class="navbar flex items-center justify-between bg-white px-4 py-4 md:px-9 md:py-7">
    <a class="logo" href="/">
        <img src="/logo/main-logo.svg" alt="clearsky" class="h-9 w-[131px]" />
    </a>

    <div class="hidden md:flex items-center gap-5 leading-5 [&>*]:font-semibold">
        <a href="/">Speak to Representative</a>
        <a href="/">Book an Appointment</a>
        <a href="/">Request A Quote</a>
        <a href="/">Ask a Question</a>
        <a href="/">Notes</a>
        {#if loggedIn}
            <a href="/profile">Profile</a>
        {/if}
    </div>

    <Button class="hidden md:block bg-[#ECEFF3] text-primary hover:text-white" href="/demo">
        Create a Demo
    </Button>

    <!-- Mobile Menu Button -->
    <button class="md:hidden" on:click={toggleMenu}>
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
        </svg>
    </button>
</div>

<!-- Mobile Menu -->
{#if isMenuOpen}
    <div class="md:hidden flex flex-col items-start bg-white px-4 py-4 space-y-2">
        <a href="/">Speak to Representative</a>
        <a href="/">Book an Appointment</a>
        <a href="/">Request A Quote</a>
        <a href="/">Ask a Question</a>
        <a href="/">Notes</a>
        {#if loggedIn}
            <a href="/profile">Profile</a>
        {/if}
        <Button class="bg-[#ECEFF3] text-primary hover:text-white" href="/demo">
            Create a Demo
        </Button>
    </div>
{/if}
{/if}
