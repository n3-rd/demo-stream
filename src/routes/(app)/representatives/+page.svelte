<script lang="ts">
    import Sidenav from '$lib/components/layout/sidenav.svelte';
	import RepresentativesTable from '$lib/components/layout/representatives-table.svelte';
  
    export let data;
    let users;
    $: users = data.users;
    let user;
    $: user = data.user;
    let superUser = false;
    $: superUser = user.superuser;
    let loading = false;
  </script>
  
  <div class="flex h-screen bg-gray-100">
    <Sidenav activePage="representatives" />
  
    <div class="flex-1 flex flex-col overflow-hidden">
      <header class="bg-white shadow-sm z-10">
        <div class=" mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 class="text-3xl font-bold text-gray-700">Representatives</h1>
    
        </div>
      </header>
  
      <main class="flex-1 overflow-y-auto p-6">
        <RepresentativesTable {users} {superUser} />
      </main>
    </div>
  </div>
  
  {#if loading}
    <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div class="bg-white p-4 rounded-lg shadow-lg">
        <p class="text-lg font-semibold">Loading...</p>
      </div>
    </div>
  {/if}
  
  <style>
    :global(body) {
      @apply bg-gray-100;
    }
  </style>