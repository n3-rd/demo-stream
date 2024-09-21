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
	import { onMount } from 'svelte';

    export let loggedIn = false;
    export let user;
    export let inRoom;
    let isMenuOpen = false;
    let pageRoute = $page;
    let isInMeeting: boolean;
    let representatives = [];
    let isJoinDialogOpen = false;

    $: {
        console.log('route',pageRoute);
        // isInMeeting = pageRoute.pathname.includes('room');
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

    onMount(() => {
        fetchRepresentatives();
    });


    function toggleMenu() {
        isMenuOpen = !isMenuOpen;
    }

    const form = useForm();
</script>

{#if !inRoom}
<div class="navbar flex items-center justify-between bg-white px-4 py-4 md:px-9 md:py-7">
    <a class="logo" href="/">
        <img src="/logo/main-logo.svg" alt="clearsky" class="h-9 w-[131px]" />
    </a>


    
    <!-- <div class="flex gap-4">

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

    <Dialog.Root open={isJoinDialogOpen} on:close={() => isJoinDialogOpen = false}>
        <Dialog.Trigger>
            <Button class="bg-[#ECEFF3] text-primary hover:text-white" on:click={() => isJoinDialogOpen = true}>
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
                            isJoinDialogOpen = false;
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
    </div> -->


 </div>
{/if} 