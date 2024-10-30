<script>
	import { page } from '$app/stores';
    import { onDestroy, onMount } from 'svelte';
    import daily from '@daily-co/daily-js';
    import { goto } from '$app/navigation';
    import { browser } from '$app/environment';
    import VideoTile from '$lib/call/VideoTile.svelte';
    import Loading from '$lib/call/Loading.svelte';
    import PermissionErrorMessage from '$lib/call/PermissionErrorMessage.svelte';
    import { chatMessages, dailyErrorMessage, username, pickerOpen } from '../../../../store';
    import { PUBLIC_DAILY_DOMAIN, PUBLIC_DAILY_API_KEY, PUBLIC_ANT_MEDIA_URL } from '$env/static/public';
    import { toast } from 'svelte-sonner';
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from '$lib/components/ui/button';
    import { Calendar, CircleUser, Quote, ShareIcon, MicOff, Settings, Clapperboard, MessageSquareDashed, SendHorizontal, UsersRound, Mic, Code } from 'lucide-svelte';
    import CreateQuote from '$lib/components/room/create-quote.svelte';
    import Notes from '$lib/components/room/notes.svelte';
    import ScheduleMeeting from '$lib/components/room/schedule-meeting.svelte';
    import InviteRepresentative from '$lib/components/room/invite-representative.svelte';
    import Share from '$lib/components/room/share.svelte';
    import { activeSpeaker, currentVideoUrl } from '$lib/callStores';
    import GreetingPopup from '$lib/call/GreetingPopup.svelte';
	import { playVideoStore } from '$lib/stores/playStore';
	import Participants from '$lib/call/Participants.svelte';
	import Embed from '$lib/components/room/embed.svelte';
	import RepresentativeIndicator from '$lib/components/room/representative-indicator.svelte';
    import NameInputModal from '$lib/components/name-input-modal.svelte';
    import { antMediaService } from '$lib/antmedia';

    export let data;

    let user = data.user;
    let isAuthenticated = !!user;
    let name = isAuthenticated ? user.name : '';
    let representatives = data.representatives;
    let users = data.users;
    let roomId = data.roomId;
    let videoRepresentatives = data.videoRepresentativesInfo;
    console.log('videoRepresentatives', videoRepresentatives);
    
    const host = $page.url.pathname.split('/').pop().split('-').pop();
    console.log('host', host);
    
 

  
    // Check if currentVideoUrl is set, if not use associated_video from roomId
    $: {
         videoURL = $currentVideoUrl || `/static/video${roomId[0].associated_video}`;
        if (!$currentVideoUrl && roomId[0].associated_video) {
            currentVideoUrl.set(roomId[0].associated_video); // Set the current video URL from the database
        }
    }
    
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
    let isMicMuted = false;

    $: screensList = participants?.filter((p) => p?.tracks?.screenVideo?.state === 'playable');

    let isHost = false;

    function updateHostStatus() {
        if (callObject) {
            const localParticipant = callObject.participants().local;
            isHost = host === (user ? user.id : '') || localParticipant.user_name === host;
        } else {
            isHost = host === (user ? user.id : '');
        }
    }

    let videoURL;
    console.log('callObject', callObject);
    console.log('local participant', callObject?.participants().local);
 
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

    const updateParticpants = (e) => {
      console.log('updateParticpants', e);
      participants.push(e);
      participants.map((participant) => {
        if (participant.id === e.id) {
          participant.isScreenSharing = e.isScreenSharing;
        }
      });
    };

    const handleError = async () => {
        await goHome();
    };

    const handleDeviceError = () => {
        deviceError = true;
    };

    const handleAppMessage = (e) => {
        if (!e?.data?.name && !e?.data?.text) return;
        chatMessages.update((messages) => [...messages, e?.data]);
        hasNewNotification = true;
    };

    

    let showNameModal = !isAuthenticated;

    function handleNameSubmitted(event) {
        const submittedName = event.detail;
        console.log('submittedName', submittedName);
        username.set(submittedName);
        showNameModal = false;
        name = submittedName;
        console.log('name submitted', name);
        createAndJoinCall();
    }

    const createAndJoinCall = async () => {
        const roomName = $page.url.pathname.split('/').pop();
        globRoomName = roomName;
        
        try {
            console.log('Initializing AntMedia service...');
            
            const serverUrl = PUBLIC_ANT_MEDIA_URL || 'test.antmedia.io:5443';
            
            console.log('Connecting to:', serverUrl);
            
            await antMediaService.initialize(
                serverUrl,
                'localVideoId',
                {
                    onParticipantJoined: (participant) => {
                        console.log('participant joined', participant);
                        participants = [...participants, participant];
                        loading = false;
                    },
                    onParticipantLeft: (streamId) => {
                        console.log('participant left', streamId);
                        participants = participants.filter(p => p.streamId !== streamId);
                    },
                    onLocalStream: (stream) => {
                        const audioTracks = stream.getAudioTracks();
                        if (audioTracks.length > 0) {
                            audioTracks[0].enabled = !isMicMuted;
                        }
                    },
                    onError: (error, message) => {
                        console.error('WebRTC Error:', error, message);
                        toast.error(typeof message === 'string' ? message : 'Connection error');
                    },
                    onSuccess: (message) => {
                        toast.success(message);
                        console.log('AntMedia service initialized and joined room');
                        
                        console.log('participants',  antMediaService.getParticipants());
                      
                    }
                }
            );

            console.log('Joining room:', roomName);
            const cleanName = name?.trim() || 'Guest';
            await antMediaService.joinRoom(roomName, cleanName);
            updateHostStatus();
            
        } catch (e) {
            console.error('Failed to join room:', e);
            toast.error(e.message || 'Failed to connect to the room');
            handleError();
        }
    };

    onMount(() => {
        if (!browser) return;
        if (isAuthenticated ) {
            createAndJoinCall();
        }
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

    const toggleMicrophone = () => {
    isMicMuted = !isMicMuted;
    
    // Get the local stream from AntMedia service
    const localStream = antMediaService.getLocalStream();
    if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0) {
            audioTracks[0].enabled = !isMicMuted;
        }
    }
};

