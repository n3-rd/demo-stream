<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { toast } from 'svelte-sonner';

    export let data;
    const { room } = data;

    let anonymousUserId = '';
    let loading = false;
    let errors: { anonymousUserId?: string } = {};
</script>

<div class="container mx-auto p-4 mt-[8rem]">
    <h1 class="text-2xl font-bold mb-4">Join Room</h1>

    <form 
        method="POST" 
        action="?/joinRoom"
        use:enhance={() => {
            loading = true;
            return async ({ result, update }) => {
                if (result.type === 'success') {
                    // Use goto for navigation
                    const roomId = result.data.roomId;
                    const anonymousUserId = result.data.anonymousUserId;
                    await goto(`/room/${roomId}?anonymousUserId=${anonymousUserId}&hostUserId=${anonymousUserId}`);
                } else if (result.type === 'error') {
                    toast.error('Failed to join room');
                } else if (result.type === 'failure') {
                    // Handle validation errors
                    errors = result.data?.errors || {};
                }
                loading = false;
            };
        }}
    >
        <div class="mb-4">
            <label for="anonymousUserId" class="block text-sm font-medium text-gray-700 mb-1">
                Enter your user ID
            </label>
            <input 
                type="text" 
                id="anonymousUserId"
                name="anonymousUserId" 
                bind:value={anonymousUserId}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                placeholder="Your name"
            />
            {#if errors.anonymousUserId}
                <p class="mt-1 text-sm text-red-500">{errors.anonymousUserId}</p>
            {/if}
            <p class="mt-1 text-sm text-gray-500">
                This name will be used to identify you in the room.
            </p>
            <p class="mt-1 text-sm text-gray-500">
                Ensure it is at least 3 characters long and unique 
            </p>
            <p class="mt-1 text-sm text-primary">
                For example: JohnDoe-Bluesky
            </p>
        </div>

        <Button 
            type="submit" 
            disabled={loading || anonymousUserId.length < 3}
            class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
        >
            {loading ? 'Joining...' : 'Join Room'}
        </Button>
    </form>
</div> 