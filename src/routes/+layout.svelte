<!-- @migration task: review uses of `navigating` -->
<script>import Header from '$lib/header/Header.svelte';
	import { Toaster, toast } from 'svelte-sonner';
import '../app.css';
import { navigating } from '$app/stores';
  /**
   * @typedef {Object} Props
   * @property {import('svelte').Snippet} [children]
   */

  /** @type {Props} */
  let { children } = $props();</script>
<Toaster />

<!-- <Header></Header> -->

{#if $navigating}
  <div class="loader">
    <div class="progress-bar"></div>
  </div>
{/if}

<main>
	{@render children?.()}
</main>

<style>
  .loader {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    z-index: 9999;
    pointer-events: none;
  }

  .progress-bar {
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, #ff3e00 0%, #40b3ff 50%, #ff3e00 100%);
    background-size: 200% 100%;
    animation: loading 1.5s ease-in-out infinite;
    transform-origin: 0% 50%;
  }

  @keyframes loading {
    0% {
      background-position: 200% 0;
      transform: scaleX(0);
    }
    50% {
      transform: scaleX(0.5);
    }
    100% {
      background-position: -200% 0;
      transform: scaleX(1);
    }
  }
</style>

