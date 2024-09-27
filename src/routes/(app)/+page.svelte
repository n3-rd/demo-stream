<script lang="ts">
    import { Button } from '$lib/components/ui/button';
	import * as Dialog from "$lib/components/ui/dialog";
    import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';
    import { goto } from '$app/navigation';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import { currentVideoUrl } from '$lib/callStores';
    export let data;
    const { user } = data;
    const superUser = user.superuser;
    const roomVideos = data.roomVideos;
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
  
    const videoCards = [
      { title: '2024 Ford F150', description: "Ford's F150 Model represents the pinnacle of full-size pickup trucks as a hallmark of rugged capability and versatile performance in the world of pickup trucks. With a lineage that spans over several decades, the F-150...", image: '/img/ford.png' },
      { title: 'Smart CNC Milling Tools', description: 'Join this demo to explore the latest CNC milling tools designed for high-speed precision machining. Learn how these tools reduce setup time and improve cutting accuracy.', image: '/img/ford.png' },
      { title: '3D Printing for Prototyping', description: 'Watch our 3D printing in action as they create high-quality prototypes. This demo highlights how 3D printing can accelerate product development and bring designs to life.', image: '/img/ford.png' },
      { title: 'Advanced Laser Cutting', description: "In this demo, you'll see how advanced laser cutting machines offer superior precision for metal and non-metal materials, enhancing cutting quality for various manufacturing applications.", image: '/img/ford.png' },
      { title: 'Hydraulic Press Machine', description: 'Learn how hydraulic press machines are transforming manufacturing processes with increased force and accuracy. This demo explains the technology behind these powerful machines.', image: '/img/ford.png' },
      { title: 'Lathe Machine', description: 'Discover the precision and efficiency of our lathe machines. This demo showcases advanced turning techniques and how these machines can boost productivity in industrial settings.', image: '/img/ford.png' },
      { title: 'Milling Cutters Machine', description: 'Explore the versatility of our milling cutters. This demo highlights various cutting techniques and how these tools can enhance precision in manufacturing processes.', image: '/img/ford.png' },
      { title: 'Harley Davidson Showroom', description: 'Experience the iconic Harley Davidson motorcycles in our virtual showroom. This demo showcases the latest models and their cutting-edge features.', image: '/img/ford.png' },
    ];
</script>

<div class="flex h-screen overflow-hidden bg-gray-100">
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
    <div class="flex-1 flex flex-col overflow-hidden ">
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
        <main class="flex-1 p-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {#each roomVideos as video}
                    <div class="bg-white rounded-lg overflow-hidden">
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
										 <video src={`${PUBLIC_POCKETBASE_INSTANCE}/api/files/${video.collectionId}/${video.id}/${video.video}`} class="w-full h-full object-cover"
										 controls
										 />
										</Dialog.Description>
									  </Dialog.Header>
									  <Dialog.Footer>
										<form
										  action='/?/create-room'
										  method='POST'
										  use:enhance={() => {
											return async ({ result }) => {
												if (result.data.room?.name) {
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
										  value={`${PUBLIC_POCKETBASE_INSTANCE}/api/files/${video.collectionId}/${video.id}/${video.video}`}
										/>
										<Button 
										  type="submit" 
										  class="bg-primary hover:bg-primary/90 text-white w-full"
										>
										  Proceed
										</Button>
									  </form>
									  </Dialog.Footer>
									</Dialog.Content>
								  </Dialog.Root>
                              
                            </div>
                        </div>
                        <div class="p-4">
                            <h3 class="font-semibold text-base mb-2 text-primary">{video.title}</h3>
                            <p class="text-gray-600 text-sm">{video.desc}</p>
                        </div>
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