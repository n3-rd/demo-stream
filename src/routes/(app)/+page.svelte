<script lang="ts">
    import { Button } from '$lib/components/ui/button';
	import * as Dialog from "$lib/components/ui/dialog";
    import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';
    import { goto } from '$app/navigation';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import { currentVideoUrl } from '$lib/callStores';
    import { invalidateAll } from '$app/navigation';
    export let data;
    const { user } = data;
    const superUser = user.superuser;
    let roomVideos;
   $: roomVideos = data.roomVideos;
    console.log(roomVideos);
    console.log(user);
    const sidebarItems = [
      { name: 'Dashboard', active: true },
      { name: 'Others' },
      { name: 'Option A' },
      { name: 'Option B' },
      { name: 'Option C' },
      { name: 'Option D' },
      { name: 'Option E' },
    ];
  
    async function deleteVideo(videoId: string) {

        try {
            const response = await fetch(`/api/videos/${videoId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success('Video deleted successfully');
                await invalidateAll();
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || 'Failed to delete video');
            }
        } catch (error) {
            console.error('Error deleting video:', error);
            toast.error('An error occurred while deleting the video');
        }
    }

    function handleDeleteResult(result) {
        if (result.type === 'success') {
            const data = result.data;
            if (data.success) {
                toast.success(data.message);
                invalidateAll();
            } else {
                toast.error(data.message);
            }
        } else {
            toast.error('An error occurred while deleting the video');
        }
    }
</script>

<div class="flex h-auto overflow-hidden bg-gray-100">
    <!-- Sidebar -->
    <aside class="w-64 h-full overflow-y-auto bg-white shadow-md">
        <div class="p-4">
            <div class="bg-gray-300 h-12 w-24 mb-4">LOGO</div>
            <nav>
                {#each sidebarItems as item}
                    <a
                        href="#"
                        class="block py-2 px-4 text-gray-600 hover:bg-gray-100 {item.active ? 'bg-gray-100 font-semibold' : ''}"
                    >
                        {item.name}
                    </a>
                {/each}
            </nav>
        </div>
    </aside>

    <!-- Main content area -->
    <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Header -->
        <header class="shadow-sm z-10 mt-6 rounded-lg">
            <div class="bg-white top-header !w-[95%] mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                <h1 class="text-3xl font-bold !text-[#808080]">Dashboard</h1>
                {#if superUser}
                <Button
                href="/upload"
                
                class="bg-primary hover:bg-primary/90 text-white">Upload a Video</Button>
                {/if}
            </div>
        </header>

        <!-- Scrollable content -->
        <main class="flex-1 overflow-y-auto p-6 pb-20">
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {#each roomVideos as video}
                    <div class="bg-white rounded-lg overflow-hidden relative"> <!-- Added relative positioning -->
                        <div class="relative h-48 bg-gray-200 p-2 cursor-pointer">
                            <img src={`${PUBLIC_POCKETBASE_INSTANCE}/api/files/${video.collectionId}/${video.id}/${video.thumbnail}`} alt={video.title} class="w-full h-full object-cover" />
                            <div class="absolute inset-0 flex items-center justify-center">
								<Dialog.Root>
									<Dialog.Trigger>
										<div class="w-12 h-12  bg-opacity-75 rounded-full flex items-center justify-center">
											<img src="/icons/play.svg" alt="Play" class="w-10 h-10" />
										  </div>
									</Dialog.Trigger>
									<Dialog.Content>
									  <Dialog.Header>
										<Dialog.Title class="text-primary py-4">{video.title}</Dialog.Title>
										<Dialog.Description>
										 <video src={`/video/${video.video_ref}.mp4`} class="w-full h-full object-cover"
										 controls
										 />
										</Dialog.Description>
									  </Dialog.Header>
									  <Dialog.Footer class="flex justify-between">
										<form
										  action='/?/create-room'
										  method='POST'
										  use:enhance={() => {
											return async ({ result }) => {
												if (result.data.room?.name) {
													currentVideoUrl.set(`/video/${video.video_ref}.mp4`);
													toast.success('Room created successfully');
													goto(`/room/${result.data.room.name}`);
												} else if (result.status === 400) {
													toast('Bad request');
												} else if (result.status === 500) {
													toast('Server error');
												} else {
													toast('Oops, something went wrong!');
												}
											};
										}}
									  >
										<input 
										  type="hidden" 
										  name="videoUrl" 
										  value={`/video/${video.video_ref}.mp4`}
										/>
										<Button 
										  type="submit" 
										  class="bg-primary hover:bg-primary/90 text-white"
										>
										  Proceed
										</Button>
									  </form>
									  {#if superUser}
										<form
											action='/?/delete-video'
											method='POST'
											use:enhance={() => {
												return async ({ result }) => {
													handleDeleteResult(result);
												};
											}}
										>
											<input type="hidden" name="videoId" value={video.id} />
                      <Button 
                      type="submit" 
                      class="bg-red-500 hover:bg-red-600 text-white"
                    >
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
                            <h3 class="font-semibold text-base mb-2 text-primary">{video.title}</h3>
                            <p class="text-gray-600 text-sm">{video.desc}</p>
                        </div>
                        {#if superUser}
                        <Dialog.Root>
                      <Dialog.Trigger>
                        <button
                        class="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                       
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                    </button>
                      </Dialog.Trigger>
                          <Dialog.Content>
                            <Dialog.Header> 
                              <Dialog.Title> Delete Video </Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Description>
                              Are you sure you want to delete this video?
                            </Dialog.Description>
                            <Dialog.Footer>
                              <Dialog.Close>
                                <Button> Cancel </Button>
                              </Dialog.Close>
                              <Dialog.Close>
                                <Button 
                                on:click={() => deleteVideo(video.id)}
                                class="bg-red-500 hover:bg-red-600 text-white"
                              >
                                Delete
                              </Button>
                              </Dialog.Close>
                            </Dialog.Footer>
                          </Dialog.Content>
                        </Dialog.Root>
  
                            
                        {/if}
                    </div>
                {/each}
            </div>
        </main>
    </div>
</div>

<style>

    h1{
        @apply !text-[#808080];
    }
</style>