<script lang="ts">
    import { page } from '$app/stores';
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from '$lib/components/ui/button';
    import { useForm, HintGroup, Hint, validators, required, url } from 'svelte-use-form';
    import HintValidate from '$lib/components/layout/hint-validate.svelte';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import { goto } from '$app/navigation';
    import ScheduleMeeting from '../room/schedule-meeting.svelte';
    import InviteRepresentative from '../room/invite-representative.svelte';

    export let loggedIn = false;
    export let user;
    let isMenuOpen = false;
    let pageData = $page.url;
    let isInMeeting: boolean;
    let representatives = [];

    $: {
        console.log(pageData);
        isInMeeting = pageData.pathname.includes('demo');
    }

    async function fetchRepresentatives() {
        try {
            const response = await fetch('/api/representatives');
            if (response.ok) {
                const data = await response.json();
                representatives = data.representatives;
            } else {
                console.error('Failed to fetch representatives');
            }
        } catch (error) {
            console.error('Error fetching representatives:', error);
        }
    }

    fetchRepresentatives();

    function toggleMenu() {
        isMenuOpen = !isMenuOpen;
    }

    const form = useForm();
</script>

{#if !isInMeeting}
<div class="navbar flex items-center justify-between bg-white px-4 py-4 md:px-9 md:py-7">
    <a class="logo" href="/">
        <img src="/logo/main-logo.svg" alt="clearsky" class="h-9 w-[131px]" />
    </a>

    <div class="hidden md:flex items-center gap-5 leading-5 [&>*]:font-semibold">
        <Dialog.Root>
            <Dialog.Trigger>
                <Button variant="ghost" size="icon" class="w-full">
                    <a href="/">Speak to Representative</a>
                </Button>
            </Dialog.Trigger>
            <Dialog.Content class="p-4 bg-gray-800 rounded-lg shadow-lg">
                <InviteRepresentative {representatives} />
            </Dialog.Content>
        </Dialog.Root>
        <Dialog.Root >
            <Dialog.Trigger>
                <Button variant="ghost" size="icon" class="w-full">
                    <a href="/">Book an Appointment</a>

                </Button>
            </Dialog.Trigger>
            <Dialog.Content class="p-4 rounded-lg w-auto bg-transparent">
                <div class="w-full bg-transparent">
                    <ScheduleMeeting userId={user.id} />
                </div>
            </Dialog.Content>
        </Dialog.Root>
        <a href="/">Request A Quote</a>
        <a href="/">Ask a Question</a>
        <a href="/">Notes</a>
        {#if loggedIn}
            <a href="/profile">Profile</a>
        {/if}
    </div>

    <form use:form
        action='/?/create-room'
        method='POST'
        use:enhance={() => {
            return async ({ result }) => {
                console.log('create results', result.data.room);
                if (result.data.room?.name) {
                    console.log('room name', result.data.room.name);
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
        <Button class="bg-[#ECEFF3] text-primary hover:text-white" type="submit">
            Create Room
        </Button>
    </form>

    <Dialog.Root>
        <Dialog.Trigger>
            <Button class="bg-[#ECEFF3] text-primary hover:text-white">
                Join a Demo Room
            </Button>
        </Dialog.Trigger>
        <Dialog.Content>
            <Dialog.Header>
                <Dialog.Title>Enter URL</Dialog.Title>
            </Dialog.Header>
                      <form use:form
                action='/?/join-room'
                method='POST'
                use:enhance={() => {
                    return async ({ result }) => {
                        console.log('join results', result);
                        if (result.data.url) {
                            toast.success('Successfully joined');
      const roomName = result.data.url.split('/').at(-1);

      goto(`/room/${roomName}`);

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
                <input 
                    type="text" 
                    name="dailyUrl"
                    placeholder="Enter URL" 
                    class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    use:validators={[required, url]}
                />
                <HintGroup for="dailyUrl">
                    <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                        <Hint on="required"><HintValidate>URL is required</HintValidate></Hint>
                        <Hint on="url" hideWhenRequired><HintValidate>URL is not valid</HintValidate></Hint>
                    </div>
                </HintGroup>
                <Button class="bg-[#ECEFF3] text-primary hover:text-white" type="submit" disabled={!$form.valid}>
                    Join with URL
                </Button>
            </form>
        </Dialog.Content>
    </Dialog.Root>

    <!-- Mobile Menu Button -->
    <button class="md:hidden" on:click={toggleMenu}>
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
        </svg>
    </button>
</div>

<!-- Mobile Menu -->
{#if isMenuOpen}
    <div class="md:hidden flex flex-col items-start bg-white px-4 py-4 space-y-2">
        <a href="/">Speak to Representative</a>
        <a href="/">Book an Appointment</a>
        <a href="/">Request A Quote</a>
        <a href="/">Ask a Question</a>
        <a href="/">Notes</a>
        {#if loggedIn}
            <a href="/profile">Profile</a>
        {/if}
        <Dialog.Root>
            <Dialog.Trigger>
                <Button class="bg-[#ECEFF3] text-primary hover:text-white">
                    Create a Demo Room
                </Button>
            </Dialog.Trigger>
            <Dialog.Content>
                <Dialog.Header>
                    <Dialog.Title>Create a Room</Dialog.Title>
                </Dialog.Header>
                <form use:form
                    action='/?/create-room'
                    method='POST'
                    use:enhance={() => {
                        return async ({ result }) => {
                        console.log('join results', result);
                        if (result.success && result.data.url) {
                            toast.success('Successfully joined');
                            goto(result.data.url);
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
                    <Button class="bg-[#ECEFF3] text-primary hover:text-white" type="submit">
                        Create Room
                    </Button>
                </form>
            </Dialog.Content>
        </Dialog.Root>

        <Dialog.Root>
            <Dialog.Trigger>
                <Button class="bg-[#ECEFF3] text-primary hover:text-white">
                    Join a Demo Room
                </Button>
            </Dialog.Trigger>
            <Dialog.Content>
                <Dialog.Header>
                    <Dialog.Title>Enter URL</Dialog.Title>
                </Dialog.Header>
                <form use:form
                    action='/?/join-room'
                    method='POST'
                    use:enhance={() => {
                        return async ({ result }) => {
                            console.log('join results', result);
                            if (result.success && result.url) {
                                toast.success('Successfully joined');
                                goto(result.url);
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
                    <input 
                        type="text" 
                        name="dailyUrl"
                        placeholder="Enter URL" 
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        use:validators={[required, url]}
                    />
                    <HintGroup for="dailyUrl">
                        <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                            <Hint on="required"><HintValidate>URL is required</HintValidate></Hint>
                            <Hint on="url" hideWhenRequired><HintValidate>URL is not valid</HintValidate></Hint>
                        </div>
                    </HintGroup>
                    <Button class="bg-[#ECEFF3] text-primary hover:text-white" type="submit" disabled={!$form.valid}>
                        Join with URL
                    </Button>
                </form>
            </Dialog.Content>
        </Dialog.Root>
    </div>
{/if}
{/if}