<script lang="ts">
    import Sidenav from '$lib/components/layout/sidenav.svelte';
    import { Button } from '$lib/components/ui/button';
    import { Checkbox } from '$lib/components/ui/checkbox';
    import * as Table from "$lib/components/ui/table";
    import * as Dialog from "$lib/components/ui/dialog";
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import { toast } from 'svelte-sonner';
	import RepresentativesTable from '$lib/components/layout/representatives-table.svelte';

    export let data;
    let allUsers = data.users;
    let users;
    $: users = data.users;
    let user = data.user;
    let superUser = user.superuser;
    let loading = false;
    let isDialogOpen = false;
    let selectedUser = null;

    $: representatives = allUsers.filter(user => user.representative);

    let selectedRepresentatives = new Set();

    function openDialog(user) {
        selectedUser = user;
        isDialogOpen = true;
    }

    function toggleRepresentative(userId: string) {
        if (selectedRepresentatives.has(userId)) {
            selectedRepresentatives.delete(userId);
        } else {
            selectedRepresentatives.add(userId);
        }
        selectedRepresentatives = selectedRepresentatives; // trigger reactivity
    }

    async function confirmRepresentatives() {
        // Implement the logic to update representatives based on selectedRepresentatives
        // This might involve multiple API calls to add/remove representatives
        for (const userId of selectedRepresentatives) {
            const response = await fetch('/api/toggle-representative', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, makeRepresentative: true }),
            });
            if (!response.ok) {
                toast.error('Failed to update representative status');
            }
        }
        
        isDialogOpen = false;
        await invalidateAll();
    }
</script>

<div class="flex  bg-gray-100">
    <Sidenav activePage="representatives" />

    <div class="flex-1 flex flex-col overflow-hidden">
        <header class="bg-white shadow-sm z-10">
            <div class="mx-auto py-4 px-4 sm:px-6 lg:px-8">
                <h1 class="text-3xl font-bold text-gray-700">Representatives</h1>
            </div>
        </header>

        <main class="flex-1 overflow-y-auto p-6">
          <RepresentativesTable {users} {superUser} />
            {#if superUser}
                <div class="mt-4">
                    <Button on:click={() => openDialog(null)}>Add Representative</Button>
                </div>
            {/if}
        </main>
    </div>
</div>

<Dialog.Root bind:open={isDialogOpen}>
    <Dialog.Content class="w-full max-w-md">
        <div class="py-4 max-h-[60vh] overflow-y-auto">
            {#each allUsers as user}
                <div class="flex items-center space-x-2 py-2 border-b border-gray-200 last:border-b-0">
                    <Checkbox
                        id={user.id}
                        checked={selectedRepresentatives.has(user.id)}
                        onCheckedChange={() => toggleRepresentative(user.id)}
                    />
                    <label for={user.id} class="flex-grow">
                        <div class="font-semibold">{user.name}</div>
                        <div class="text-sm text-gray-500">{user.email}</div>
                    </label>
                </div>
            {/each}
        </div>

        <div class="flex justify-end space-x-2 mt-4">
            <Button variant="outline" on:click={() => isDialogOpen = false}>Cancel</Button>
            <Button variant="default" on:click={confirmRepresentatives}>Confirm</Button>
        </div>
    </Dialog.Content>
</Dialog.Root>

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
