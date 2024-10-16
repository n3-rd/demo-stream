<script lang="ts">
  export let data;
  let { representative, roomUrl, user } = data;
</script>

{#if representative}
  <div class="flex flex-col items-center justify-center min-h-screen ">
    <div class="text-center p-8  max-w-md">
      <h1 class="text-3xl font-bold mb-4 text-gray-800">Welcome, {user.name}!</h1>
      <p class="text-lg mb-6 text-gray-600">You have access to join this meeting as a representative.</p>
      <a href={roomUrl} class="inline-block px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:primary/60 transition duration-300 ease-in-out">
        Join Meeting
      </a>
    </div>
  </div>


{:else}
  <p>You are not a representative, hence you cannot access through this  page</p>
{/if}
