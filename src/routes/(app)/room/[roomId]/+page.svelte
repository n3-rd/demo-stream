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
	import { currentVideoUrl } from '$lib/callStores';
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
    import MediaSelector from '$lib/components/room/MediaSelector.svelte';
    import {
        playVideoStore
    } from '$lib/stores/playStore';

interface VideoElement extends HTMLVideoElement {
    srcObject: MediaStream;
}

interface AudioElement extends HTMLAudioElement {
    srcObject: MediaStream;
}

export let data;
 console.log('data from room/[roomId]/+page.svelte', data);

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
const name = isAuthenticated ? user.company_name : "";
const representatives = data.representatives;
const users = data.users;
let isHost = false;
const host = $page.url.pathname.split("/").pop().split("-").pop();

let isRepresentative = false;
$: {
    if (room) {
        // Determine if user is host (owner of the room or anonymous host from embed)
        const isAnonymousHost = $page.url.searchParams.get('isHost') === 'true' && 
                               $page.url.searchParams.get('anonymous') === 'true';
        isHost = user?.id === room.owner_company || isAnonymousHost;
        
        // Determine if user is a representative (check both URL param and room data)
        const urlRepName = $page.url.searchParams.get('repid');
        isRepresentative = (urlRepName !== null && urlRepName !== '') || 
                          representatives?.some(rep => rep.id === user?.id) || false;
        
        console.log('Role determination:', {
            isHost,
            isAnonymousHost,
            isRepresentative,
            userId: user?.id,
            roomOwner: room.owner_company,
            representatives: representatives?.map(r => r.id),
            urlRepName
        });
    }
}

// Add videoElements map declaration at the top with other state variables
let videoElements = new Map();

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

// Add near the top with other state variables
let syncSource = 'host';

function getWebSocketURL() {
    return `wss://${PUBLIC_ANT_MEDIA_URL}/WebRTCAppEE/websocket`;
}

onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const representativeName = params.get('repid');

    if ($anonymousUser || isAuthenticated) {
        // Start with camera on for representatives, off for others
        isCameraOff = !isRepresentative;
        mediaConstraints.video = isRepresentative;
        
        // If this is a representative, ensure video is enabled
        if (representativeName) {
            mediaConstraints.video = true;
            mediaConstraints.audio = true;
        }

        initializeWebRTC();
        
        // Always initialize as host control
        syncSource = 'host';
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
        case "streamJoined":
            console.log("Stream joined event:", obj);
            if (obj.streamId) {
                let participantName = 'Unknown User';
                try {
                    if (obj.metadata) {
                        const metadata = JSON.parse(obj.metadata);
                        participantName = metadata.displayName || obj.streamName || 'Unknown User';
                    } else {
                        participantName = obj.streamName || 'Unknown User';
                    }
                } catch (e) {
                    console.error('Error parsing participant metadata:', e);
                }
                
                const participant = {
                    streamId: obj.streamId,
                    name: participantName,
                    isRepresentative: participantName.endsWith('_representative')
                };
                handleNewParticipant(participant);
            }
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
                try {
                    // First parse the outer messageBody
                    if (data.messageBody) {
                        messageBody = JSON.parse(data.messageBody);
                        console.log('Outer messageBody:', messageBody);
                        
                        // If it's a video URL update, parse the inner messageBody
                        if (messageBody.eventType === 'video_url_update' && messageBody.messageBody) {
                            const videoUpdateData = JSON.parse(messageBody.messageBody);
                            console.log('Video update data:', videoUpdateData);
                            
                            if (videoUpdateData.videoUrl) {
                                console.log('Setting video URL to:', videoUpdateData.videoUrl);
                                currentVideoUrl.set(videoUpdateData.videoUrl);
                                
                                // Update video player if it exists
                                if (videoPlayer) {
                                    console.log('Updating video player source to:', videoUpdateData.videoUrl);
                                    videoPlayer.src = videoUpdateData.videoUrl;
                                    if ($playVideoStore) {
                                        videoPlayer.play().catch(e => console.error('Error playing video:', e));
                                    }
                                }
                            }
                        }
                    }
                    
                    console.log('Parsed message data:', { 
                        data, 
                        messageBody, 
                        eventType: messageBody?.eventType,
                        isHost,
                        isRepresentative 
                    });
                    
                    // Handle other message types
                    switch (messageBody?.eventType) {
                        case 'chat_message':
                            handleChatMessage(messageBody);
                            break;
                        case 'video_sync':
                            try {
                                // Parse the inner messageBody for video sync
                                const syncData = JSON.parse(messageBody.messageBody);
                                console.log('Video sync data:', syncData);
                                
                                // Accept sync if we're not the current controller
                                const isCurrentController = (syncSource === 'host' && isHost) || 
                                                                  (syncSource === 'representative' && isRepresentative);
                                
                                if (!isCurrentController && videoPlayer) {
                                    console.log('Applying sync as viewer:', {
                                        syncSource,
                                        isHost,
                                        isRepresentative,
                                        currentTime: videoPlayer.currentTime,
                                        syncTime: syncData.currentTime
                                    });

                                    // Sync video time if difference is more than 0.5 seconds
                                    const timeDiff = Math.abs(videoPlayer.currentTime - syncData.currentTime);
                                    if (timeDiff > 0.5) {
                                        console.log('Syncing time to:', syncData.currentTime);
                                        videoPlayer.currentTime = syncData.currentTime;
                                    }

                                    // Sync play/pause state
                                    if (syncData.isPlaying && videoPlayer.paused) {
                                        console.log('Playing video');
                                        videoPlayer.play().catch(e => console.error('Error playing video:', e));
                                    } else if (!syncData.isPlaying && !videoPlayer.paused) {
                                        console.log('Pausing video');
                                        videoPlayer.pause();
                                    }
                                }
                            } catch (error) {
                                console.error('Error handling video sync:', error);
                            }
                            break;
                        case 'sync_source_change':
                            try {
                                const innerMessageBody = JSON.parse(messageBody.messageBody);
                                console.log('Sync source change:', {
                                    innerMessageBody,
                                    isHost,
                                    isRepresentative,
                                    currentSyncSource: syncSource
                                });
                                
                                // Update sync source if message is from host
                                if (innerMessageBody.fromHost) {
                                    console.log('Updating sync source to:', innerMessageBody.syncSource);
                                    syncSource = innerMessageBody.syncSource;
                                }
                            } catch (error) {
                                console.error('Error handling sync source change:', error);
                            }
                            break;
                    }
                } catch (parseError) {
                    console.error("Error parsing message body:", parseError);
                    console.error("Raw message body:", data.messageBody);
                }
            } catch (e) {
                console.error("Error parsing data message:", e);
                console.error("Raw message data:", obj.data);
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

function formatDisplayName(name: string, isRepresentative = false): string {
    if (!name) return 'Unknown User';
    const formattedName = name.trim();
    return isRepresentative ? `${formattedName}_representative` : formattedName;
}

function joinRoom() {
    if (!publishStreamId) {
        publishStreamId = generateRandomString(12);            
    }

    // Format the display name based on user type
    let displayName;
    if (isAuthenticated) {
        displayName = formatDisplayName(name);
    } else if (data.representativeName) {
        displayName = formatDisplayName(data.representativeName, true);
    } else {
        displayName = formatDisplayName($anonymousUser);
    }

    const sanitizedName = sanitizeStreamName(displayName);
    const sanitizedRoomName = sanitizeStreamName(roomName);

    if (!playOnly) {
        const streamId = `${publishStreamId}-${sanitizedName}`;
        console.log('starting publish with streamId:', streamId);
        
        const metadata = JSON.stringify({
            isCameraOff,
            isMicMuted,
            isRepresentative: !!data.representativeName,
            displayName
        });
        
        webRTCAdaptor.publish(
            streamId,
            null,
            metadata,
            null,
            displayName,
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

// Update the updateSyncSource function
function updateSyncSource(newSource: 'host' | 'representative') {
    if (!isHost) return; // Only host can change sync source
    
    console.log('Updating sync source:', { 
        oldSource: syncSource, 
        newSource, 
        isHost, 
        isRepresentative 
    });
    
    syncSource = newSource;
    
    // Broadcast the sync source change
    if (webRTCAdaptor && isDataChannelOpen) {
        const syncSourceUpdate = {
            eventType: 'sync_source_change',
            messageBody: JSON.stringify({
                syncSource: newSource,
                fromHost: true
            })
        };
        
        try {
            sendMessage(
                roomName,
                Date.now(),
                JSON.stringify(syncSourceUpdate),
                roomName
            );
        } catch (error) {
            console.error('Error sending sync source update:', error);
        }
    }
}

// Update the video state change handler
function handleVideoStateChange() {
    if (!videoPlayer) return;
    
    const isCurrentController = (syncSource === 'host' && isHost) || 
                              (syncSource === 'representative' && isRepresentative);
    
    console.log('Video state change:', { 
        isHost, 
        isRepresentative, 
        syncSource,
        isCurrentController,
        currentTime: videoPlayer.currentTime,
        isPlaying: !videoPlayer.paused
    });
    
    if (isCurrentController && webRTCAdaptor && isDataChannelOpen) {
        const videoState = {
            eventType: 'video_sync',
            messageBody: JSON.stringify({
                currentTime: videoPlayer.currentTime,
                isPlaying: !videoPlayer.paused,
                syncSource,
                fromHost: isHost,
                fromRepresentative: isRepresentative
            })
        };
        
        try {
            sendMessage(
                roomName,
                Date.now(),
                JSON.stringify(videoState),
                roomName
            );
        } catch (error) {
            console.error('Error sending video sync:', error);
        }
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
            delete allParticipants[trackId];u
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
    try {
        let metadata = JSON.parse(broadcastObject.metadata || '{}');
        let participantName = metadata.displayName || broadcastObject.streamName || 'Unknown User';
        
        allParticipants[broadcastObject.streamId] = {
            streamId: broadcastObject.streamId,
            name: participantName,
            isRepresentative: participantName.endsWith('_representative'),
            isCameraOff: metadata.isCameraOff || false,
            isMicMuted: metadata.isMicMuted || false
        };
    } catch (e) {
        console.error('Error handling subtrack broadcast object:', e);
    }
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

// Update the video URL reactive statement with more detailed logging
$: {
    console.log('Room data reactive statement triggered:', {
        hasRoom: !!room,
        roomData: room,
        hasExpand: !!room?.expand,
        hasSelectedVideo: !!room?.expand?.selected_video,
        selectedVideo: room?.expand?.selected_video,
        currentStoreValue: currentVideoUrl,
        currentStoreSubscribedValue: $currentVideoUrl,
        PUBLIC_POCKETBASE_INSTANCE
    });
    
    // if (room?.expand?.selected_video) {
    //     const selectedVideo = room.expand.selected_video;
    //     const newVideoUrl = selectedVideo.file ? 
    //         `${PUBLIC_POCKETBASE_INSTANCE}/api/files/${selectedVideo.collectionId}/${selectedVideo.id}/${selectedVideo.file}` : '';
    //     console.log('Setting video URL from room data:', {
    //         oldUrl: $currentVideoUrl,
    //         newUrl: newVideoUrl,
    //         selectedVideo,
    //         storeValue: currentVideoUrl,
    //         PUBLIC_POCKETBASE_INSTANCE
    //     });
    //     currentVideoUrl.set(newVideoUrl);
    //     console.log('Video URL updated from room data:', $currentVideoUrl);
    // } else {
    //     console.log('No selected video in room data, clearing URL');
    //     currentVideoUrl.set('');
    //     console.log('Video URL cleared from room data:', $currentVideoUrl);
    // }
}

// Add timestamp for throttling
let lastUpdate = 0;

// Initialize WebRTC client with room name from URL params
const streamId = `${$page.params.roomId}`;

// Reactive declarations with immediate logging
$: {
    urlRepresentativeName = data.representativeName || '';
    anonymousUserId = $anonymousUser;
    hostUserId = $page.url.searchParams.get('hostUserId');
    
    // If we have a representative name, set it as the anonymous user with proper formatting
    if (data.representativeName && !$anonymousUser) {
        anonymousUser.set(formatUserName(data.representativeName, true));
        // Initialize WebRTC after setting the name
        if (webRTCAdaptor === null) {
            initializeWebRTC();
        }
    }
    
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
    // For anonymous users, just use their submitted name
    anonymousUser.set(submittedName);
    // Initialize WebRTC after name is set
    initializeWebRTC();
}

// Add function to format user name based on type
function formatUserName(name: string, isRepresentative = false) {
    if (isRepresentative) {
        return `${name}_representative`;
    }
    return name;
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

// Example of how to use the update function
function handleVideoSelect(event) {
    const selectedVideo = event.detail;
    console.log('Video selected event:', {
        selectedVideo,
        hasFile: !!selectedVideo?.file,
        collectionId: selectedVideo?.collectionId,
        id: selectedVideo?.id,
        file: selectedVideo?.file
    });
    
    if ((isHost || isRepresentative) && webRTCAdaptor && isDataChannelOpen) {
        const newUrl = selectedVideo && selectedVideo.file ? 
            `${PUBLIC_POCKETBASE_INSTANCE}/api/files/${selectedVideo.collectionId}/${selectedVideo.id}/${selectedVideo.file}` : '';
        
        console.log('Preparing to send video URL update:', newUrl);
        
        // Update local state first
        currentVideoUrl.set(newUrl);
        if (videoPlayer) {
            videoPlayer.src = newUrl;
        }
        
        // Send update to all participants
        const videoUrlUpdate = {
            eventType: 'video_url_update',
            messageBody: JSON.stringify({
                videoUrl: newUrl,
                fromHost: isHost,
                fromRepresentative: isRepresentative
            })
        };
        
        console.log('Sending video URL update message:', videoUrlUpdate);
        try {
            sendMessage(
                roomName,
                Date.now(),
                JSON.stringify(videoUrlUpdate),
                roomName
            );
        } catch (error) {
            console.error('Error sending video URL update:', error);
        }
    }
}

// Add store debugging
let unsubscribe;
onMount(() => {
    console.log('Setting up store subscription');
    unsubscribe = currentVideoUrl.subscribe(value => {
        console.log('Store value changed:', {
            newValue: value,
            videoPlayer: videoPlayer,
            hasVideoPlayer: !!videoPlayer,
            isHost,
            isRepresentative,
            currentTime: videoPlayer?.currentTime
        });
        
        // If we have a video player and a URL, update it
        if (videoPlayer && value) {
            console.log('Updating video player source');
            videoPlayer.src = value;
            if ($playVideoStore) {
                videoPlayer.play().catch(e => console.error('Error playing video:', e));
            }
        }
    });

    return () => {
        console.log('Cleaning up store subscription');
        if (unsubscribe) unsubscribe();
    };
});

</script>


{#if !isAuthenticated && (!$anonymousUser || $anonymousUser === '') && !data.representativeName}
    <NameInputModal on:nameSubmitted={handleNameSubmitted} roomName={room?.title} />
{:else}
<div class="h-screen min-w-full bg-[#9d9d9f] relative overflow-hidden">
    <div id="players" class="hidden">
        <audio id="localAudio" autoplay playsinline></audio>
    </div>

    <div class="h-full overflow-y-scroll">
        <div class="flex items-center md:items-start h-full pt-6 pb-24">
            <!-- left sidebar -->
            <div class="hidden lg:flex">
                <LeftBar joinURL={joinURL} videoRepresentatives={representatives} userId={user?.id || ''} {scheduleOpen} on:closeSchedule={handleScheduleClose} />
            </div>
            
            <!-- Main content area -->
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
                                    Host Ctrl
                                </Button>
                                <Button
                                    variant={syncSource === 'representative' ? 'default' : 'secondary'}
                                    size="sm"
                                    on:click={() => updateSyncSource('representative')}
                                >
                                    Rep Ctrl
                                </Button>
                            </div>
                        {/if}
                     
                        {#if $currentVideoUrl}
                            <!-- Show control video only to the current controller based on syncSource -->
                            {#if (syncSource === 'host' && isHost) || (syncSource === 'representative' && isRepresentative)}
                                <video
                                    class="w-full h-full object-contain absolute inset-0"
                                    controls={true}
                                    src={$currentVideoUrl}
                                    bind:this={videoPlayer}
                                    on:play={handleVideoStateChange}
                                    on:pause={handleVideoStateChange}
                                    on:seeking={handleVideoStateChange}
                                    loop
                                >
                                    Your browser does not support the video element.
                                </video>
                            {:else}
                                <!-- Show mirrored video to everyone else -->
                                <video
                                    class="w-full h-full object-contain absolute inset-0"
                                    controls={false}
                                    src={$currentVideoUrl}
                                    bind:this={videoPlayer}
                                    on:play={() => {}}
                                    on:pause={() => {}}
                                    on:seeking={() => {}}
                                    loop
                                >
                                    Your browser does not support the video element.
                                </video>
                            {/if}
                        {:else}
                            <div class="absolute inset-0 flex items-center justify-center text-white text-xl">
                                No video selected
                            </div>
                        {/if}
                    </div>
                {:else}
                    <div class="w-full h-full flex items-center justify-center">
                        {#if $currentVideoUrl}
                            <video
                                class="w-full h-full object-contain"
                                controls={false}
                                src={$currentVideoUrl}
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
                        <div class="flex items-center justify-between w-full bg-[#47484b] px-4 py-2 md:hidden">
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
            <div class="flex-col gap-3 h-full justify-end hidden lg:flex">
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

        <!-- MediaSelector -->
        {#if isHost || isRepresentative}
            <div class="h-72 ">
                <MediaSelector 
                    {isHost} 
                    {isRepresentative} 
                    {room} 
                    on:videoSelect={handleVideoSelect}
                />
            </div>
        {/if}

        <RepresentativeIndicator 
        participants={meetingParticipants} 
    />

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
    </div>
</div>
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

@media (max-width: 1024px) {
    :global(#chatPanel), :global(#participantsPanel) {
        height: 100vh !important;
        top: 0;
        right: 0;
    }
}
</style>
