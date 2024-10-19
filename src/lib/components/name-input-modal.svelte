<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { page } from '$app/stores';
  
    const dispatch = createEventDispatcher();
    
    export let isAuthenticated = false;
    
    let name = '';
    let isRepresentative = $page.url.searchParams.get('representativeId') !== null;
  
    function handleSubmit() {
      if (name.trim()) {
        dispatch('nameSubmitted', name.trim());
      }
    }
  
    // If it's a representative, automatically submit
    if (isRepresentative) {
      const representativeName = $page.url.searchParams.get('representativeName');
      dispatch('nameSubmitted', decodeURIComponent(representativeName));
    }
  </script>
  
  {#if !isAuthenticated && !isRepresentative}
    <div class="modal bg-black">
      <div class="modal-content">
        <h2>Enter your name</h2>
        <form on:submit|preventDefault={handleSubmit}>
          <input type="text" bind:value={name} placeholder="Your name" required>
          <button type="submit">Join Call</button>
        </form>
      </div>
    </div>
  {/if}
  
  <style>
    /* ... existing styles ... */
  </style>
