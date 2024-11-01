<script lang="ts">
	import { PUBLIC_ANT_MEDIA_URL } from '$env/static/public';
import { WebRTCAdaptor } from "@antmedia/webrtc_adaptor";
import { page } from "$app/stores";
import { onMount } from "svelte";
import { Button } from "$lib/components/ui/button";
import { toast } from "svelte-sonner";
import * as Dialog from "$lib/components/ui/dialog";
import { goto } from "$app/navigation";
import {
        Calendar,
        CircleUser,
        Quote,
        ShareIcon,
        MicOff,
        Settings,
        Clapperboard,
        MessageSquareDashed,
        SendHorizontal,
        UsersRound,
        Mic,
        Code,
    } from "lucide-svelte";

export let data;

// State management
let webRTCAdaptor: any;
let isPlaying = false;
let isDataChannelOpen = false;
let isMicMuted = false;
let isCameraOff = false;
let allParticipants = {};
let isReconnectionInProgress = false;
let reconnecting = false;
let publishReconnected = false;
let playReconnected = false;
let isNoStreamExist = false;

// Room data
const roomName = $page.url.pathname.split("/").pop();
const user = data.user;
const isAuthenticated = !!user;
const name = isAuthenticated ? user.name : "";
const representatives = data.representatives;
const users = data.users;
const roomIdentity = data.roomId;
const videoRepresentatives = data.videoRepresentativesInfo;
const host = $page.url.pathname.split("/").pop().split("-").pop();

// Stream configuration
let publishStreamId = null;
const streamName = roomIdentity[0]?.associated_video_name;
const dcOnly = false;
const playOnly = false;

// WebRTC configuration
const mediaConstraints = {
    video: !dcOnly ? { width: { min: 176, max: 360 } } : !dcOnly,
    audio: !dcOnly
};

function getWebSocketURL() {
    // Implement your WebSocket URL logic here
    return `ws://${PUBLIC_ANT_MEDIA_URL}/WebRTCAppEE/websocket`
}

