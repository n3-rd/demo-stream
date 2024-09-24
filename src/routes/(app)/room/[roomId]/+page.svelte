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
    import { chatMessages, dailyErrorMessage, username, pickerOpen } from '../../../../store';
    import { PUBLIC_DAILY_DOMAIN, PUBLIC_DAILY_API_KEY } from '$env/static/public';
    import { toast } from 'svelte-sonner';
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from '$lib/components/ui/button';
    import { Calendar, CircleUser, Quote, ShareIcon, MicOff, Settings, Clapperboard, MessageSquareDashed, SendHorizontal, UsersRound, Mic } from 'lucide-svelte';
    import CreateQuote from '$lib/components/room/create-quote.svelte';
    import Notes from '$lib/components/room/notes.svelte';
    import ScheduleMeeting from '$lib/components/room/schedule-meeting.svelte';
    import InviteRepresentative from '$lib/components/room/invite-representative.svelte';
    import Share from '$lib/components/room/share.svelte';
    import { currentVideoUrl } from '$lib/callStores';
    import GreetingPopup from '$lib/call/GreetingPopup.svelte';
    import Controls from '$lib/call/Controls.svelte';
    import VideoStreamerTile from '$lib/call/VideoStreamerTile.svelte';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
	import { playVideoStore } from '$lib/stores/playStore';
	import { PlayCircle } from 'lucide-svelte';
	import Participants from '$lib/call/Participants.svelte';


    export let data;

    if (data.isLoggedIn == false && browser) {
        goto('/login');
    }

    let user = data.user;
    let name = user ? user.name : '';
    let representatives = data.representatives;
    let users = data.users;
    
    const host = $page.url.pathname.split('/').pop().split('-').pop();
    console.log('host', host);
    
    const isHost = host === (user ? user.id : '');

    const videoURL = $currentVideoUrl;
    
    let callObject;
    let participants = [];
    let loading = true;
    let deviceError = false;
    let hasNewNotification = false;
    let scheduleOpen = false;
    let chatIsOpen = false;
    let chIsOpen = true;
    let newText = '';
    let globRoomName = '';

    $: {
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
        participants = Object.values(callObject.participants()).map(participant => {
            return {
                ...participant,
                isScreenSharing: participant.tracks.screenVideo?.state === 'playable'
            };
        });
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
        globRoomName = roomName;
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
            .on('local-screen-share-started', updateParticpants)
            .on('loaded', updateParticpants)
            .on('error', handleError)
            .on('app-message', handleAppMessage)
            .on('screen-share-started', handleScreenShareStarted)
            .on('screen-share-stopped', handleScreenShareStopped)
            .on('track-started', updateParticpants)
            .on('track-stopped', updateParticpants);

        try {
            await callObject.join();
            dailyErrorMessage.set('');
        } catch (e) {
            dailyErrorMessage.set(e);
            toast('Error joining the call');
        }
    };

    $:{
        if($playVideoStore){
          updateParticpants();
        }
    }

    const handleScreenShareStarted = (event) => {
        console.log('Screen share started', event);
        updateParticpants(event);
    };

    const handleScreenShareStopped = (event) => {
        console.log('Screen share stopped', event);
        updateParticpants(event);
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

    const togglePicker = () => {
        pickerOpen.set(!$pickerOpen);
    };

    function togglech() {
        chIsOpen = !chIsOpen;
        const ch = document.getElementById('ch');
        if (chIsOpen) {
            ch.style.width = '30rem';
        } else {
            ch.style.width = '0px';
        }
    }

    function togglePanel(id) {
        if(id === 'chatPanel'){
            document.getElementById('participantsPanel').style.width = '0px';
        }
        if(id === 'participantsPanel'){
            document.getElementById('chatPanel').style.width = '0px';
        }
        const panel = document.getElementById(id);
        panel.style.width = panel.style.width === '30rem' ? '0px' : '30rem';
    }

    function toggleChat() {
        chatIsOpen = !chatIsOpen;
        if (chatIsOpen && hasNewNotification) {
            clearNotification();
        }
    }

    const sendMessage = () => {
        if (!callObject) return;
        const local = callObject.participants().local.user_name || 'Guest';
        const newMessage = {
            name: local,
            text: newText
        };
        callObject.sendAppMessage(newMessage);
        chatMessages.update(messages => [...messages, newMessage]);
        newText = '';
    };

    const leaveRoom = async () => {
        if (!callObject) return;
        await destroyCall();
        document?.body?.classList?.remove('in-call');
        playVideoStore.set(false);  // Reset the video play state
        goto('/');  // Navigate back to the home page
    };
</script>

<sveltekit:head>
    <title>Daily call</title>
</sveltekit:head>

<GreetingPopup {name} host={isHost} />

{#if deviceError}
    <PermissionErrorMessage on:close={clearDeviceError} />
{/if}

<div class="h-screen min-w-full bg-[#9d9d9f] relative overflow-hidden">
    <div class="h-full">
        <div class="flex items-center h-full pt-6 pb-24">
            <!-- Left sidebar -->
            <div class="w-14 h-full bg-red flex flex-col gap-4">
                <Dialog.Root>
                    <Dialog.Trigger>
                        <Button variant="ghost" size="icon" class="w-full hover:bg-red-700">
                            <ShareIcon scale={1.3} color="#fff"/>
                        </Button>
                    </Dialog.Trigger>
                    <Dialog.Content class="p-4 rounded-lg shadow-lg">
                        <Share {joinURL} scale={1.3} color="#fff" />
                    </Dialog.Content>
                </Dialog.Root>
                <Dialog.Root>
                    <Dialog.Trigger>
                        <Button variant="ghost" size="icon" class="w-full hover:bg-red-700">
                            <CircleUser scale={1.3} color="#fff"/>
                        </Button>
                    </Dialog.Trigger>
                    <Dialog.Content class="p-4 rounded-lg shadow-lg">
                        <InviteRepresentative {representatives} />
                    </Dialog.Content>
                </Dialog.Root>
                <Dialog.Root bind:open={scheduleOpen}>
                    <Dialog.Trigger>
                        <Button variant="ghost" size="icon" class="w-full hover:bg-red-700">
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
                        <Button variant="ghost" size="icon" class="w-full hover:bg-red-700">
                            <Quote scale={1.3} color="#fff"/>
                        </Button>
                    </Dialog.Trigger>
                    <Dialog.Content class="rounded-lg bg-transparent">
                        <CreateQuote />
                    </Dialog.Content>
                </Dialog.Root>
                <Button variant="ghost" size="icon" class="w-full hover:bg-red-700" on:click={togglePicker}>
                    <Clapperboard scale={1.3} color="#fff"/>
                </Button>
            </div>

            <!-- Main content area  -->
            <div class="flex-grow h-full bg-[#9d9d9f] relative flex gap-2">
                {#if loading}
                    <div class="h-full w-full z-[9] absolute flex justify-center items-center bg-[#9d9d9f]">
                        <Loading />
                    </div>
                {/if}

                <!-- Video container -->
                <div class="flex-grow h-full relative">
                    {#each participants as participant}
                        <VideoTile {callObject} {participant} {screensList} host={isHost} {name} {videoURL} />
                        {#if participant.tracks.screenVideo && participant.tracks.screenVideo.state === 'playable'}
                        {#if !host}
                            <video autoplay playsinline use:srcObject={new MediaStream([participant.tracks.screenVideo.track])}
                                class="w-full h-full object-cover"
                               
                                >
                            </video>
                            {/if}
                            <audio autoplay playsinline use:srcObject={new MediaStream([participant.tracks.screenAudio.track])}></audio>
                        {:else if participant.tracks.screenVideo && participant.tracks.screenVideo.state === 'loading'}
                            <Loading />
                        {/if}
                    {/each}
                </div>

                {#if host && !$playVideoStore}
                <div class="play-button h-screen min-w-full absolute -left-[10rem] flex justify-center items-center z-[999]">
                    <button on:click={() => playVideoStore.set(true)}>
                        <PlayCircle size={48} class="cursor-pointer" color="#fff"/>
                    </button>
                </div>
            {/if}
        

                <!-- Test panel with Chat -->
                <div class="w-0 bg-[#666669] h-full overflow-y-auto flex flex-col panel" id="chatPanel">
                    <div class="flex justify-between items-center p-4 border-b bg-[#47484b]">
                        <h2 class="text-xl font-bold text-white">Chat</h2>
                    </div>
                    
                   
                        <div class="flex-grow flex flex-col gap-4 p-4 overflow-y-auto">
                            {#each $chatMessages as message}
                            <!-- {console.log('message', message)} -->
                            <div class="flex gap-2 {message.name == name? "flex-row-reverse": "flex-row"}">
                                <img class="h-12 w-12 rounded-full" src={`https://ui-avatars.com/api/?name=${message.name}"`} alt="participant placeholder"/>
                                <div class="flex flex-col flex-1 gap-1">
                                   
                                        <div class="flex flex-col rounded-xl text-sm {message.name == name ? "bg-[#d8e1ed] text-black" : "bg-[#9d9d9f] text-white"} flex-1 px-2 py-2">
                                    <div class="text-lg font-medium py-3 ">{message.name}</div>
                                    <div>
                                        <p>{message.text}</p>

                                    </div>
                                        </div>
                                    
                                </div>
                            </div>
                            {/each}
                        </div>
                        <form on:submit|preventDefault={sendMessage} class="flex justify-between border-t border-gray-300 p-4">
                            <div class="relative flex-grow">
                              <input
                                type="text"
                                placeholder="Type a message..."
                                bind:value={newText}
                                class="w-full border-none rounded py-2 px-4 pr-10 text-sm bg-[#47484b] text-white placeholder-gray-400"
                              />
                              <button
                                type="submit"
                                class="absolute right-2 top-1/2 transform -translate-y-1/2 text-white hover:text-primary-dark"
                              >
                                <SendHorizontal class="w-5 h-5" />
                              </button>
                            </div>
                          </form>
                        
                   
                </div>

                <div class="w-0 bg-[#666669] h-full overflow-y-auto flex flex-col panel" id="participantsPanel">
  <Participants {participants} {isHost} {name} {users} />
                   
                </div>

                
            </div>

<div class="flex flex-col gap-3 h-full justify-end">
 <!-- Right sidebar (Chat) -->
 <div class="w-14 h-auto bg-red flex flex-col gap-4 justify-end">
    <Button variant="ghost" size="icon" class="w-full hover:bg-red-700" on:click={()=>togglePanel('chatPanel')}>
        <MessageSquareDashed scale={1.3} color="#fff"/>
    </Button>
</div>

 <div class="w-14 h-auto bg-red flex flex-col gap-4 justify-end">
    <Button variant="ghost" size="icon" class="w-full hover:bg-red-700" on:click={()=>togglePanel('participantsPanel')}>
        <UsersRound scale={1.3} color="#fff"/>
    </Button>
</div>
</div>

           
        </div>
    </div>

    <!-- Bottom controls bar -->
    <div class="absolute inset-x-0 bottom-0 h-16 bg-[#666669] w-full flex items-center justify-between px-14">
        <div class="room-name text-white">{globRoomName}</div>
        <div class="controls flex items-center gap-3">
            <button class="flex justify-center items-center rounded-full bg-[#707172] h-10 w-10 hover:bg-white hover:text-black">
                <MicOff color="#fff" size={24} class="hover:text-black"/>
            </button>
            <button class="flex justify-center items-center rounded-full bg-[#707172] h-10 w-10 hover:bg-white hover:text-black">
                <Settings color="#fff" size={24} class="hover:text-black"/>
            </button>
        </div>
        <div class="leave-room">
            <Button variant="destructive" class="hover:bg-red-700" on:click={leaveRoom}>
                Leave Room
            </Button>
        </div>
    </div>
</div>

<style>
    .panel {
        transition: width 0.3s ease-in-out;
    }
    .hover\:bg-red-700:hover {
        background-color: #b91c1c;
    }
    .hover\:bg-white:hover {
        background-color: #ffffff;
    }
    .hover\:text-black:hover {
        color: #000000;
    }
    .hover\:bg-primary-dark:hover {
        background-color: #1f2937;
    }
</style>