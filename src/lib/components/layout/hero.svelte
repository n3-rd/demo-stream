<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import * as Dialog from '$lib/components/ui/dialog';
    import * as Tabs from "$lib/components/ui/tabs";
    import { Input } from '$lib/components/ui/input/index';
    import { Label } from '$lib/components/ui/label/index';
    import { enhance } from '$app/forms';
    import { Phone, PlayCircle, Smartphone } from 'lucide-svelte';
    import { currentVideoUrl } from '$lib/callStores';

    import { toast } from 'svelte-sonner';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';

    let loading = false;
    let dialogOpen = false;

    let videoFile: File | null = null;
    let videoUrl = '';

    function handleVideoUpload(node: HTMLFormElement) {
        function handleSubmit(event: Event) {
            event.preventDefault();
            loading = true;

            if (!videoFile) {
                toast.error('Please select a video file');
                loading = false;
                return;
            }

            try {
                videoUrl = URL.createObjectURL(videoFile);
                if (browser) {
                    currentVideoUrl.set(videoUrl);
                }
                toast.success('Video selected successfully');
                dialogOpen = false; // Close the dialog
            } catch (error) {
                console.error('Error handling video file:', error);
                toast.error('An error occurred while handling the video file');
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
            <div class="video-box h-96 w-[30rem]">
                <video src={videoUrl} controls class="w-full h-auto"></video>
            </div>
        {:else}
            <Dialog.Root bind:open={dialogOpen}>
                <Dialog.Trigger>
                    <Button class="gap-3 rounded-3xl bg-primary px-4 py-2 text-xl font-semibold hover:text-white">
                        Select a Video File <PlayCircle />
                    </Button>
                </Dialog.Trigger>
                <Dialog.Content>
                    <Tabs.Root value="video" class="w-[500px] bg-background">
                        <Tabs.Content value="video" class="min-h-28">
                            <form
                                class="grid gap-4"
                                use:handleVideoUpload
                            >
                                <div class="grid gap-2">
                                  
                                    <Input id="videoFile" type="file" accept="video/*" on:change={(e) => videoFile = e.target.files[0]} required />
                                </div>
                                <Button type="submit" class="w-full" disabled={loading}>
                                    {loading ? 'Processing...' : 'Select and Save Video'}
                                </Button>
                            </form>
                        </Tabs.Content>
                    </Tabs.Root>
                </Dialog.Content>
            </Dialog.Root>
        {/if}
    </div>
    <div class="absolute inset-y-0 right-0 justify-end pb-6 pr-6 flex flex-col gap-2">
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
                disabled={!videoUrl}
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
</div>

