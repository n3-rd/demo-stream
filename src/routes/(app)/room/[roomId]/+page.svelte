<script lang="ts">
import {
    PUBLIC_ANT_MEDIA_URL
} from '$env/static/public';
import {
    WebRTCAdaptor
} from "@antmedia/webrtc_adaptor";
import {
    page
} from "$app/stores";
import {
    onMount
} from "svelte";
import BottomBar from '$lib/components/layout/bottom-bar.svelte';
	import LeftBar from '$lib/components/layout/left-bar.svelte';
	import RightBar from '$lib/components/layout/right-bar.svelte';
	import { currentVideoUrl } from '$lib/callStores.js';
    import { sendMessage } from '$lib/helpers/sendMessage';
    import { getStreamInfo } from '$lib/helpers/getStreamInfo';
	import { anonymousUser } from '$lib/stores/anonymousUser.js';
	import NameInputModal from '$lib/components/name-input-modal.svelte';
	import RepresentativeIndicator from '$lib/components/room/representative-indicator.svelte';
    import { Button } from '$lib/components/ui/button';
    import { MessageSquareDashed, UsersRound } from 'lucide-svelte';
	import Participants from '$lib/call/Participants.svelte';
	import Chat from '$lib/call/Chat.svelte';
	import { chatMessages } from '$lib/stores/chatMessages';

export let data;


// State management
let webRTCAdaptor: any;
let urlRepresentativeName: string = '';
let anonymousUserId: string = '';
let hostUserId: string = '';
let isPlaying = false;
let isDataChannelOpen = false;
let isMicMuted = false;
let isCameraOff = false;
let allParticipants = {};
let meetingParticipants = [];
let isReconnectionInProgress = false;
let reconnecting = false;
let publishReconnected = false;
let playReconnected = false;
let isNoStreamExist = false;
const joinURL = $page.url.href;
let scheduleOpen = false;

// Add video state management
let videoPlayer;
let isVideoPlaying = false;
let currentVideoTime = 0;


// Add WebSocket state management
let wsConnection = null;
let isWsConnected = false;

// Add this near the top of your script section with other state management variables
let videoElements = new Map();

// $:{
//     console.log("meetingParticipants", meetingParticipants);
// }

// Function to initialize WebSocket connection
function initializeWebSocket() {
    if (wsConnection) {
        wsConnection.close();
    }

    wsConnection = new WebSocket(`${getWebSocketURL()}?target=origin`);
    
    wsConnection.onopen = () => {
        console.log('WebSocket connected');
        isWsConnected = true;
    };
    
    wsConnection.onclose = () => {
        console.log('WebSocket closed');
        isWsConnected = false;
        // Attempt to reconnect after a delay
        setTimeout(initializeWebSocket, 3000);
    };
    
    wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
        isWsConnected = false;
    };
}


// Room data
const roomName = $page.url.pathname.split("/").pop().split("&")[0];
const user = data.user;
const isAuthenticated = !!user;
const name = isAuthenticated ? user.name : "";
const representatives = data.representatives;
const users = data.users;
const roomIdentity = data.roomId;
const videoRepresentatives = data.videoRepresentativesInfo;
let isHost = false;
// ... existing code ...
const host = $page.url.pathname.split("/").pop().split("-").pop();
$:{
    isHost = host === (user ? user.id : "") || host == anonymousUserId
}
let isRepresentative = false;
$:{
    isRepresentative = $page.url.searchParams.get('representativeName') !== null;
}

console.log("host", host);
 console.log("isHost", isHost);
 console.log("anonymousUserId", anonymousUserId);
 console.log('page url', $page.url);
// ... existing code ...

// Stream configuration
let publishStreamId = null;
let showNameModal = !isAuthenticated;
const streamName = roomIdentity[0]?.associated_video_name;
const dcOnly = false;
const playOnly = false;

// WebRTC configuration
const mediaConstraints = {
    video: true,
    audio: !dcOnly
};

function getWebSocketURL() {
    // Implement your WebSocket URL logic here
    return `ws://${PUBLIC_ANT_MEDIA_URL}/WebRTCAppEE/websocket`
}

