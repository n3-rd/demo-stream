<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    // Auto-redirect to login for 401 errors after 3 seconds
    onMount(() => {
        if ($page.status === 401) {
            const timer = setTimeout(() => {
                goto('/login');
            }, 3000);
            return () => clearTimeout(timer);
        }
    });
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-2xl w-full space-y-8 text-center">
        {#if $page.status === 401}
            <div class="space-y-4">
                <h1 class="text-4xl font-bold text-gray-900">Unauthorized Access</h1>
                <p class="text-lg text-gray-600">You need to be logged in to access this page.</p>
                <p class="text-sm text-gray-500">Redirecting to login page in 3 seconds...</p>
                <button 
                    on:click={() => goto('/login')}
                    class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50"
                >
                    Go to Login
                </button>
            </div>
        {:else}
            <div class="space-y-4">
                {#if $page.status === 404}
                    <h1 class="text-4xl font-bold text-gray-900">Page under development</h1>
                    <p class="text-lg text-gray-600">This page is under development. Please check back soon.</p>
                {:else}
                    <h1 class="text-4xl font-bold text-gray-900">Error {$page.status}</h1>
                {/if}
                <p class="text-lg text-gray-600">{$page.error?.message || 'An error occurred'}</p>
                <button 
                    on:click={() => goto('/')}
                    class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Go Home
                </button>
            </div>
        {/if}
    </div>
</div> 