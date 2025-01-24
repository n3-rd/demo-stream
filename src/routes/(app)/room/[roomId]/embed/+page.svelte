<script lang="ts">
    export let data;
    import { anonymousUser } from '$lib/stores/anonymousUser';
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { currentVideoUrl } from '$lib/callStores';
    import { Button } from '$lib/components/ui/button';
    import { toast } from 'svelte-sonner';
    import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';

    const { room } = data;
    console.log("data", data);
    let loading = false;
    let anonymousUserId: string | null = null;
    let form: HTMLFormElement;

    function sanitizeStreamName(name: string): string {
        return name.replace(/%20/g, '_').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9-_]/g, '_');
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey && anonymousUserId && anonymousUserId.length >= 3) {
            event.preventDefault();
            form.requestSubmit();
        }
    }

    function getThumbnailUrl(content: any) {
        if (!content?.thumbnail) return null;
        return `${PUBLIC_POCKETBASE_INSTANCE}/api/files/${content.collectionId}/${content.id}/${content.thumbnail}`;
    }

    async function handleJoinRoom() {
        if (!anonymousUserId || anonymousUserId.length < 3) return;
        
        loading = true;
        try {
            const sanitizedName = sanitizeStreamName(anonymousUserId);
            anonymousUser.set(sanitizedName);
            // Use the direct room path with anonymous host parameters
            await goto(`/room/${room.id}?anonymousUserId=${sanitizedName}&isHost=true&anonymous=true`, {
                replaceState: true
            });
        } catch (error) {
            console.error('Failed to join room:', error);
            toast.error('Failed to join room');
        } finally {
            loading = false;
        }
    }
</script>

{#if room}
<div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">{room.title}</h1>

    <div class="flex flex-col md:flex-row justify-between gap-4 w-full h-full">
        <div class="flex-1 h-full">
            <div class="mb-4">
                <label for="anonymousUserId" class="block text-sm font-medium text-gray-700 mb-1">
                    Enter your name to host this room
                </label>
                <input 
                    type="text" 
                    id="anonymousUserId"
                    name="anonymousUserId" 
                    bind:value={anonymousUserId}
                    on:keydown={handleKeydown}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    placeholder="Your name"
                />
                <p class="mt-1 text-sm text-gray-500">
                    This name will be used to identify you as the host in the room.
                </p>
                <p class="mt-1 text-sm text-gray-500">
                    Ensure it is at least 3 characters long and unique 
                </p>
                <p class="mt-1 text-sm text-primary">
                    For example: JohnDoe-Host
                </p>
            </div>
        </div>

        <div class="flex-1 flex justify-center items-center">
            {#if room.expand?.selected_video?.thumbnail}
                <img 
                    src={getThumbnailUrl(room.expand.selected_video)} 
                    alt={room.title} 
                    class="w-80 h-full object-cover rounded-lg shadow-md" 
                />
            {/if}
        </div>
    </div>

    <div class="mt-8">
        <Button 
            on:click={handleJoinRoom}
            disabled={loading || anonymousUserId === '' || anonymousUserId === null || anonymousUserId.length < 3} 
            class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
        >
            {loading ? 'Joining...' : 'Host Room'}
        </Button>
    </div>
</div>
{:else}
    <div class="container mx-auto p-4">
        <p class="text-red-500">Room not found</p>
    </div>
{/if}

<style>
    :global(html, body) {
        height: 100%;
        margin: 0;
        padding: 0;
    }
</style> 