onMount(() => {
    if ($anonymousUser || isAuthenticated) {
        initializeWebRTC();
    }
    
    return () => {
        if (webRTCAdaptor) {
            webRTCAdaptor.stop(publishStreamId);
            webRTCAdaptor.stop(roomName);
        }
    };
});

function initializeWebRTC() {
    webRTCAdaptor = new WebRTCAdaptor({
        websocket_url: getWebSocketURL(),
        mediaConstraints,
        localVideoId: "localVideo",
        isPlayMode: playOnly,
        onlyDataChannel: dcOnly,
        dataChannelEnabled: true,
        debug: true,
        callback: handleWebRTCCallback,
        callbackError: handleWebRTCError
    });
}

function handleWebRTCCallback(info: string, obj: any) {
    switch (info) {
        case "initialized":
            console.log("WebRTC initialized");
            
            joinRoom();
            break;
        case "broadcastObject":
            if (obj.broadcast === undefined) return;
            let broadcastObject = JSON.parse(obj.broadcast);

            if (obj.streamId === roomName) {
                handleMainTrackBroadcastObject(broadcastObject);
            } else {
                handleSubtrackBroadcastObject(broadcastObject);
            }
            break;
        case "newTrackAvailable":
            playVideo(obj);
            break;
        case "publish_started":
            isPlaying = true;
            webRTCAdaptor.getBroadcastObject(roomName);
            break;
        case "play_started":
            isPlaying = true;
            isNoStreamExist = false;
            webRTCAdaptor.getBroadcastObject(roomName);
            break;
        case "play_finished":
            removeAllRemoteVideos();
            isPlaying = false;
            break;
        case "data_channel_opened":
            isDataChannelOpen = true;
            // Initial sync when data channel opens
            if (isHost && videoPlayer) {
                setTimeout(handleVideoStateChange, 1000);
            }
            break;
        case "data_channel_closed":
            isDataChannelOpen = false;
            break;
        case "data_received":
            try {
                const data = JSON.parse(obj.data);
                let messageBody;
                if (data.messageBody) {
                    messageBody = JSON.parse(data.messageBody);
                }
                
                if (messageBody && messageBody.eventType === 'chat_message') {
                    handleChatMessage(messageBody);
                }
                
                if (messageBody && messageBody.eventType === 'video_sync') {
                    handleVideoSync(messageBody);
                }
            } catch (e) {
                console.error("Error parsing data message:", e);
            }
            break;
        case "data_sent":
            console.log("Data sent:", obj);
            break;            
        case "connected":
            console.log("Connected to", obj);
            break;
        case "peerconnection_created":
            console.log("PeerConnection created for", obj);
            break;
        case "sdp_received":
            console.log("SDP received for", obj);
            break;
            // Add other cases as needed
    }
}

function handleWebRTCError(error: string, message: string) {
    console.error("WebRTC Error:", error, message);
    // Implement error handling
}

function joinRoom() {
    if (!publishStreamId) {
        publishStreamId = generateRandomString(12);            
    }

    function handleChatMessage(messageBody) {
        console.log("messageBody", messageBody);
        chatMessages.update(messages => [...messages, messageBody]);
    }



    // Sanitize the name by removing any URL parameters and special characters
    const sanitizedName = (name || anonymousUserId).split('&')[0].replace(/[^a-zA-Z0-9-_]/g, '');
    const sanitizedRoomName = roomName.split('&')[0];

    if (!playOnly) {
        console.log('starting publish');
        webRTCAdaptor.publish(
            `${publishStreamId}-${sanitizedName}`,
            null,
            null,
            null,
            sanitizedName,
            roomIdentity[0].room_id
        );
    }

    console.log('starting play');
    webRTCAdaptor.play(sanitizedRoomName);
}

function leaveRoom() {
    allParticipants = {};
    webRTCAdaptor.stop(roomName);
    isPlaying = false;
    window.location.href = "/";

}

// Helper functions
function generateRandomString(length: number): string {
    return Math.random().toString(36).substring(2, length + 2);
}

setInterval(() => {
    getStreamInfo(roomName).then(streamInfo => {
        meetingParticipants = streamInfo.subTrackStreamIds;
    });
}, 5000);

