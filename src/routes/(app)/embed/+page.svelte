<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
	import { currentVideoUrl } from '$lib/callStores.js';
    import { Button } from '$lib/components/ui/button';
    import { toast } from 'svelte-sonner';
    import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';

    export let data;
    const { user, video } = data;

    let loading = false;
    let embedCode = '';
    let roomUrl = '';
    let anonymousUserId: string | null = null;
    let form: HTMLFormElement;
    

    function generateEmbedCode(meetingUrl: string) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return `<iframe src="${origin}/room/${meetingUrl.split('/').pop()}/embed" width="100%" height="600" allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write; clipboard-read" style="border: none;"></iframe>`;
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey && anonymousUserId && anonymousUserId.length >= 3) {
            event.preventDefault();
            form.requestSubmit();
        }
    }
</script>

<div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">{video.title}</h1>

    <div class="flex flex-col md:flex-row justify-between gap-4 w-full h-full">
        <div class="flex-1 h-full">
            <p class="mb-4">
               {video.desc}
            </p>

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
            <img src={`${PUBLIC_POCKETBASE_INSTANCE}/api/files/${video.collectionId}/${video.id}/${video.thumbnail}`} alt={video.title} class="w-80 h-full object-cover rounded-lg shadow-md" />
        </div>
    </div>

    <div class="mt-8">
        <form 
            bind:this={form}
            use:enhance={() => {
                loading = true;
                return async ({ result }) => {
                    if (result.type === 'success') {
                        currentVideoUrl.set(`/video/${video.video_ref}.mp4`);
                        toast.success('Room created successfully');
                        goto(`/room/${result.data.room.room_id}?anonymousUserId=${anonymousUserId}&hostUserId=${anonymousUserId}`);
                    } else if (result.type === 'error') {
                        if (result.status === 400) {
                            toast.error('Bad request');
                        } else if (result.status === 500) {
                            toast.error('Server error');
                        } else {
                            toast.error('Oops, something went wrong!');
                        }
                    }
                    loading = false;
                };
            }}
            class="mt-4" method="post" action="/?/create-room"
        >
            <input type="hidden" name="videoUrl" value={`/video/${video.video_ref}.mp4`} />
            <input type="hidden" name="videoName" value={video.title} />
            <input type="hidden" name="anonymousUserId" bind:value={anonymousUserId} />
            <Button type="submit" disabled={loading || anonymousUserId === '' || anonymousUserId === null || anonymousUserId.length < 3} class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
                {loading ? 'Creating...' : 'Go to View Room'}
            </Button>
        </form>
        
        {#if roomUrl}
            <p class="mt-2 text-sm text-gray-600 text-center">The embed code needs to be attached to this link</p>
        {/if}
    </div>
</div>
