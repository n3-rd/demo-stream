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
    console.log(room);
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
</script>

<div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">{room.title}</h1>

    <div class="flex flex-col md:flex-row justify-between gap-4 w-full h-full">
        <div class="flex-1 h-full">
            <div class="mb-4">
                <label for="anonymousUserId" class="block text-sm font-medium text-gray-700 mb-1">
                    Enter your user id
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
                    This name will be used to identify you in the room.
                </p>
                <p class="mt-1 text-sm text-gray-500">
                    ensure it is at least 3 characters long and unique 
                </p>
                <p class="mt-1 text-sm text-primary">
                    for example: JohnDoe-Bluesky
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
        <form 
            bind:this={form}
            use:enhance={() => {
                loading = true;
                return async ({ result }) => {
                    if (result.type === 'success') {
                        toast.success('Joining room...');
                        const sanitizedName = sanitizeStreamName(anonymousUserId);
                        anonymousUser.set(sanitizedName);
                        goto(`/room/${room.id}?anonymousUserId=${sanitizedName}`);
                    } else {
                        toast.error('Failed to join room');
                    }
                    loading = false;
                };
            }}
            class="mt-4" 
            method="post" 
            action="?/join-room"
        >
            <input type="hidden" name="anonymousUserId" bind:value={anonymousUserId} />
            <Button 
                type="submit" 
                disabled={loading || anonymousUserId === '' || anonymousUserId === null || anonymousUserId.length < 3} 
                class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
            >
                {loading ? 'Joining...' : 'Join Room'}
            </Button>
        </form>
    </div>
</div>

<style>
    :global(html, body) {
        height: 100%;
        margin: 0;
        padding: 0;
    }
</style> 