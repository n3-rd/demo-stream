<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    const hasRepSession = document.cookie.includes('rep_user=');
    const url = new URL(window.location.href);
    const repid = url.searchParams.get('repid');
    if (!hasRepSession && !repid) {
      goto('/representative/login');
    }
  });
</script>

<div style="min-height: 60vh; display: flex; align-items: center; justify-content: center; font-size: 2rem;">
  dashboard
</div> 