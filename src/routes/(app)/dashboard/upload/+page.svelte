<script lang="ts">
    import { Button } from '$lib/components/ui/button';

    const sidebarItems = [
      { name: 'Dashboard', active: true },
      { name: 'Others' },
      { name: 'Option A' },
      { name: 'Option B' },
      { name: 'Option C' },
      { name: 'Option D' },
      { name: 'Option E' },
    ];

    let representatives = [
      { name: 'Taylor Swift', phone: '726-123-5312', email: 'taylorswift@email.com' },
      { name: 'Mark Blane', phone: '021-123-5312', email: 'markblane@email.com' }
    ];

    let newRepresentative = { name: '', phone: '', email: '' };

    function addRepresentative() {
      if (newRepresentative.name && newRepresentative.phone && newRepresentative.email) {
        representatives = [...representatives, newRepresentative];
        newRepresentative = { name: '', phone: '', email: '' }; // Reset form fields
      }
    }

    function removeRepresentative(index: number) {
      representatives = representatives.filter((_, i) => i !== index);
    }
</script>

<div class="flex bg-gray-100">
    <!-- Sidebar (fixed) -->
    <aside class="w-64 h-auto overflow-y-auto bg-white shadow-md flex-shrink-0">
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

    <!-- Main content area (scrollable) -->
    <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Header (fixed) -->
        <header class="bg-white shadow-sm z-10">
            <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                <h1 class="text-3xl font-bold text-gray-800">Upload a Video</h1>
            </div>
        </header>

        <!-- Scrollable content -->
        <main class="flex-1 overflow-y-auto p-6">
            <div class="max-w-7xl mx-auto">
                <div class="bg-white p-6 rounded-lg shadow">
                    <!-- Form Section -->
                    <div class="space-y-6">
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div class="flex flex-col gap-2">
                                <label for="title" class="text-sm font-medium text-gray-700">Title</label>
                                <input type="text" id="title" class="w-full border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"/>
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="video-url" class="text-sm font-medium text-gray-700">Video URL</label>
                                <input type="text" id="video-url" class="w-full border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"/>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="description" class="text-sm font-medium text-gray-700">Brief Description</label>
                            <textarea id="description" rows="4" class="w-full border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"></textarea>
                        </div>
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium text-gray-700">Upload a Video</label>
                                <div class="border-dashed border-2 p-4 mt-2 text-center">
                                    Drag and drop or click here to upload your video.
                                </div>
                                <input type="text" placeholder="Video Link" class="mt-2 p-2 block w-full border-gray-300 rounded-md shadow-sm"/>
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium text-gray-700">Video Thumbnail</label>
                                <div class="border-dashed border-2 p-4 mt-2 text-center">
                                    Upload Image
                                </div>
                                <button class="mt-2 bg-gray-200 text-sm p-2 rounded-md">Generate Code</button>
                            </div>
                        </div>
                    </div>

                    <!-- Representatives Section -->
                    <div class="mt-8">
                        <h2 class="text-lg font-bold text-gray-700 mb-4">Representative</h2>
                        <div class="space-y-4">
                            {#each representatives as rep, index}
                                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-md mb-2">
                                    <div>
                                        <p class="text-sm font-medium text-gray-900">{rep.name}</p>
                                        <p class="text-sm text-gray-600">{rep.phone}</p>
                                        <p class="text-sm text-gray-600">{rep.email}</p>
                                    </div>
                                    <button on:click={() => removeRepresentative(index)} class="text-red-600 text-sm">Remove</button>
                                </div>
                            {/each}
                        </div>

                        <div class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                            <div class="flex flex-col gap-2">
                                <label for="rep-name" class="text-sm font-medium text-gray-700">Name</label>
                                <input type="text" id="rep-name" bind:value={newRepresentative.name} class="w-full border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"/>
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="rep-phone" class="text-sm font-medium text-gray-700">Phone</label>
                                <input type="text" id="rep-phone" bind:value={newRepresentative.phone} class="w-full border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"/>
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="rep-email" class="text-sm font-medium text-gray-700">Email</label>
                                <input type="text" id="rep-email" bind:value={newRepresentative.email} class="w-full border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"/>
                            </div>
                        </div>

                        <div class="mt-4">
                            <Button on:click={addRepresentative} variant="default">Add Another</Button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</div>

<style>
    /* No styles needed here now */
</style>
