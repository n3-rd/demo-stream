<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import { Input } from '$lib/components/ui/input';   
    let { data } = $props();
    const { room } = data;

    let anonymousUserId = $state('');
    let loading = $state(false);
    let errors: { anonymousUserId?: string } = $state({});
</script>

<div class="container mx-auto mt-[1rem] p-8">
    <h1 class="text-2xl font-bold mb-4">Join Room</h1>

    <form 
    class="flex flex-col justify-between h-[calc(100vh-10rem)]"
        method="POST" 
        action="?/joinRoom"
        use:enhance={() => {
            // Trim extra spaces before submission
            anonymousUserId = anonymousUserId.trim();
            loading = true;
            return async ({ result, update }) => {
                if (result.type === 'success') {
                    // Use window.open to launch in a new tab
                    const roomId = result.data?.roomId || $page.params.roomId;
                    const anonymousUserId = String(result.data?.anonymousUserId || '').trim();
                    const hostParams = result.data?.hostParams || '';
                    
                    if (!roomId) {
                        toast.error('Room ID is missing');
                        loading = false;
                        return;
                    }
                    
                    const roomUrl = `/room/${roomId}?${hostParams}&anonymousUserId=${anonymousUserId}`;
                    window.open(roomUrl, '_blank');
                    
                    // Optionally close the current window
                    window.close();
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
            <Input 
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
           <p class="text-sm text-gray-500 py-4">
            This Name will be used to identify you in the Room.
Ensure it at least 3 Characters long and Unique.
           </p>
        </div>

        <div class="flex flex-col gap-4">

            <p class="text-sm text-gray-500">
                As host you control all video features,
                invitations including Rep’s questions.
                All participants who sign in can take notes
            </p>
            <Button 
            type="submit" 
            disabled={loading || anonymousUserId.trim().length < 3}
            class="w-full bg-primary hover:bg-primary/80 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
        >
            {loading ? 'Joining...' : 'Join Room'}
        </Button>
        </div>


    </form>
</div> 