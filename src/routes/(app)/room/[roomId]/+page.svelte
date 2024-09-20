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
    import { Calendar, CircleUser, Quote, ShareIcon, MicOff, Settings } from 'lucide-svelte';
    import CreateQuote from '$lib/components/room/create-quote.svelte';
    import Notes from '$lib/components/room/notes.svelte';
    import ScheduleMeeting from '$lib/components/room/schedule-meeting.svelte';
    import InviteRepresentative from '$lib/components/room/invite-representative.svelte';
    import Share from '$lib/components/room/share.svelte';

    export let data;

    if (data.isLoggedIn == false && browser) {
        goto('/login');
    }

    let user = data.user;
    let name = user ? user.name : '';
    let representatives = data.representatives;
    
    const host = $page.url.pathname.split('/').pop().split('-').pop();
    console.log('host', host);
    
    const isHost = host === (user ? user.id : '');
    
    let callObject;
    let participants = [];
    let loading = true;
    let deviceError = false;
    let hasNewNotification = false;
    let scheduleOpen = false;

    $:{
        console.log('participants list', participants)
    }
    $: screensList = participants?.filter((p) => p?.audio);
    
    const clearNotification = () => (hasNewNotification = false);
    const joinURL = $page.url.href;

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
        console.log('new app message', e?.data);
        if (!e?.data?.name && !e?.data?.text) return;
        chatMessages.update((messages) => [...messages, e?.data]);
        console.log('chatMessages', $chatMessages);
        hasNewNotification = true;
    };

    const fetchRooms = async () => {
        try {
            const response = await fetch('https://api.daily.co/v1/rooms?limit=100', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PUBLIC_DAILY_API_KEY}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch rooms');
            }
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching rooms:', error);
            toast('Error fetching rooms');
            return [];
        }
    };

    const createAndJoinCall = async () => {
        const roomName = $page.url.pathname.split('/').pop();
        console.log('page', roomName);
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
        console.log('fetched rooms', rooms);
        const room = rooms.find(room => room.name === roomName);
        console.log(room);
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
        callObject = daily.createCallObject({
            url,
            userName: name,
            audioSource: true,
            videoSource: false,
            dailyConfig: {
                audioSource: true,
                videoSource: false,
                bandwidth: {
                    kbs: 4000
                }
            }
        });

        callObject
            .on('joining-meeting', updateParticpants)
            .on('joined-meeting', handleJoinedMeeting)
            .on('participant-joined', updateParticpants)
            .on('participant-left', updateParticpants)
            .on('participant-updated', updateParticpants)
            .on('error', handleError)
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
        callObject.leave();
        callObject.destroy();
        callObject
            .off('joining-meeting', updateParticpants)
            .off('joined-meeting', handleJoinedMeeting)
            .off('participant-joined', updateParticpants)
            .off('participant-left', updateParticpants)
            .off('track-started', updateParticpants)
            .off('track-stopped', updateParticpants)
            .off('participant-left', updateParticpants)
            .off('error', handleError)
            .off('app-message', handleAppMessage);
    });

    const handleScheduleClose = () => {
        scheduleOpen = false;
    };

    function srcObject(node, stream) {
        node.srcObject = stream;
        return {
            update(newStream) {
                if (node.srcObject != newStream) {
                    node.srcObject = newStream;
                }
            }
        };
    }
</script>

<sveltekit:head>
    <title>Daily call</title>
</sveltekit:head>

<div class="h-screen min-w-full bg-[#9d9d9f] relative">
    <div class="h-full">
        <div class="flex items-center h-full pt-6 pb-24">
            <div class="w-14 h-full bg-red flex flex-col gap-4">
                <Dialog.Root>
                    <Dialog.Trigger>
                        <Button variant="ghost" size="icon" class="w-full">
                            <ShareIcon scale={1.3} color="#fff"/>
                        </Button>
                    </Dialog.Trigger>
                    <Dialog.Content class="p-4 rounded-lg shadow-lg">
                        <Share {joinURL} scale={1.3} color="#fff" />
                    </Dialog.Content>
                </Dialog.Root>
                <Dialog.Root>
                    <Dialog.Trigger>
                        <Button variant="ghost" size="icon" class="w-full">
                            <CircleUser scale={1.3} color="#fff"/>
                        </Button>
                    </Dialog.Trigger>
                    <Dialog.Content class="p-4 rounded-lg shadow-lg">
                        <InviteRepresentative {representatives} />
                    </Dialog.Content>
                </Dialog.Root>
                <Dialog.Root bind:open={scheduleOpen}>
                    <Dialog.Trigger>
                        <Button variant="ghost" size="icon" class="w-full">
                            <Calendar scale={1.3} color="#fff"/>
                        </Button>
                    </Dialog.Trigger>
                    <Dialog.Content class="p-4 rounded-lg w-auto bg-transparent">
                        <div class="w-full bg-transparent">
                            <ScheduleMeeting userId={user.id} on:close={handleScheduleClose} />
                        </div>
                    </Dialog.Content>
                </Dialog.Root>
                <Notes scale={1.3} color="#fff"/>
                <Dialog.Root>
                    <Dialog.Trigger>
                        <Button variant="ghost" size="icon" class="w-full">
                            <Quote scale={1.3} color="#fff"/>
                        </Button>
                    </Dialog.Trigger>
                    <Dialog.Content class="rounded-lg bg-transparent">
                        <CreateQuote />
                    </Dialog.Content>
                </Dialog.Root>
            </div>
            <div class="w-full h-full bg-green-500">
                {#each participants as participant}
                {participant.user_name}
                
                <VideoTile {callObject} {participant} {screensList} host={isHost} {name} />
                    {#if participant.tracks.screenVideo && participant.tracks.screenVideo.state === 'playable'}
                        <video autoplay playsinline use:srcObject={new MediaStream([participant.tracks.screenVideo.track])}></video>
                        <audio autoplay playsinline use:srcObject={new MediaStream([participant.tracks.screenAudio.track])}></audio>
                    {/if}
                {/each}
            </div>
            <div class="w-14 h-full bg-red flex flex-col gap-4 justify-end">
                <Chat {callObject} {hasNewNotification} on:clear-notification={clearNotification} />
            </div>
        </div>
    </div>
    <div class="absolute inset-x-0 bottom-0 h-16 bg-[#666669] w-full flex items-center justify-between px-14">
        <div class="room-name text-white">Room name</div>
        <div class="controls flex items-center gap-3">
            <button class="flex justify-center items-center rounded-full bg-[#707172] h-10 w-10 hover:bg-white text-black">
                <MicOff color="#fff" size={24} class="hover:text-black"/>
            </button>
            <button class="flex justify-center items-center rounded-full bg-[#707172] h-10 w-10 hover:bg-white text-black">
                <Settings color="#fff" size={24} class="hover:text-black"/>
            </button>
        </div>
        <div class="leave-room">
            <Button variant="destructive">
                Leave Room
            </Button>
        </div>
    </div>
</div>