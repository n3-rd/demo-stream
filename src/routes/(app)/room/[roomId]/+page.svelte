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
    import { MessageSquareDashed, UsersRound, X } from 'lucide-svelte';
	import Participants from '$lib/call/Participants.svelte';
	import Chat from '$lib/call/Chat.svelte';
	import { chatMessages } from '$lib/stores/chatMessages';
    import MobileBottomBar from '$lib/components/layout/mobile-bottom-bar.svelte';
    import {PUBLIC_POCKETBASE_INSTANCE} from '$env/static/public';

interface VideoElement extends HTMLVideoElement {
    srcObject: MediaStream;
}

interface AudioElement extends HTMLAudioElement {
    srcObject: MediaStream;
}

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

// Room data
const room = data.roomId[0];
const roomName = $page.url.pathname.split("/").pop().split("&")[0];
const user = data.user;
const isAuthenticated = !!user;
const name = isAuthenticated ? user.name : "";
const representatives = data.representatives;
const users = data.users;
let isHost = false;
const host = $page.url.pathname.split("/").pop().split("-").pop();

$: {
    isHost = host === (user ? user.id : "") || host == anonymousUserId;
}

let isRepresentative = false;
$: {
    const urlRepName = $page.url.searchParams.get('representativeName');
    isRepresentative = urlRepName !== null && urlRepName !== '';
    console.log('isRepresentative:', isRepresentative);
}

// Add videoElements map declaration at the top with other state variables
let videoElements = new Map();

$: {
    if (room) {
        // Determine if user is host (owner of the room)
        isHost = user?.id === room.owner_company;
        
        // Determine if user is a representative
        isRepresentative = representatives?.some(rep => rep.id === user?.id) || false;
        
        console.log('Role determination:', {
            isHost,
            isRepresentative,
            userId: user?.id,
            roomOwner: room.owner_company,
            representatives: representatives?.map(r => r.id)
        });
    }
}

// Stream configuration
let publishStreamId = null;
let showNameModal = !isAuthenticated;
const streamName = room?.title;
const dcOnly = false;
const playOnly = false;

// WebRTC configuration
const mediaConstraints = {
    video: isRepresentative, // Video enabled by default for representatives
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
    }
};

function getWebSocketURL() {
    return `wss://${PUBLIC_ANT_MEDIA_URL}/WebRTCAppEE/websocket`;
}