// Add these handler functions
function handlePublishStarted() {
    console.log('Published successfully');
    isPlaying = true;
}

function handlePlayStarted() {
    console.log('Playing successfully66');
    isPlaying = true;
}

function muteLocalMic() {
    webRTCAdaptor.muteLocalMic();
    isMicMuted = true;
}

function unmuteLocalMic() {
    webRTCAdaptor.unmuteLocalMic();
    isMicMuted = false;
}

function toggleMicrophone() {
    if (isMicMuted) {
        unmuteLocalMic();
    } else {
        muteLocalMic();
    }
}

function turnOnCamera() {
    webRTCAdaptor.turnOnLocalCamera();
    isCameraOff = false;
}

function turnOffCamera() {
    webRTCAdaptor.turnOffLocalCamera();
    isCameraOff = true;
}

function toggleCamera() {
    if (isCameraOff) {
        turnOnCamera();
    } else {
        turnOffCamera();
    }
}

// Function to handle video state changes by host
function handleVideoStateChange() {
    if (!isHost || !videoPlayer) return;
    
    const videoState = {
        streamId: roomName,
        eventType: 'video_sync',
        currentTime: videoPlayer.currentTime,
        isPlaying: !videoPlayer.paused
    };
    
    // Only send through WebRTC data channel
    if (webRTCAdaptor && isDataChannelOpen) {
        try {
           sendMessage(videoState.streamId, videoState.currentTime, JSON.stringify(videoState), roomName);
        } catch (error) {
            console.error('Error sending video sync:', error);
        }
    } else {
        console.log('WebRTC data channel not ready');
    }
}

// Function to handle incoming video sync messages
function handleVideoSync(data) {
    if (isHost || !videoPlayer) return;

    try {
        // Sync video time if difference is more than 0.5 seconds
        if (Math.abs(videoPlayer.currentTime - data.currentTime) > 0.5) {
            videoPlayer.currentTime = data.currentTime;
        }

        // Sync play/pause state
        if (data.isPlaying && videoPlayer.paused) {
            videoPlayer.play();
        } else if (!data.isPlaying && !videoPlayer.paused) {
            videoPlayer.pause();
        }
    } catch (e) {
        console.error("Error handling video sync data:", e);
    }
}



const handleScheduleClose = () => {
    scheduleOpen = false;
};

function togglePanel(id) {
        if (id === "chatPanel") {
            document.getElementById("participantsPanel").style.width = "0px";
        }
        if (id === "participantsPanel") {
            document.getElementById("chatPanel").style.width = "0px";
        }
        const panel = document.getElementById(id);
        panel.style.width = panel.style.width === "30rem" ? "0px" : "30rem";
}

 
// Add these helper functions
function handleMainTrackBroadcastObject(broadcastObject) {
    let participantIds = broadcastObject.subTrackStreamIds;

    // Find and remove not available tracks
    let currentTracks = Object.keys(allParticipants);
    currentTracks.forEach(trackId => {
        if (!allParticipants[trackId].isFake && !participantIds.includes(trackId)) {
            console.log("stream removed:" + trackId);
            delete allParticipants[trackId];
        }
    });

    // Request broadcast object for new tracks
    participantIds.forEach(pid => {
        if (allParticipants[pid] === undefined) {
            webRTCAdaptor.getBroadcastObject(pid);
        }
    });
}

function handleSubtrackBroadcastObject(broadcastObject) {
    if (broadcastObject.metaData !== undefined && broadcastObject.metaData !== null) {
        let userStatusMetadata = JSON.parse(broadcastObject.metaData);
        if (userStatusMetadata.isCameraOff !== undefined) {
            broadcastObject.isCameraOff = userStatusMetadata.isCameraOff;
        }
        if (userStatusMetadata.isMicMuted !== undefined) {
            broadcastObject.isMicMuted = userStatusMetadata.isMicMuted;
        }
    }
    allParticipants[broadcastObject.streamId] = broadcastObject;
}

