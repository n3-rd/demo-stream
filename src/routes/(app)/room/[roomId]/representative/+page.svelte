<script lang="ts">
  import { goto } from '$app/navigation';
  let { data } = $props();
  let { representative, roomUrl, error } = data;

  function handleLogin() {
    if (representative) {
      // Redirect to representative login with pre-filled details
      goto(`/representative/login?room=${roomUrl.split('/').pop()}&repid=${representative.id}`);
    }
  }
</script>

{#if error}
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-50">
    <div class="text-center p-8 max-w-md">
      <h1 class="text-2xl font-bold mb-4 text-red-600">Access Denied</h1>
      <p class="text-lg mb-6 text-gray-600">{error}</p>
      <a href="/" class="inline-block px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/60 transition duration-300 ease-in-out">
        Return Home
      </a>
    </div>
  </div>
{:else if representative}
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-50">
    <div class="text-center p-8 max-w-md">
      <h1 class="text-3xl font-bold mb-4 text-gray-800">Representative Access</h1>
      <p class="text-lg mb-6 text-gray-600">You need to log in to access this meeting.</p>
      <div class="space-y-4">
        <p class="text-sm text-gray-500">Click below to log in as {representative.name}</p>
        <button 
          onclick={handleLogin} 
          class="inline-block px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/60 transition duration-300 ease-in-out"
        >
          Log In as Representative
        </button>
      </div>
    </div>
  </div>
{:else}
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-50">
    <div class="text-center p-8 max-w-md">
      <h1 class="text-2xl font-bold mb-4 text-red-600">Invalid Link</h1>
      <p class="text-lg mb-6 text-gray-600">This representative invitation link is invalid or has expired. Please check your invitation and try again.</p>
      <a href="/" class="inline-block px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/60 transition duration-300 ease-in-out">
        Return Home
      </a>
    </div>
  </div>
{/if}
