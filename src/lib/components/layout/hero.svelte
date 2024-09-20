<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import * as Dialog from '$lib/components/ui/dialog';
    import * as Tabs from "$lib/components/ui/tabs";
    import { Input } from '$lib/components/ui/input/index';
    import { Label } from '$lib/components/ui/label/index';
    import { enhance } from '$app/forms';
    import { Phone, PlayCircle, Smartphone } from 'lucide-svelte';
    import {currentVideoUrl} from '$lib/callStores';

    import { toast } from 'svelte-sonner';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

    let loading = false;
    let loomUrl = '';
    let videoUrl = '';
    let dialogOpen = false;

    // only to test
    currentVideoUrl.set("https://demo-meeting.pockethost.io/api/files/udj43ofu3ndhbvh/ykjc5o3zkz8n5wr/b34036af43be4a658c24d0ee66305575_wssqRXL4np.mp4?token=");

    async function downloadAndSaveLoomVideo(node: HTMLFormElement) {
        async function handleSubmit(event: Event) {
            event.preventDefault();
            loading = true;

            console.log('Loom URL:', loomUrl); // Log the loomUrl to verify it's set

            try {
                const response = await fetch('/api/download-loom-video', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ url: loomUrl }), // Ensure the key is 'url'
                });

                const result = await response.json();

                if (result.success) {
                    toast.success('Loom video downloaded and saved successfully');
                    // videoUrl = result.video.video_url;
                    videoUrl = `https://demo-meeting.pockethost.io/api/files/udj43ofu3ndhbvh/${result.video.id}/${result.video.video}`;
                    if(browser){
                        currentVideoUrl.set(videoUrl);
                    }
                    dialogOpen = false; // Close the dialog
                } else {
                    toast.error(result.message || 'Failed to download and save Loom video');
                }
            } catch (error) {
                console.error('Error downloading Loom video:', error);
                toast.error('An error occurred while processing the Loom video');
            } finally {
                loading = false;
            }
        }

        node.addEventListener('submit', handleSubmit);

        return {
            destroy() {
                node.removeEventListener('submit', handleSubmit);
            }
        };
    }
</script>

<div
    class="hero relative mx-auto mt-9 flex h-[629px] w-[94%] flex-col items-center justify-center gap-9 rounded-xl bg-white"
>
    <h1 class="max-w-[924px] text-center text-3xl font-bold leading-10 text-primary">
        The Demo Room <br /> Showcasing Innovation by Clearsky Software Solutions
    </h1>
    <p class="max-w-[924px] text-center font-semibold">
        Discover our demo room for real-time demonstrations and explanations, addressing your needs and
        showcasing the benefits of our solutions.
    </p>

    <div class="video-upload-container flex flex-col items-center gap-4">
        {#if videoUrl}
            <div class="video-box">
                <video src={videoUrl} controls class="w-full h-auto"></video>
            </div>
        {:else}
            <Dialog.Root bind:open={dialogOpen}>
                <Dialog.Trigger>
                    <Button class="gap-3 rounded-3xl bg-primary px-4 py-2 text-xl font-semibold hover:text-white">
                        Select a Loom Video <PlayCircle />
                    </Button>
                </Dialog.Trigger>
                <Dialog.Content>
                    <Tabs.Root value="loom" class="w-[500px] bg-background">
                        <Tabs.List>
                            <Tabs.Trigger value="loom">Loom Video</Tabs.Trigger>
                        </Tabs.List>
                        <Tabs.Content value="loom" class="min-h-28">
                            <form
                                class="grid gap-4"
                                use:downloadAndSaveLoomVideo
                            >
                                <div class="grid gap-2">
                                    <Label for="loomUrl">Loom Video URL</Label>
                                    <Input id="loomUrl" type="url" bind:value={loomUrl} required />
                                </div>
                                <Button type="submit" class="w-full" disabled={loading}>
                                    {loading ? 'Processing...' : 'Download and Save Loom Video'}
                                </Button>
                            </form>
                        </Tabs.Content>
                    </Tabs.Root>
                </Dialog.Content>
            </Dialog.Root>
        {/if}
    </div>
</div>

<div class="absolute bottom-8 right-8 flex flex-col gap-2">
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
                    toast('Server error :|');
                } else {
                    toast('Oops, something went wrong!');
                }
            };
        }}
    >
        <Button
            class="gap-3 rounded-3xl bg-primary px-4 py-6 text-xl font-semibold hover:text-white"
            type="submit"
        >
            Create a Demo Room <PlayCircle />
        </Button>
    </form>
    <div
        class="flex flex-col items-center gap-3 rounded-[26px] bg-primary pt-4 font-bold text-white hover:text-white"
    >
        <p>QUESTIONS? JUST ASK!</p>

        <Dialog.Root>
            <Dialog.Trigger
                class="flex w-full gap-3 rounded-3xl border border-primary bg-white p-4 text-center text-xl font-semibold text-primary hover:text-white"
            >
                <div class="mx-auto flex gap-2">TEXT US <Smartphone /></div>
            </Dialog.Trigger>
            <Dialog.Content class="w-[481px] p-9">
                <Dialog.Header>
                    <Dialog.Title>
                        <img src="/logo/main-logo.svg" alt="clearsky" class="mx-auto h-9 w-[131px]" />
                    </Dialog.Title>
                    <Dialog.Description class="py-7 text-center">
                        <b>Text with us.</b> Message us now. book a demo.
                    </Dialog.Description>

                    <div class="flex flex-col gap-4 bg-[#F2F3F4] px-16 py-7">
                        <Button
                            class="w-full gap-2 rounded-[27px] bg-white py-4 text-2xl font-semibold text-foreground hover:text-white"
                            ><Smartphone /> Text Us</Button
                        >
                        <Button
                            class="w-full gap-2 rounded-[27px] bg-white py-4 text-2xl font-semibold text-foreground hover:text-white"
                            ><Phone /> Request a Call</Button
                        >
                        <Button
                            class="w-full gap-2 rounded-[27px] bg-white py-4 text-2xl font-semibold text-foreground hover:text-white"
                            ><PlayCircle />Watch a Demo</Button
                        >
                    </div>
                </Dialog.Header>
            </Dialog.Content>
        </Dialog.Root>
    </div>
</div>