onMount(() => {
    if ($anonymousUser || isAuthenticated) {
        // Start with camera on for representatives, off for others
        isCameraOff = !isRepresentative;
        mediaConstraints.video = isRepresentative;
        
        initializeWebRTC();
        
        // Initialize sync source based on role
        if (isHost) {
            syncSource = 'host'; // Default to host sync for host
        } else if (isRepresentative) {
            syncSource = 'representative'; // Default to representative sync for representatives
        }
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
        callbackError: handleWebRTCError,
        bandwidth: 900,
        publishMode: "camera",
        audioBandwidth: 56,
        micGainNode: 1.0,
        audioSourceIndex: 0,
        videoCodec: "H264",
        sdpConstraints: {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: true
        }
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
            // Enable local audio after publishing starts
            const localAudio = document.getElementById("localAudio") as HTMLAudioElement;
            if (localAudio && !isMicMuted) {
                localAudio.srcObject = webRTCAdaptor.localStream;
            }
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
            console.log('Data channel opened'); // Debug log
            isDataChannelOpen = true;
            
            // If we're not the host, request the current sync source
            if (!isHost) {
                const syncSourceRequest = {
                    streamId: roomName,
                    eventType: 'sync_source_request'
                };
                try {
                    sendMessage(
                        syncSourceRequest.streamId,
                        Date.now(),
                        JSON.stringify(syncSourceRequest),
                        roomName
                    );
                } catch (error) {
                    console.error('Error requesting sync source:', error);
                }
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
                
                console.log('Received data message:', messageBody); // Debug log
                
                switch (messageBody?.eventType) {
                    case 'chat_message':
                        handleChatMessage(messageBody);
                        break;
                    case 'video_sync':
                        handleVideoSync(messageBody);
                        break;
                    case 'sync_source_change':
                        // Only non-host participants should update their sync source
                        if (!isHost) {
                            console.log('Updating sync source to:', messageBody.syncSource);
                            syncSource = messageBody.syncSource;
                        }
                        break;
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

function sanitizeStreamName(name: string): string {
    if (!name) return '';
    // First decode any URL encoded characters
    const decodedName = decodeURIComponent(name);
    // Then replace any spaces or special characters with underscores
    return decodedName.replace(/[^a-zA-Z0-9-]/g, '_');
}

function joinRoom() {
    if (!publishStreamId) {
        publishStreamId = generateRandomString(12);            
    }

    const sanitizedName = sanitizeStreamName(name || anonymousUserId);
    const sanitizedRoomName = sanitizeStreamName(roomName);

    if (!playOnly) {
        const streamId = `${publishStreamId}-${sanitizedName}`;
        console.log('starting publish with streamId:', streamId);
        
        const metadata = JSON.stringify({
            isCameraOff,
            isMicMuted
        });
        
        webRTCAdaptor.publish(
            streamId,
            null,
            metadata,
            null,
            sanitizedName,
            room.id
        );
    }

    console.log('starting play with roomName:', sanitizedRoomName);
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
    if (webRTCAdaptor && webRTCAdaptor.localStream) {
        const audioTrack = webRTCAdaptor.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = false;
            console.log('Muted local mic');
        }
    }
    webRTCAdaptor.muteLocalMic();
    isMicMuted = true;
}

function unmuteLocalMic() {
    if (webRTCAdaptor && webRTCAdaptor.localStream) {
        const audioTrack = webRTCAdaptor.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = true;
            console.log('Unmuted local mic');
        }
    }
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
    if (!webRTCAdaptor) return;
    
    // Update media constraints to include video
    mediaConstraints.video = true;
    
    // Stop current connection
    webRTCAdaptor.stop(publishStreamId);
    
    // Reinitialize with new constraints
    setTimeout(() => {
        webRTCAdaptor.turnOnLocalCamera();
        isCameraOff = false;
        
        // Republish stream with camera
        const streamId = `${roomName}-${sanitizeStreamName(name || anonymousUserId)}`;
        const metadata = JSON.stringify({
            isCameraOff: false,
            isMicMuted
        });
        
        webRTCAdaptor.publish(
            streamId,
            null,
            metadata,
            null,
            sanitizeStreamName(name || anonymousUserId),
            roomName
        );
    }, 500);
}

function turnOffCamera() {
    if (!webRTCAdaptor) return;
    
    // Update media constraints to disable video
    mediaConstraints.video = false;
    
    // Stop video track
    webRTCAdaptor.turnOffLocalCamera();
    isCameraOff = true;
    
    // Update stream metadata
    const streamId = `${roomName}-${sanitizeStreamName(name || anonymousUserId)}`;
    const metadata = JSON.stringify({
        isCameraOff: true,
        isMicMuted
    });
    
    // Republish with updated metadata
    webRTCAdaptor.updateMetadata(streamId, metadata);
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
    if (!videoPlayer) return;
    
    // Only send sync messages if we're the current sync source
    const shouldSendSync = (isHost && syncSource === 'host') || 
                         (isRepresentative && syncSource === 'representative');
    
    console.log('Video state change:', { 
        isHost, 
        isRepresentative, 
        syncSource, 
        shouldSendSync,
        currentTime: videoPlayer.currentTime,
        isPlaying: !videoPlayer.paused
    });
    
    if (shouldSendSync && webRTCAdaptor && isDataChannelOpen) {
        const videoState = {
            streamId: roomName,
            eventType: 'video_sync',
            currentTime: videoPlayer.currentTime,
            isPlaying: !videoPlayer.paused,
            syncSource,
            fromHost: isHost,
            fromRepresentative: isRepresentative
        };
        
        try {
            sendMessage(
                videoState.streamId,
                Date.now(),
                JSON.stringify(videoState),
                roomName
            );
        } catch (error) {
            console.error('Error sending video sync:', error);
        }
    }
}

// Function to handle incoming video sync messages
function handleVideoSync(data) {
    if (!videoPlayer) return;

    console.log('Received video sync:', data);

    // Only accept sync messages from authorized sources based on current sync source
    const isAuthorizedSync = (data.fromHost && syncSource === 'host') || 
                           (data.fromRepresentative && syncSource === 'representative');
    
    console.log('Sync authorization:', {
        isAuthorizedSync,
        syncSource,
        fromHost: data.fromHost,
        fromRepresentative: data.fromRepresentative
    });

    if (!isAuthorizedSync) {
        console.log('Ignoring unauthorized sync message');
        return;
    }

    try {
        // Sync video time if difference is more than 0.5 seconds
        const timeDiff = Math.abs(videoPlayer.currentTime - data.currentTime);
        console.log('Time difference:', timeDiff);
        
        if (timeDiff > 0.5) {
            console.log('Syncing time to:', data.currentTime);
            videoPlayer.currentTime = data.currentTime;
        }

        // Sync play/pause state
        if (data.isPlaying && videoPlayer.paused) {
            console.log('Playing video');
            videoPlayer.play().catch(e => console.error('Error playing video:', e));
        } else if (!data.isPlaying && !videoPlayer.paused) {
            console.log('Pausing video');
            videoPlayer.pause();
        }
    } catch (e) {
        console.error("Error handling video sync data:", e);
    }
}

// Add event listener for timeupdate to sync periodically
$: if (videoPlayer) {
    videoPlayer.ontimeupdate = () => {
        // Only sync every second to avoid flooding
        const now = Date.now();
        if (now - lastUpdate > 1000) {
            handleVideoStateChange();
            lastUpdate = now;
        }
    };
}

const handleScheduleClose = () => {
    scheduleOpen = false;
};

function togglePanel(id) {
    const chatPanel = document.getElementById("chatPanel");
    const participantsPanel = document.getElementById("participantsPanel");
    const isMobile = window.innerWidth < 1024;
    
    // Close the other panel first
    if (id === "chatPanel") {
        participantsPanel.style.transform = "translateX(100%)";
        participantsPanel.style.width = "0px";
    } else {
        chatPanel.style.transform = "translateX(100%)";
        chatPanel.style.width = "0px";
    }
    
    // Toggle the selected panel
    const panel = document.getElementById(id);
    
    if (isMobile) {
        panel.style.width = "100vw";
        panel.style.transform = panel.style.transform === "translateX(0%)" ? "translateX(100%)" : "translateX(0%)";
    } else {
        if (panel.style.width === "30rem") {
            panel.style.width = "0px";
            panel.style.transform = "translateX(100%)";
        } else {
            panel.style.width = "30rem";
            panel.style.transform = "translateX(0%)";
        }
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

    // Update meeting participants list with role information
    meetingParticipants = participantIds.map(pid => {
        const participant = allParticipants[pid];
        if (participant?.metaData) {
            try {
                const metadata = JSON.parse(participant.metaData);
                return {
                    streamId: pid,
                    name: participant.streamName,
                    isHost: metadata.isHost,
                    isRepresentative: metadata.isRepresentative,
                    userId: metadata.userId,
                    isCameraOff: metadata.isCameraOff,
                    isMicMuted: metadata.isMicMuted
                };
            } catch (e) {
                console.error('Error parsing participant metadata:', e);
            }
        }
        return {
            streamId: pid,
            name: participant?.streamName || 'Unknown'
        };
    });
}

function handleSubtrackBroadcastObject(broadcastObject) {
    if (broadcastObject.metaData !== undefined && broadcastObject.metaData !== null) {
        try {
            let userStatusMetadata = JSON.parse(broadcastObject.metaData);
            broadcastObject.isCameraOff = userStatusMetadata.isCameraOff;
            broadcastObject.isMicMuted = userStatusMetadata.isMicMuted;
            broadcastObject.isHost = userStatusMetadata.isHost;
            broadcastObject.isRepresentative = userStatusMetadata.isRepresentative;
            broadcastObject.userId = userStatusMetadata.userId;
        } catch (e) {
            console.error('Error parsing subtrack metadata:', e);
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
        let audio = document.getElementById("remoteAudio" + incomingTrackId) as AudioElement;

        if (audio == null) {
            createRemoteAudio(incomingTrackId);
            audio = document.getElementById("remoteAudio" + incomingTrackId) as AudioElement;
        }

        if (audio) {
            if (!audio.srcObject) {
                audio.srcObject = new MediaStream();
            }
            audio.srcObject.addTrack(obj.track);
            audio.play().catch(e => console.error("Error playing audio:", e));
        }
    } else if (obj.track.kind === "video") {
        let video = document.getElementById("remoteVideo" + incomingTrackId) as VideoElement;
        
        if (video == null) {
            video = document.createElement('video') as VideoElement;
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


function createRemoteAudio(trackLabel: string) {
    // Create a container for audio elements if it doesn't exist
    let playersContainer = document.getElementById("players");
    if (!playersContainer) {
        playersContainer = document.createElement("div");
        playersContainer.id = "players";
        playersContainer.className = "hidden";
        document.body.appendChild(playersContainer);
    }

    const player = document.createElement("div");
    player.id = "player" + trackLabel;

    const audio = document.createElement("audio");
    audio.id = "remoteAudio" + trackLabel;
    audio.autoplay = true;
    audio.playsinline = true;
    audio.controls = false;  // Hide controls since we manage it through UI

    player.appendChild(audio);
    playersContainer.appendChild(player);
}

function removeRemoteAudio(trackLabel: string) {
    const player = document.getElementById("player" + trackLabel);
    if (player) {
        player.remove();
    }
}

let videoURL;

// let lastUpdate = 0;

// Get video URL from room data
let videoUrl = '';

$: {
    console.log('Room data:', room);
    console.log('Selected video:', room?.expand?.selected_video);
    if (room?.expand?.selected_video) {
        const selectedVideo = room.expand.selected_video;
        console.log('Selected video details:', selectedVideo);
        videoUrl = selectedVideo.file ? `${PUBLIC_POCKETBASE_INSTANCE}/api/files/${selectedVideo.collectionId}/${selectedVideo.id}/${selectedVideo.file}` : '';
        console.log('Video URL:', videoUrl);
    }
}

// Add timestamp for throttling
let lastUpdate = 0;

// Initialize WebRTC client with room name from URL params
const streamId = `${$page.params.roomId}`;

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

// Add near other state management variables (around line 32-54)
let syncSource = 'host'; // Can be 'host' or 'representative'

// Add a new message type for sync source changes
function updateSyncSource(newSource: 'host' | 'representative') {
    // Only allow host to change sync source
    if (!isHost) return;
    
    syncSource = newSource;
    
    if (webRTCAdaptor && isDataChannelOpen) {
        const syncSourceUpdate = {
            streamId: roomName,
            eventType: 'sync_source_change',
            syncSource: newSource,
            fromHost: true
        };
        
        try {
            sendMessage(
                syncSourceUpdate.streamId,
                Date.now(),
                JSON.stringify(syncSourceUpdate),
                roomName
            );
        } catch (error) {
            console.error('Error sending sync source update:', error);
        }
    }
}

function handlePanelToggle(event) {
    const { id } = event.detail;
    togglePanel(id);
}

// Add missing removeAllRemoteVideos function
function removeAllRemoteVideos() {
    // Remove all remote video elements
    const players = document.getElementById("players");
    if (players) {
        players.innerHTML = '';
    }
    // Clear video elements map
    videoElements = new Map();
}

</script>


{#if !isAuthenticated && (!$anonymousUser || $anonymousUser === '')}
    <NameInputModal on:nameSubmitted={handleNameSubmitted} roomName={room?.title} />
{:else}
<div class="h-screen min-w-full bg-[#9d9d9f] relative overflow-hidden">
    <!-- Add audio container at the top level -->
    <div id="players" class="hidden">
        <!-- Local audio element -->
        <audio id="localAudio" autoplay playsinline></audio>
    </div>

    <div class="h-full">
        <div class="flex items-center md:items-start h-full pt-6 pb-24">
            <!-- left sidebar -->
             <div class="hidden lg:flex">
             <LeftBar joinURL={joinURL} videoRepresentatives={representatives} userId={user?.id || ''} {scheduleOpen} on:closeSchedule={handleScheduleClose} />
             </div>
             <div class="flex-grow h-full bg-[#9d9d9f] relative flex">
                {#if isHost || isRepresentative}
                    <div class="video-container bg-transparent h-full w-full">
                        {#if isHost}
                            <div class="absolute top-4 right-4 z-[32] flex gap-2 bg-black/50 p-2 rounded">
                                <Button
                                    variant={syncSource === 'host' ? 'default' : 'secondary'}
                                    size="sm"
                                    on:click={() => updateSyncSource('host')}
                                >
                                    Host View
                                </Button>
                                <Button
                                    variant={syncSource === 'representative' ? 'default' : 'secondary'}
                                    size="sm"
                                    on:click={() => updateSyncSource('representative')}
                                >
                                    Rep View
                                </Button>
                            </div>
                        {/if}
                        <!-- WebRTC Video -->
                        <video
                            id="localVideo"
                            class="w-full h-full object-contain absolute inset-0"
                            autoplay
                            playsinline
                            muted
                            controls={false}
                        >
                            Your browser does not support the video element.
                        </video>
                        <!-- Controlling Video for Host/Rep -->
                        {#if videoUrl}
                            <video
                                class="w-full h-full object-contain absolute inset-0"
                                controls
                                src={videoUrl}
                                bind:this={videoPlayer}
                                on:play={handleVideoStateChange}
                                on:pause={handleVideoStateChange}
                                on:seeking={handleVideoStateChange}
                                loop
                            >
                                Your browser does not support the video element.
                            </video>
                        {/if}
                    </div>
                {:else}
                    <div class="w-full h-full flex items-center justify-center">
                        {#if videoUrl}
                            <video
                                class="w-full h-full object-contain"
                                controls={false}
                                src={videoUrl}
                                bind:this={videoPlayer}
                            >
                                Your browser does not support the video element.
                            </video>
                        {:else}
                            <div class="text-white text-xl">No video selected for this room</div>
                        {/if}
                    </div>
                {/if}

                <!-- Chat Panel -->
                <div 
                    class="w-0 lg:w-0 z-[99] md:z-auto fixed lg:relative inset-0 lg:inset-auto bg-[#666669] h-full overflow-y-auto flex flex-col transition-all duration-300 ease-in-out" 
                    id="chatPanel"
                    style="transform: translateX(100%)"
                >
                    <div class="flex justify-between items-center h-full w-full p-4 border-b bg-[#9d9ca0] flex-col gap-3">
                        <div class="flex items-center justify-between w-full bg-[#47484b] px-4 py-2 md:hidden">
                            <div class="text-white text-lg font-semibold">Chat message</div>
                            <Button variant="ghost" size="icon" on:click={() => togglePanel("chatPanel")}>
                                <X scale={1.3} color="#fff" />
                            </Button>
                        </div>
                        <Chat roomId={roomName} name={name} />
                    </div>
                </div>

                <!-- Participants Panel -->
                <div 
                    class="w-0 lg:w-0 z-[99] md:z-auto fixed lg:relative inset-0 lg:inset-auto bg-[#666669] h-full overflow-y-auto flex flex-col transition-all duration-300 ease-in-out" 
                    id="participantsPanel"
                    style="transform: translateX(100%)"
                >
                    <div class="flex items-center h-full w-full p-4 border-b bg-[#9d9ca0] flex-col gap-3">
                        <div class="flex items-center justify-between w-full bg-[#47484b] px-4 py-2 md:hidden ">
                            <div class="text-white text-lg font-semibold">Participants</div>
                            <Button variant="ghost" size="icon" on:click={() => togglePanel("participantsPanel")}>
                                <X scale={1.3} color="#fff" />
                            </Button>
                        </div>
                        <Participants participants={meetingParticipants} isHost={isHost} name={name} users={users} />
                    </div>
                </div>
            </div>

            <!-- Right sidebar controls -->
            <div class=" flex-col gap-3 h-full justify-end hidden lg:flex">
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
            participants={meetingParticipants.map(participant => participant.name || participant.streamId)}
            on:toggleChat={() => togglePanel("chatPanel")} 
            on:toggleParticipants={() => togglePanel("participantsPanel")} 
        />
      
        </div>
    </div>

    <!-- Desktop Bottom Bar -->
    <div class="hidden lg:block">
        <BottomBar 
            roomIdentityName={room.title} 
            {isMicMuted} 
            on:leaveRoom={leaveRoom} 
            on:toggleMicrophone={toggleMicrophone} 
            {isCameraOff} 
            on:toggleCamera={toggleCamera} 
        />
    </div>

    <!-- Mobile Bottom Bar -->
    <MobileBottomBar 
        roomIdentityName={room.title}
        videoRepresentatives={representatives}
        scheduleOpen={scheduleOpen}
        userId={user?.id || ''}
        joinURL={joinURL}
        {isMicMuted}
        {isCameraOff}
        on:leaveRoom={leaveRoom}
        on:toggleMicrophone={toggleMicrophone}
        on:toggleCamera={toggleCamera}
        on:togglePanel={handlePanelToggle}
    />
 
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
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

.video-container video {
    position: absolute;
}

/* Keep your existing styles... */

.panel {
    transition: all 0.3s ease-in-out;
}

@media (max-width: 1024px) {
    .panel {
        transform: translateX(100%);
    }
    .panel[style*="width: 100%"] {
        transform: translateX(0);
    }
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

/* Remove any panel-specific transitions from here as we're handling them inline */
@media (max-width: 1024px) {
    :global(#chatPanel), :global(#participantsPanel) {
        height: 100vh !important;
        top: 0;
        right: 0;
    }
}
</style>
