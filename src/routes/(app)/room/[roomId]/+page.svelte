<script>
    import { onDestroy, onMount } from 'svelte';
    import daily from '@daily-co/daily-js';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { browser } from '$app/environment';
    import VideoTile from '$lib/call/VideoTile.svelte';
    import WaitingForOthersTile from '$lib/call/WaitingForOthersTile.svelte';
    import Chat from '$lib/call/Chat.svelte';
    import Loading from '$lib/call/Loading.svelte';
    import PermissionErrorMessage from '$lib/call/PermissionErrorMessage.svelte';
    import { chatMessages, dailyErrorMessage, username } from '../../../../store';
    import { PUBLIC_DAILY_DOMAIN, PUBLIC_DAILY_API_KEY } from '$env/static/public';
    import { toast } from 'svelte-sonner';
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from '$lib/components/ui/button';
    import { Calendar, CircleUser, Quote } from 'lucide-svelte';
    import CreateQuote from '$lib/components/room/create-quote.svelte';
    import Notes from '$lib/components/room/notes.svelte';
    import ScheduleMeeting from '$lib/components/room/schedule-meeting.svelte';
	import InviteRepresentative from '$lib/components/room/invite-representative.svelte';

    export let data;
    let user = data.user;
    let representatives = data.representatives;

    let callObject;
    let participants = [];
    let loading = true;
    let deviceError = false;
    let hasNewNotification = false;
    $: screensList = participants?.filter((p) => p?.screen);

    const clearNotification = () => (hasNewNotification = false);

    const destroyCall = async () => {
        if (!callObject) return;
        await callObject.leave();
        await callObject.destroy();
    };

    const goHome = async () => {
        await destroyCall();
        document?.body?.classList?.remove('in-call');
        goto(`/`);
    };

    const clearDeviceError = () => {
        goHome();
        deviceError = false;
    };

    const handleJoinedMeeting = (e) => {
        console.log('[joined-meeting]', e);
        loading = false;
        updateParticpants(e);
    };

    const updateParticpants = (e) => {
        console.log('[update participants]', e);
        if (!callObject) return;
        participants = Object.values(callObject.participants());
    };

    const handleError = async () => {
        console.error('Error: ending call and returning to home page');
        await goHome();
    };

    const handleDeviceError = () => {
        deviceError = true;
    };

    const handleAppMessage = (e) => {
        if (!e?.data?.name && !e?.data?.text) return;
        $chatMessages = [...$chatMessages, e?.data];
        hasNewNotification = true;
    };

    const fetchRooms = async () => {
        try {
            const response = await fetch('https://api.daily.co/v1/rooms?limit=100', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PUBLIC_DAILY_API_KEY}` // Replace with your actual token
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch rooms');
            }
            const data = await response.json();
            return data.data || []; // Ensure it returns an array
        } catch (error) {
            console.error('Error fetching rooms:', error);
            toast('Error fetching rooms');
            return [];
        }
    };

    const createAndJoinCall = async () => {
        const roomName = $page.url.pathname.split('/').pop();
        console.log('page',roomName)
        const domain = PUBLIC_DAILY_DOMAIN;
        if (!roomName || !domain) {
            toast('Invalid room or domain');
            goto('/');
            return;
        }

        const rooms = await fetchRooms();
        if (!Array.isArray(rooms)) {
            toast('Error fetching rooms');
            goto('/');
            return;
        }
        console.log('fetched rooms', rooms)
        const room = rooms.find(room => room.name === roomName);
        console.log(room)
        if (!room) {
            toast('Room not found or not available yet');
            goto('/');
            return;
        }

        const currentTime = Math.floor(Date.now() / 1000);
        if (room.config && room.config.nbf && currentTime < room.config.nbf) {
            toast('Room has not yet started');
            goto('/');
            return;
        }

        const url = `https://${domain}.daily.co/${roomName}`;
        callObject = daily.createCallObject({ url, userName: $username });
        callObject
            .on('joining-meeting', updateParticpants)
            .on('joined-meeting', handleJoinedMeeting)
            .on('participant-joined', updateParticpants)
            .on('participant-left', updateParticpants)
            .on('participant-updated', updateParticpants)
            .on('error', handleError)
            .on('camera-error', handleDeviceError)
            .on('app-message', handleAppMessage);

        try {
            await callObject.join();
            dailyErrorMessage.set('');
        } catch (e) {
            dailyErrorMessage.set(e);
            toast('Error joining the call');
        }
    };

    onMount(() => {
        if (!browser) return;
        createAndJoinCall();
        if (!document) return;
        document.body.classList.add('in-call');
    });

    onDestroy(() => {
        if (!callObject) return;
        callObject
            .off('joining-meeting', updateParticpants)
            .off('joined-meeting', handleJoinedMeeting)
            .off('participant-joined', updateParticpants)
            .off('participant-left', updateParticpants)
            .off('track-started', updateParticpants)
            .off('track-stopped', updateParticpants)
            .off('participant-left', updateParticpants)
            .off('error', handleError)
            .off('camera-error', handleDeviceError)
            .off('app-message', handleAppMessage);
    });
</script>

<sveltekit:head>
    <title>Daily call</title>
</sveltekit:head>

<div class="flex flex-start mb-4">
    <button class="border border-gray-300 rounded-lg ml-4 mb-4 px-2 py-1 bg-white cursor-pointer text-xs uppercase font-bold" on:click={goHome}>Home</button>
    <p class="text-turquoise ml-4 text-sm">{$page.url.href}</p>
</div>
{#if loading}
    <div class="m-auto">
        <Loading />
    </div>
{:else if deviceError}
    <PermissionErrorMessage on:clear-device-error={clearDeviceError} />
{:else}
    {#if screensList?.length > 0}
        <VideoTile {callObject} screen={screensList[0]} />
    {/if}
    <div class="flex flex-wrap">
        {#each participants as participant}
            <VideoTile {callObject} {participant} {screensList} />
        {/each}
        {#if participants?.length === 1}
            <WaitingForOthersTile />
        {/if}
        <div class="absolute bottom-4 right-4 flex flex-col gap-4 z-30">
            <Chat {callObject} {hasNewNotification} on:clear-notification={clearNotification} />
            <Dialog.Root>
                <Dialog.Trigger>
                    <Button variant="ghost" size="icon" class="w-full">
                        <CircleUser scale={1.3} />
                    </Button>
                </Dialog.Trigger>
                <Dialog.Content class="p-4 bg-gray-800 rounded-lg shadow-lg">
                    <InviteRepresentative {representatives} />
                </Dialog.Content>
            </Dialog.Root>
            <Dialog.Root >
                <Dialog.Trigger>
                    <Button variant="ghost" size="icon" class="w-full">
                        <Calendar scale={1.3} />
                    </Button>
                </Dialog.Trigger>
                <Dialog.Content class="p-4 rounded-lg w-auto bg-transparent">
                    <div class="w-full bg-transparent">
                        <ScheduleMeeting userId={user.id} />
                    </div>
                </Dialog.Content>
            </Dialog.Root>
            <Notes />
            <Dialog.Root>
                <Dialog.Trigger>
                    <Button variant="ghost" size="icon" class="w-full">
                        <Quote scale={1.3} />
                    </Button>
                </Dialog.Trigger>
                <Dialog.Content class="rounded-lg bg-transparent">
                    <CreateQuote />
                </Dialog.Content>
            </Dialog.Root>
        </div>
    </div>
{/if}