onMount(() => {
    initializeWebRTC();
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
            console.log("Published successfully");
            isPlaying = true;
            webRTCAdaptor.getBroadcastObject(roomName);
            break;
        case "play_started":
            console.log("Playing successfully");
            isPlaying = true;
            isNoStreamExist = false;
            webRTCAdaptor.getBroadcastObject(roomName);
            break;
        case "play_finished":
            console.log("Play finished for stream:" + obj.streamId);
            removeAllRemoteVideos();
            isPlaying = false;
            break;
        case "data_channel_opened":
            console.log("Data Channel opened for stream id", obj);
            isDataChannelOpen = true;
            break;
        case "data_channel_closed":
            console.log("Data Channel closed for stream id", obj);
            isDataChannelOpen = false;
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

    if (!playOnly) {
        console.log('starting publish');
        webRTCAdaptor.publish(
            publishStreamId,
            null,
            null,
            null,
            null,
            roomIdentity[0].room_id
        );
    }

    console.log('starting play');
    webRTCAdaptor.play(roomName);
}

function leaveRoom() {
    allParticipants = {};
    webRTCAdaptor.stop(roomName);
    removeAllRemoteVideos();
    isPlaying = false;
}

// Helper functions
function generateRandomString(length: number): string {
    return Math.random().toString(36).substring(2, length + 2);
}

function removeAllRemoteVideos() {
    const players = document.getElementById("players");
    if (!players) return;
    
    const children = players.querySelectorAll('div');
    children.forEach((child, index) => {
        if (index !== 0) { // Skip local video
            players.removeChild(child);
        }
    });
}

// Add these handler functions
function handlePublishStarted() {
    console.log('Published successfully');
    isPlaying = true;
}

function handlePlayStarted() {
    console.log('Playing successfully');
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

    // trackId is ARDAMSv+STREAM_ID or ARDAMSa+STREAM_ID
    const incomingTrackId = obj.trackId.substring("ARDAMSx".length);

    if (incomingTrackId == roomId || incomingTrackId == publishStreamId) {
        return;
    }

    let video = document.getElementById("remoteVideo" + incomingTrackId);

    if (video == null) {
        createRemoteVideo(incomingTrackId, obj.track.kind);
        video = document.getElementById("remoteVideo" + incomingTrackId);
        video.srcObject = new MediaStream();
    }

    video.srcObject.addTrack(obj.track);

    obj.track.onended = event => {
        console.log("track is ended with id: " + event.target.id);
    }

    obj.stream.onremovetrack = event => {
        console.log("track is removed with id: " + event.track.id);
        const removedTrackId = event.track.id.substring("ARDAMSx".length);
        removeRemoteVideo(removedTrackId);
    }
}

function createRemoteVideo(trackLabel: string, kind: string) {
    const player = document.createElement("div");
    player.className = "col-sm-3";
    player.id = "player" + trackLabel;

    if (kind == "audio") {
        player.style.display = "none";
    }

    player.innerHTML = `
        <video id="remoteVideo${trackLabel}" controls autoplay playsinline></video>
        <div id="overlay${trackLabel}" style="font-size: 10px;position: absolute; top: 5px; left: 50%; transform: translateX(-50%); color: white; background-color: rgba(0, 0, 0, 0.5); padding: 5px;">
            ${trackLabel}
        </div>`;

    document.getElementById("players")?.appendChild(player);
}

// Add other necessary functions...
</script>
<div class="h-screen min-w-full bg-[#9d9d9f] relative overflow-hidden">

<div class="container">
    <header class="header clearfix">
        <div class="row">
            <h3 class="col text-muted">WebRTC Conference</h3>
            <nav class="col align-self-center">
                <ul class="nav float-right">
                    <li><a href="/">Home</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main class="conference-room">
        <div id="players" class="row">
            <div class="col-sm-3">
                <video id="localVideo" autoplay muted controls playsinline></video>
            </div>
        </div>

        <div class="controls row">
            <div class="col-sm-8 offset-sm-2">
                <div class="button-group">
                    <button class="btn btn-primary" on:click={joinRoom}>
                        Join Room
                    </button>
                    <button class="btn btn-danger" on:click={leaveRoom}>
                        Leave Room
                    </button>
                </div>

                <div class="media-controls">
                    <button class="btn btn-outline-primary" on:click={() => webRTCAdaptor?.muteLocalMic()}>
                        {isMicMuted ? 'Unmute' : 'Mute'} Mic
                    </button>
                    <button class="btn btn-outline-primary" on:click={() => webRTCAdaptor?.turnOffLocalCamera()}>
                        {isCameraOff ? 'Turn On' : 'Turn Off'} Camera
                    </button>
                </div>
            </div>
        </div>
    </main>
</div>

 <!-- Bottom controls bar -->
 <div
 class="absolute inset-x-0 bottom-0 h-16 bg-[#666669] w-full flex items-center justify-between px-14"
>
 <div class="room-name text-white">
     {roomIdentity[0].associated_video_name}
 </div>
 <div class="controls flex items-center gap-3">
     <button
         class="flex justify-center items-center rounded-full bg-[#707172] h-10 w-10 hover:bg-white hover:text-black"
         on:click={toggleMicrophone}
     >
         {#if isMicMuted}
             <MicOff
                 color="#fff"
                 size={24}
                 class="hover:text-black"
             />
         {:else}
             <Mic color="#fff" size={24} class="hover:text-black" />
         {/if}
     </button>
     <button
         class="flex justify-center items-center rounded-full bg-[#707172] h-10 w-10 hover:bg-white hover:text-black"
     >
         <Settings color="#fff" size={24} class="hover:text-black" />
     </button>
 </div>
 <div class="leave-room">
     <Button
         variant="destructive"
         class="hover:bg-red-700"
         on:click={leaveRoom}
     >
         Leave Room
     </Button>
 </div>
</div>
</div>



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

    video {
        width: 100%;
        max-width: 320px;
        height: 100%;
        max-height: 240px;
    }

    /* Keep your existing styles... */
</style>