function playVideo(obj) {
    const roomId = roomName;
    console.log("new track available with id: " + obj.trackId + " and kind: " + obj.track.kind + " on the room:" + roomId);

    const incomingTrackId = obj.trackId.substring("ARDAMSx".length);
    const streamId = obj.stream.id;

    if (incomingTrackId == roomId || incomingTrackId == publishStreamId) {
        return;
    }

    // Handle audio tracks
    if (obj.track.kind === "audio") {
        let audio = document.getElementById("remoteAudio" + incomingTrackId);

        if (audio == null) {
            createRemoteAudio(incomingTrackId);
            audio = document.getElementById("remoteAudio" + incomingTrackId);
            audio.srcObject = new MediaStream();
        }

        if (audio) {
            if (!audio.srcObject) {
                audio.srcObject = new MediaStream();
            }
            audio.srcObject.addTrack(obj.track);
        }
    // Handle video tracks
    else if (obj.track.kind === "video") {
        let video = document.getElementById("remoteVideo" + incomingTrackId);
        
        if (video == null) {
            video = document.createElement('video');
            video.id = "remoteVideo" + incomingTrackId;
            video.autoplay = true;
            video.playsInline = true;
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            video.srcObject = new MediaStream();
        }

        video.srcObject.addTrack(obj.track);
        
        // Store the video element reference for the representative indicator
        videoElements.set(incomingTrackId, video);
        console.log("Video element stored for", incomingTrackId);
    }

    obj.track.onended = event => {
        console.log("track is ended with id: " + event.target.id);
    }

    obj.stream.onremovetrack = event => {
        console.log("track is removed with id: " + event.track.id);
        const removedTrackId = event.track.id.substring("ARDAMSx".length);
        removeRemoteAudio(removedTrackId);
        // Also remove video elements
        if (videoElements.has(removedTrackId)) {
            videoElements.delete(removedTrackId);
            }
        }
    };
}

function createRemoteAudio(trackLabel: string) {
    const player = document.createElement("div");
    console.log("player", player);
    player.className = "col-sm-3";
    player.id = "player" + trackLabel;

    player.innerHTML = `
        <audio id="remoteAudio${trackLabel}" controls autoplay></audio>
        <div id="overlay${trackLabel}" style="font-size: 10px;position: absolute; top: 5px; left: 50%; transform: translateX(-50%); color: white; background-color: rgba(0, 0, 0, 0.5); padding: 5px;">
            ${trackLabel}
        </div>`;

    document.getElementById("players")?.appendChild(player);
}

function removeRemoteAudio(trackLabel: string) {
    const player = document.getElementById("player" + trackLabel);
    if (player) {
        player.remove();
    }
}

let videoURL;

let videoUrl = $currentVideoUrl || `${roomIdentity[0].associated_video}`;
console.log("videoUrl", videoUrl);

// Add timestamp for throttling
let lastUpdate = 0;

// Reactive declarations with immediate logging
$: {
    urlRepresentativeName = $page.url.searchParams.get('representativeName');
    anonymousUserId = $anonymousUser;
    hostUserId = $page.url.searchParams.get('hostUserId');
    
    // Debug logging
    console.log('URL Params updated:', {
        urlRepresentativeName,
        anonymousUserId,
        hostUserId,
        rawUrl: $page.url.toString(),
        searchParams: Object.fromEntries($page.url.searchParams)
    });
}

function handleNameSubmitted(event) {
    const submittedName = event.detail;
    console.log("submittedName", submittedName);
    anonymousUser.set(submittedName);
    // Initialize WebRTC after name is set
    initializeWebRTC();
}

function handleChatMessage(messageBody) {
    if (!messageBody || !messageBody.name || !messageBody.text) {
        console.error("Invalid chat message format:", messageBody);
        return;
    }

    // Check if this is a message from the current user
    const isCurrentUser = messageBody.name === (name || $anonymousUser);

    chatMessages.update(messages => {
        // Check if message already exists
        const isDuplicate = messages.some(msg => 
            msg.name === messageBody.name && 
            msg.text === messageBody.text
        );

        // Only add the message if it's not a duplicate and not from current user
        if (!isDuplicate && !isCurrentUser) {
            return [...messages, messageBody];
        }
        return messages;
    });
}

</script>