</script>

<sveltekit:head>
    <title>Daily call</title>
</sveltekit:head>

<GreetingPopup {name} host={isHost} />

{#if deviceError}
    <PermissionErrorMessage on:close={clearDeviceError} />
{/if}

{#if showNameModal}
  <NameInputModal on:nameSubmitted={handleNameSubmitted} room={roomId[0]}/>
{:else}
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
                            <img src="/icons/icon-representative.svg" alt="user" class="w-5 h-5"/>
                        </Button>
                    </Dialog.Trigger>
                    <Dialog.Content class="p-4 rounded-lg shadow-lg">
                        <InviteRepresentative representatives={videoRepresentatives} />
                    </Dialog.Content>
                </Dialog.Root>
                <Dialog.Root bind:open={scheduleOpen}>
                    <Dialog.Trigger>
                        <Button variant="ghost" size="icon" class="w-full hover:bg-red-700">
                            <img src="/icons/icon-calendar.svg" alt="calendar" class="w-5 h-5"/>
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
                            <img src="/icons/icon-quotes.svg" alt="quote" class="w-5 h-5"/>
                        </Button>
                    </Dialog.Trigger>
                    <Dialog.Content class="rounded-lg bg-transparent">
                        <CreateQuote />
                    </Dialog.Content>
                </Dialog.Root>
                <!-- <Dialog.Root>
                    <Dialog.Trigger>
                        <Button variant="ghost" size="icon" class="w-full hover:bg-red-700">
                          <Code scale={1.3} color="#fff"/>
                        </Button>
                    </Dialog.Trigger>
                    <Dialog.Content class="rounded-lg bg-transparent">
                        <Embed roomUrl={joinURL} />
                    </Dialog.Content>
                </Dialog.Root> -->
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
                        <VideoTile {callObject} {participant} {screensList} host={isHost} {name} {roomId} />
                        {#if participant.tracks.screenVideo && participant.tracks.screenVideo.state === 'playable'}
                            <video 
                                autoplay 
                                playsinline 
                                use:srcObject={new MediaStream([participant.tracks.screenVideo.track])}
                                class="w-full h-full object-contain">
                                <track kind="captions" />
                            </video>
                            <audio 
                                autoplay 
                                playsinline 
                                use:srcObject={new MediaStream([participant.tracks.screenAudio.track])}>
                            </audio>
                        {:else if participant.tracks.screenVideo && participant.tracks.screenVideo.state === 'loading'}
                            <Loading />
                        {/if}
                    {/each}
                </div>

                <!-- Test panel with Chat -->
                <div class="w-0 bg-[#666669] h-full overflow-y-auto flex flex-col panel" id="chatPanel">
                    <div class="flex justify-between items-center p-4 border-b bg-[#47484b]">
                        <h2 class="text-xl font-bold text-white">Chat</h2>
                    </div>
                    <div class="flex-grow flex flex-col gap-4 p-4 overflow-y-auto">
                        {#each $chatMessages as message}
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

    <RepresentativeIndicator 
    representatives={videoRepresentatives} 
    participants={participants} 
    {callObject}
/>
    <!-- Bottom controls bar -->
    <div class="absolute inset-x-0 bottom-0 h-16 bg-[#666669] w-full flex items-center justify-between px-14">
        <div class="room-name text-white">{roomId[0].associated_video_name}</div>
        <div class="controls flex items-center gap-3">
            <button 
                class="flex justify-center items-center rounded-full bg-[#707172] h-10 w-10 hover:bg-white hover:text-black"
                on:click={toggleMicrophone}
            >
                {#if isMicMuted}
                    <MicOff color="#fff" size={24} class="hover:text-black"/>
                {:else}
                    <Mic color="#fff" size={24} class="hover:text-black"/>
                {/if}
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
{/if}
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


