<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from "$lib/components/ui/dialog";
  import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import { currentVideoUrl } from '$lib/callStores';
  import { invalidateAll } from '$app/navigation';
  import Sidenav from '$lib/components/layout/sidenav.svelte';
  import { Mic, Code } from 'lucide-svelte';
	import Embed from '$lib/components/room/embed.svelte';

  export let data;
  const { user } = data;
  const superUser = user.superuser;
  let roomVideos;
  $: roomVideos = data.roomVideos;
  let loading = false;
</script>

<div class="flex h-screen bg-gray-100">
  <Sidenav activePage="dashboard" />

  <div class="flex-1 flex flex-col overflow-hidden">
    <header class="bg-white shadow-sm z-10">
      <div class=" mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-700">Dashboard</h1>
        {#if superUser}
          <Button href="/upload" class="bg-primary hover:bg-primary/90 text-white">
            Upload a Video
          </Button>
        {/if}
      </div>
    </header>

    <main class="flex-1 overflow-y-auto p-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {#each roomVideos as video}
          <div class="bg-white rounded-lg shadow-md overflow-hidden relative">
            <div class="relative aspect-video bg-gray-200">
              <img src={`${PUBLIC_POCKETBASE_INSTANCE}/api/files/${video.collectionId}/${video.id}/${video.thumbnail}`} alt={video.title} class="w-full h-full object-cover" />
              <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <Dialog.Root closeOnOutsideClick={!loading}>
                  <Dialog.Trigger>
                    <div class="w-16 h-16 bg-white bg-opacity-75 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110">
                      <img src="/icons/play.svg" alt="Play" class="w-8 h-8" />
                    </div>
                  </Dialog.Trigger>
                  <Dialog.Content class="max-w-3xl">
                    <Dialog.Header>
                      <Dialog.Title class="text-2xl font-bold text-primary">{video.title}</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Description>
                      <video src={`/video/${video.video_ref}.mp4`} class="w-full rounded-lg" controls />
                    </Dialog.Description>
                    <Dialog.Footer class="flex justify-between mt-4">
                      <form
                        action='/?/create-room'
                        method='POST'
                        use:enhance={() => {
                          loading = true;
                          return async ({ result }) => {
                            if (result.data?.room?.name) {
                              currentVideoUrl.set(`/video/${video.video_ref}.mp4`);
                              toast.success('Room created successfully');
                              goto(`/room/${result.data.room.name}`);
                            } else if (result.status === 400) {
                              toast.error('Bad request');
                            } else if (result.status === 500) {
                              toast.error('Server error');
                            } else {
                              toast.error('Oops, something went wrong!');
                            }
                            loading = false;
                          };
                        }}
                      >
                        <input type="hidden" name="videoUrl" value={`/video/${video.video_ref}.mp4`} />
                        <input type="hidden" name="videoName" value={video.title} />
                        <Button type="submit" class="bg-primary hover:bg-primary/90 text-white" disabled={loading}>
                          {loading ? 'Loading...' : 'Proceed'}
                        </Button>
                      </form>
                      {#if superUser}
                        <form
                          action='/upload/?/deleteVideo'
                          method='POST'
                          use:enhance={() => {
                            return async ({ result }) => {
                              if (result.status === 200) {
                                toast.success('Video deleted successfully');
                                await invalidateAll();
                              } else {
                                toast.error('Failed to delete video');
                              }
                            };
                          }}
                        >
                          <input type="hidden" name="id" value={video.id} />
                          <input type="hidden" name="ref" value={video.video_ref} />
                          <Button type="submit" class="bg-red-500 hover:bg-red-600 text-white" disabled={loading}>
                            Delete
                          </Button>
                        </form>
                      {/if}
                    </Dialog.Footer>
                  </Dialog.Content>
                </Dialog.Root>
              </div>
            </div>
            <div class="p-4">
              <h3 class="font-semibold text-lg mb-2 text-primary">{video.title}</h3>
              <p class="text-gray-600 text-sm">{video.desc}</p>
            </div>
            {#if superUser}
            <div class="flex justify-end absolute top-2 right-2 gap-2">
              <Dialog.Root>
                <Dialog.Trigger>
                  <button class=" bg-primary text-white p-2 rounded-full hover:bg-primary/90 transition-colors duration-300">
                    <Code />
                  </button>
                </Dialog.Trigger>
                <Dialog.Content>
                  <Dialog.Header>
                    <Dialog.Title class="text-xl font-bold">Embed Code</Dialog.Title>
                  </Dialog.Header>
                  <Dialog.Description class="my-4">
                    Copy the embed code to use this video in your website.
                  </Dialog.Description>
                  <Embed videoId={video.id} />
                </Dialog.Content>
              </Dialog.Root>
              <Dialog.Root>
                <Dialog.Trigger>
                  <button class=" bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </Dialog.Trigger>
                <Dialog.Content>
                  <Dialog.Header>
                    <Dialog.Title class="text-xl font-bold">Delete Video</Dialog.Title>
                  </Dialog.Header>
                  <Dialog.Description class="my-4">
                    Are you sure you want to delete this video?
                  </Dialog.Description>
                  <Dialog.Footer class="flex justify-end space-x-2">
                    <Dialog.Close>
                      <Button class="bg-gray-300 hover:bg-gray-400 text-gray-800">Cancel</Button>
                    </Dialog.Close>
                    <Dialog.Close>
                      <form
                        action='/upload/?/deleteVideo'
                        method='POST'
                        use:enhance={() => {
                          return async ({ result }) => {
                            if (result.status === 200) {
                              toast.success('Video deleted successfully');
                              await invalidateAll();
                            } else {
                              toast.error('Failed to delete video');
                            }
                          };
                        }}
                      >
                        <input type="hidden" name="id" value={video.id} />
                        <input type="hidden" name="ref" value={video.video_ref} />
                        <Button type="submit" class="bg-red-500 hover:bg-red-600 text-white">
                          Delete
                        </Button>
                      </form>
                    </Dialog.Close>
                  </Dialog.Footer>
                </Dialog.Content>
              </Dialog.Root>
              </div>
            {/if}
          </div>
        {/each}
      </div>
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