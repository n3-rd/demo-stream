<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
  
    const dispatch = createEventDispatcher();
    
    export let isAuthenticated = false;
    
    let name = '';
    let isRepresentative = $page.url.searchParams.get('representativeId') !== null;
    let anonymousUser = $page.url.searchParams.get('anonymousUserId') !== null;
    console.log('anonymousUser', anonymousUser);
    let submitBtn: HTMLButtonElement;
    export let roomName;

  
    function handleSubmit() {
        if(isRepresentative) {
            submitBtn?.click();
        }
        else if (name.trim()) {
            dispatch('nameSubmitted', name.trim());
        }
        else {
            toast.error('Please enter your name');
        }
    }
  
    onMount(() => {
        if (isRepresentative) {
            const representativeName = $page.url.searchParams.get('representativeName');
            name = decodeURIComponent(representativeName + ' (Representative)' || '');
            submitBtn?.click();
            dispatch('nameSubmitted', name.trim());
        }
        else if(anonymousUser) {
           const anonymousUserId = $page.url.searchParams.get('anonymousUserId');
            name = decodeURIComponent(anonymousUserId || '');
            submitBtn?.click();
            dispatch('nameSubmitted', name.trim());
        }
    });
</script>

{#if !isAuthenticated && !isRepresentative}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div class="bg-white rounded-lg shadow-lg w-11/12 max-w-md p-8">
            <div class="text-center">
                <h2 class="text-2xl font-semibold text-gray-800 mb-2">Join {roomName}</h2>
                <p class="text-gray-600 mb-6">Enter your name to join the video call</p>
                <form on:submit|preventDefault={handleSubmit} class="space-y-6">
                    <div class="text-left">
                        <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                        <input 
                            type="text" 
                            id="name" 
                            bind:value={name} 
                            placeholder="e.g., John Doe" 
                            required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                    </div>
                    <button 
                        type="submit" 
                        bind:this={submitBtn}
                        disabled={!name.trim() || name.trim() == roomName}
                        class="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        Join Call
                    </button>
                </form>
            </div>
        </div>
    </div>
{/if}
