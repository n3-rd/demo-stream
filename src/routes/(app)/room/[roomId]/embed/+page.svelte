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
        return `/api/files/${content.collectionId || 'content_library'}/${content.id}/${content.thumbnail}`;
    }

    async function handleJoinRoom() {
        if (!data.viewroomUser) {
            toast.error('Authentication required');
            return;
        }
        
        loading = true;
        try {
            // Use viewroom user info for joining
            const userDisplayName = `${data.viewroomUser.first_name} ${data.viewroomUser.last_name} (${data.viewroomUser.company})`;
            anonymousUser.set(userDisplayName);
            
            // Open room with viewroom authentication
            window.open(`/room/${room.id}?viewroomUser=true`, '_blank');
        } catch (error) {
            console.error('Failed to join room:', error);
            toast.error('Failed to join room');
        } finally {
            loading = false;
        }
    }
</script>

{#if room}
<div class="container mx-auto p-4 mt-[8rem]">
    <h1 class="text-2xl font-bold mb-4">{room.title}</h1>

    <div class="flex flex-col md:flex-row justify-between gap-4 w-full h-full">
        <div class="flex-1 h-full">
            <div class="mb-4">
                <h2 class="text-lg font-semibold mb-4">Host this Room</h2>
                {#if data.viewroomUser}
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 class="font-medium text-green-800 mb-2">
                            {#if data.authType === 'pocketbase'}
                                🔓 Company Account Access
                            {:else}
                                🔐 Viewroom Access
                            {/if}
                        </h3>
                        <div class="space-y-1">
                            <p class="text-sm text-green-700">
                                <strong>Name:</strong> {data.viewroomUser.first_name} {data.viewroomUser.last_name}
                            </p>
                            <p class="text-sm text-green-700">
                                <strong>Company:</strong> {data.viewroomUser.company}
                            </p>
                            <p class="text-sm text-green-700">
                                <strong>Email:</strong> {data.viewroomUser.email}
                            </p>
                        </div>
                        <p class="text-xs text-green-600 mt-2">
                            {#if data.authType === 'pocketbase'}
                                You are logged in with your company account.
                            {:else}
                                You have verified viewroom access.
                            {/if}
                        </p>
                    </div>
                {:else}
                    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h3 class="font-medium text-red-800 mb-2">🚫 Authentication Required</h3>
                        <p class="text-red-700">You must be authenticated to access this room.</p>
                        <p class="text-xs text-red-600 mt-2">
                            Please log in with your company account or viewroom credentials.
                        </p>
                    </div>
                {/if}
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
        {#if room.is_active}
        <Button 
            on:click={handleJoinRoom}
            disabled={loading || !data.viewroomUser} 
            class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
            {loading ? 'Joining...' : data.viewroomUser ? 'Host Room' : 'Authentication Required'}
        </Button>
        {:else}
        <p class="text-red-500">Room is not active</p>
        {/if}
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