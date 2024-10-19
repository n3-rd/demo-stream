<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { page } from '$app/stores';
  
    const dispatch = createEventDispatcher();
    
    export let isAuthenticated = false;
    
    let name = '';
    let isRepresentative = $page.url.searchParams.get('representativeId') !== null;
    let submitBtn: HTMLButtonElement;
  
    function handleSubmit() {
        if(isRepresentative) {
            submitBtn?.click();
        } else if (name.trim()) {
            dispatch('nameSubmitted', name.trim());
        }
    }
  
    onMount(() => {
        if (isRepresentative) {
            const representativeName = $page.url.searchParams.get('representativeName');
            name = decodeURIComponent(representativeName + ' (Representative)' || '');
            submitBtn?.click();
            dispatch('nameSubmitted', name.trim());
        }
    });
</script>
  
{#if !isAuthenticated && !isRepresentative}
    <div class="modal bg-black">
        <div class="modal-content">
            <h2>Enter your name</h2>
            <form on:submit|preventDefault={handleSubmit}>
                <input type="text" bind:value={name} placeholder="Your name" required>
                <button type="submit" bind:this={submitBtn}>Join Call</button>
            </form>
        </div>
    </div>
{/if}
  
<style>
    /* ... existing styles ... */
</style>