{#if !isAuthenticated && (!$anonymousUser || $anonymousUser === '')}
    <NameInputModal on:nameSubmitted={handleNameSubmitted} roomName={roomIdentity[0].associated_video_name} />
{:else}
<div class="h-screen min-w-full bg-[#9d9d9f] relative overflow-hidden">
    <div class="h-full">
        <div class="flex items-center h-full pt-6 pb-24">
            <!-- left sidebar -->
             <LeftBar joinURL={joinURL} videoRepresentatives={videoRepresentatives} userId={user?.id || ''} {scheduleOpen} on:closeSchedule={handleScheduleClose} />
             <div class="flex-grow h-full bg-[#9d9d9f] relative flex gap-2">
                {#if isHost || isRepresentative}
                    <div class="video-container h-full w-full">
                        <video
                            bind:this={videoPlayer}
                            src={videoUrl}
                            autoplay={false}
                            controls
                            playsinline
                            class="h-full w-full"
                            on:play={handleVideoStateChange}
                            on:pause={handleVideoStateChange}
                            on:seeked={handleVideoStateChange}
                            on:timeupdate={() => {
                                if (isHost && isDataChannelOpen) {
                                    const now = Date.now();
                                    if (!lastUpdate || now - lastUpdate > 1000) {
                                        lastUpdate = now;
                                        handleVideoStateChange();
                                    }
                                }
                            }}
                        >
                            <track kind="captions">
                            Your browser does not support the video element.
                        </video>
                    </div>
                {:else}
                    <div class="video-container h-full w-full">
                        <video
                            bind:this={videoPlayer}
                            src={videoUrl}
                            autoplay={false}
                            controls={false}
                            playsinline
                            class="h-full w-full"
                        >
                            <track kind="captions">
                            Your browser does not support the video element.
                        </video>
                    </div>
                {/if}

                <!-- Chat Panel -->
                <div class="w-0 bg-[#666669] h-full overflow-y-auto flex flex-col panel" id="chatPanel">
                    <div class="flex justify-between items-center h-full w-full p-4 border-b bg-[#47484b]">
                        <Chat roomId={roomName} name={name} />
                    </div>
                    <!-- Add your chat content here -->
                </div>

                <!-- Participants Panel -->
                <div class="w-0 bg-[#666669] h-full overflow-y-auto flex flex-col panel" id="participantsPanel">
                    <Participants participants={meetingParticipants} isHost={isHost} name={name} users={users} />
                </div>
            </div>

            <!-- Right sidebar controls -->
            <div class="flex flex-col gap-3 h-full justify-end">
                <div class="w-14 h-auto bg-red flex flex-col gap-4 justify-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        class="w-full hover:bg-red-700"
                        on:click={() => togglePanel("chatPanel")}
                    >
                        <MessageSquareDashed scale={1.3} color="#fff" />
                    </Button>
                </div>

                <div class="w-14 h-auto bg-red flex flex-col gap-4 justify-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        class="w-full hover:bg-red-700"
                        on:click={() => togglePanel("participantsPanel")}
                    >
                        <UsersRound scale={1.3} color="#fff" />
                    </Button>
                </div>
            </div>
        </div>

        <RepresentativeIndicator 
            participants={meetingParticipants} 
        />
        <RightBar 
        isHost={isHost}
        name={name}
        participants={meetingParticipants.map(participant => participant.split("-").pop())}
        on:toggleChat={() => togglePanel("chatPanel")} on:toggleParticipants={() => togglePanel("participantsPanel")} />
        </div>
    </div>

    <!-- Bottom controls bar -->
    <BottomBar roomIdentityName={roomIdentity[0].associated_video_name} isMicMuted={isMicMuted} on:leaveRoom={leaveRoom} on:toggleMicrophone={toggleMicrophone} isCameraOff={isCameraOff} on:toggleCamera={toggleCamera} />
 
{/if}

<style>
.conference-room {
    padding: 20px;
}

.controls {
    margin-top: 20px;
}

.button-group {
    margin-bottom: 15px;
}

.media-controls {
    display: flex;
    gap: 10px;
}

.video-container {
    width: 100%;
    height: 100%;
    background: black;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

.video-container video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: absolute;
}

/* Keep your existing styles... */

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
    color: #000000
}
</style>
