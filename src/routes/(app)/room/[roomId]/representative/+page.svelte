<script lang="ts">
  export let data;
  let { representative, roomUrl, error } = data;
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
      <h1 class="text-3xl font-bold mb-4 text-gray-800">Welcome, {representative.name}!</h1>
      <p class="text-lg mb-6 text-gray-600">You have access to join this meeting as a representative.</p>
      <div class="space-y-4">
        <p class="text-sm text-gray-500">You will join with your representative credentials and have access to all representative features.</p>
        <a href={roomUrl} class="inline-block px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/60 transition duration-300 ease-in-out">
          Join Meeting
        </a>
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
