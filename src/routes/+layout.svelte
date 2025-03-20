<script>import Header from '$lib/header/Header.svelte';
	import { Toaster, toast } from 'svelte-sonner';
import '../app.css';
import { navigating } from '$app/stores';</script>
<Toaster />

<!-- <Header></Header> -->

<!-- {#if $navigating}
  <div class="loader">
    <div class="spinner" />
  </div>
{/if} -->

<main>
	<slot></slot>
</main>

<style>
  .loader {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    z-index: 9999;
  }

  .spinner {
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, #ff3e00 0%, #40b3ff 50%, #ff3e00 100%);
    background-size: 200% 100%;
    animation: loading 1s infinite;
  }

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
</style>

