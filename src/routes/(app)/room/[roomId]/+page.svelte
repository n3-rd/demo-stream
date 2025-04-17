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
	import { currentVideoUrl, currentPdfUrl, pdfScrollPosition, currentDocxUrl, docxScrollPosition, currentImageUrl, imageZoomLevel } from '$lib/callStores';
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
    import PdfViewer from '$lib/components/room/PdfViewer.svelte';
	import GreetingPopup from '$lib/call/GreetingPopup.svelte';
    import DocxViewer from '$lib/components/room/DocxViewer.svelte';
    import ImageViewer from '$lib/components/room/ImageViewer.svelte';
	import { toast } from 'svelte-sonner';

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
let scheduleOpen = false;
let shareURL = $page.url.href;

// Add video state management
let videoPlayer;
let isVideoPlaying = false;
let currentVideoTime = 0;
let isVideoMuted = false;

// Room data
const room = data && data.roomId && data.roomId.length > 0 ? data.roomId[0] : null;

// Get the base room name from the URL
const baseRoomName = $page.url.pathname.split("/").pop().split("&")[0];

// Near the top with other state variables
let uniqueSessionId = '';

// Room data
$: roomName = uniqueSessionId ? `${baseRoomName}-${uniqueSessionId}` : baseRoomName;
const user = data?.user;
const isAuthenticated = !!user;
const name = isAuthenticated ? user?.company_name : "";
const representatives = data?.representatives || [];
const users = data?.users || [];
let isAnonymousHost = false;
let isHost = false;
const host = $page.url.pathname.split("/").pop().split("-").pop();
let showGreetingPopup = false;

// Add retry state
let webrtcInitAttempts = 0;
const MAX_WEBRTC_INIT_ATTEMPTS = 3;

// Add connection status state
let connectionStatus = 'initializing'; // 'initializing', 'connected', 'error', 'disconnected'

// Add this variable to track join attempts
let joinAttempts = 0;
const MAX_JOIN_ATTEMPTS = 3;

// Add this near the top of your script with other variable declarations
let isScheduledMeeting = false;
let meetingStatus = { canJoin: true, isPast: false, joinBeforeMinutes: 60, minutesLeft: 0 };
let scheduledMeetingTime = null;

// Add near the top with other state variables
let participantsPanelOpen = false;
let chatPanelOpen = false;

// Add with the other state variables
let selfIncludedParticipantCount = 1; // Start with at least 1 (yourself)

// Update the count when participants change
$: {
    // Calculate participant count including yourself
    selfIncludedParticipantCount = meetingParticipants.length > 0 ? 
        meetingParticipants.length : 1; // Always show at least 1 participant (yourself)
}

function calculateTimeRemaining(scheduledTime) {
    const now = new Date();
    const diff = scheduledTime.getTime() - now.getTime();
    
    if (diff <= 0) return "Now";
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ${hours % 24} hr${hours % 24 !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes % 60} min${minutes % 60 !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }

let isRepresentative = false;
$: {
    if (room) {
        // Determine if user is host (owner of the room or anonymous host from embed)
        isAnonymousHost = $page.url.searchParams.get('isHost') === 'true' && 
                               $page.url.searchParams.get('anonymous') === 'true';
        isHost = user?.id === room.owner_company || isAnonymousHost;
        
        // Set showGreetingPopup based on isAnonymousHost
        showGreetingPopup = isAnonymousHost;
        
        // Determine if user is a representative (check both URL param and room data)
        const urlRepName = $page.url.searchParams.get('repid');
        isRepresentative = (urlRepName !== null && urlRepName !== '') || 
                          representatives?.some(rep => rep.id === user?.id) || false;
        
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

// Update media constraints
const mediaConstraints = {
    video: isRepresentative || $page.url.searchParams.get('repid') !== null, // Video enabled by default for representatives
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
    }
};

// Add near the top with other state variables
let syncSource = 'host';

// Add this variable with other state variables
let inDataChannelOnlyMode = false;

let videoVolume = 1.0; // Add this with your other state variables

// Add state for available representatives
let availableRepresentatives = [];

function getWebSocketURL() {
    return `wss://${PUBLIC_ANT_MEDIA_URL}/WebRTCAppEE/websocket`;
}

// Update the isWithinOneHour function for more reliable comparison
function isWithinOneHour(scheduledTime) {
  if (!scheduledTime) return false;
  
  // Make sure we're working with Date objects
  const scheduleDate = scheduledTime instanceof Date ? scheduledTime : new Date(scheduledTime);
  const now = new Date();
  
  // Calculate time difference in milliseconds
  const timeDiff = scheduleDate.getTime() - now.getTime();
  
  // Convert to minutes (60,000 milliseconds in a minute)
  const minutesLeft = Math.floor(timeDiff / 60000);
  
  
  return minutesLeft <= 60;
}

onMount(() => {
    // Generate a unique session ID if 'uid' isn't already in the URL
    if (!$page.url.searchParams.get('uid')) {
        uniqueSessionId = generateRandomString(8);
        
        // Create a new URL object to modify the current URL
        const newUrl = new URL(window.location.href);
        
        // Add the uid parameter
        newUrl.searchParams.set('uid', uniqueSessionId);
        
        // Update browser history without reloading the page
        window.history.replaceState({}, '', newUrl.toString());
        
        // Also update our shareURL immediately
        shareURL = newUrl.toString();
        
    } else {
        // Use the existing uid from URL
        uniqueSessionId = $page.url.searchParams.get('uid');
        
        // Make sure shareURL has the uid parameter
        const urlObj = new URL(window.location.href);
        shareURL = urlObj.toString();
    }
    
  
    const params = new URLSearchParams(window.location.search);
    const representativeName = params.get('repid');
    
    // Set isRepresentative based on URL parameter
    if (representativeName) {
        isRepresentative = true;
        console.log('Detected representative mode from URL param:', representativeName);
    }

    // Check if this is a scheduled meeting
    console.log('Room data on mount:', data);
    
    // Check all possible schedule data locations but be more strict about detection
    isScheduledMeeting = false; // Reset to false by default
    if (data) {
      // Extract schedule data (handle all possible formats)
      if (data.scheduledRoom && data.scheduledRoom.schedule_time) {
        isScheduledMeeting = true;
        scheduledMeetingTime = new Date(data.scheduledRoom.schedule_time);
      } else if (data.schedule_time) {
        isScheduledMeeting = true;
        scheduledMeetingTime = new Date(data.schedule_time);
      } else if (data.scheduledTime) {
        isScheduledMeeting = true;
        scheduledMeetingTime = new Date(data.scheduledTime);
      } else if (data.room && data.room.schedule_time) {
        isScheduledMeeting = true;
        scheduledMeetingTime = new Date(data.room.schedule_time);
      }
      
      // If it's a scheduled meeting, calculate the status
      if (isScheduledMeeting && scheduledMeetingTime) {
        const meetingStatusResult = getMeetingStatus({
          scheduledRoom: { 
            schedule_time: scheduledMeetingTime,
            join_before_minutes: data.join_before_minutes || data.scheduledRoom?.join_before_minutes || 60
          }
        });
        
        // Ensure we always have minutesLeft property
        meetingStatus = {
          ...meetingStatusResult,
          minutesLeft: meetingStatusResult.minutesLeft || 0
        };
        
        console.log('Found scheduled meeting:', {
          scheduledMeetingTime, 
          isScheduledMeeting,
          meetingStatus
        });
      }
    }
    
    // Initialize WebRTC if we have a name
    if (isAuthenticated || $anonymousUser || data?.representativeName) {
      initializeWebRTC();
    }
    
    // Ensure panels are closed initially
    setTimeout(() => {
        const chatPanel = document.getElementById("chatPanel");
        const participantsPanel = document.getElementById("participantsPanel");
        
        if (chatPanel) {
            chatPanel.style.transform = "translateX(100%)";
            chatPanel.style.width = "0px";
        }
        
        if (participantsPanel) {
            participantsPanel.style.transform = "translateX(100%)";
            participantsPanel.style.width = "0px";
        }
    }, 100);
});

function initializeWebRTC() {
    try {
        // Reset join attempts
        joinAttempts = 0;
        
        // Check if mediaDevices is supported
        const supportsMedia = !!(navigator && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
        
        // If media is not supported, force data channel only mode
        const forceDcOnly = !supportsMedia || dcOnly;
        inDataChannelOnlyMode = forceDcOnly;
        
        // Check if this is a representative by URL param or other means
        const isRep = $page.url.searchParams.get('repid') !== null || data?.representativeName || isRepresentative;
        
        // Update media constraints for representatives
        let actualMediaConstraints = forceDcOnly ? 
            { video: false, audio: false } : 
            mediaConstraints;
            
        // Force video for representatives
        if (isRep && !forceDcOnly) {
            actualMediaConstraints = {
                ...actualMediaConstraints,
                video: true
            };
            console.log('Enabling video for representative:', actualMediaConstraints);
        }
        
        // Initialize WebRTC
        webRTCAdaptor = new WebRTCAdaptor({
            websocket_url: getWebSocketURL(),
            mediaConstraints: actualMediaConstraints,
            localVideoId: "localVideo",
            isPlayMode: playOnly,
            onlyDataChannel: forceDcOnly,
            dataChannelEnabled: true,
            debug: true,
            callback: (info, obj) => {
                handleWebRTCCallback(info, obj);
            },
            callbackError: (error, message) => {
                handleWebRTCError(error, message);
            },
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
    } catch (error) {
        console.error('Error initializing WebRTC adapter:', error);
        // Attempt fallback to data channel only mode
        try {
            webRTCAdaptor = new WebRTCAdaptor({
                websocket_url: getWebSocketURL(),
                mediaConstraints: { video: false, audio: false },
                localVideoId: "localVideo",
                isPlayMode: true,
                onlyDataChannel: true,
                dataChannelEnabled: true,
                debug: true,
                callback: handleWebRTCCallback,
                callbackError: handleWebRTCError
            });
        } catch (fallbackError) {
            console.error('Fallback initialization failed:', fallbackError);
            alert('Your browser does not support the required features for this application. Please try a different browser.');
        }
    }
}

function handleWebRTCCallback(info: string, obj: any) {
    
    // Check for scheduled meeting
    const isScheduledMeeting = data?.error && data?.scheduledTime;
    
    switch (info) {
        case "initialized":
            connectionStatus = 'initializing';
            joinRoomWithRetry(); // Use retry version
            break;
        
        case "publish_started":
            connectionStatus = 'connected';
            isPlaying = true;
            
            // If this is a scheduled meeting in the future, show appropriate UI overlay
            if (!isScheduledMeeting) {
                // Get the broadcast object to learn about other participants
                webRTCAdaptor.getBroadcastObject(roomName);
            }
            
            // Enable local audio after publishing starts
            const localAudio = document.getElementById("localAudio") as HTMLAudioElement;
            if (localAudio && !isMicMuted && webRTCAdaptor.localStream) {
                localAudio.srcObject = webRTCAdaptor.localStream;
            }
            break;
        
        case "publish_finished":
            break;
            
        case "play_started":
            connectionStatus = 'connected';
            isPlaying = true;
            isNoStreamExist = false;
            webRTCAdaptor.getBroadcastObject(roomName);
            break;
            
        case "play_finished":
            removeAllRemoteVideos();
            isPlaying = false;
            break;
            
        case "stream_created":
            break;
            
        case "stream_not_found":
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
        case "data_channel_opened":
            isDataChannelOpen = true;
            
            // If we're not the host, request the current media state
            if (!isHost) {
                const mediaStateRequest = {
                    streamId: roomName,
                    eventType: 'media_state_request'
                };
                try {
                    sendMessage(
                        mediaStateRequest.streamId,
                        Date.now(),
                        JSON.stringify(mediaStateRequest),
                        roomName
                    );
                } catch (error) {
                    console.error('Error requesting media state:', error);
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
                    if (data.messageBody) {
                        messageBody = JSON.parse(data.messageBody);
                        
                        // Handle media state request
                        if (messageBody.eventType === 'media_state_request' && isHost) {
                            const currentState = {
                                eventType: 'media_state_response',
                                messageBody: JSON.stringify({
                                    videoUrl: $currentVideoUrl,
                                    pdfUrl: $currentPdfUrl,
                                    docxUrl: $currentDocxUrl,
                                    imageUrl: $currentImageUrl,
                                    imageZoomLevel: $imageZoomLevel,
                                    pdfScrollPosition: $pdfScrollPosition,
                                    docxScrollPosition: $docxScrollPosition,
                                    isPlaying: $playVideoStore,
                                    currentTime: videoPlayer?.currentTime || 0,
                                    syncSource
                                })
                            };
                            sendMessage(
                                roomName,
                                Date.now(),
                                JSON.stringify(currentState),
                                roomName
                            );
                        }
                        
                        // Handle media state response
                        if (messageBody.eventType === 'media_state_response') {
                            const state = JSON.parse(messageBody.messageBody);
                            
                            // First clear all media to avoid conflicts
                            currentVideoUrl.set('');
                            currentPdfUrl.set('');
                            currentDocxUrl.set('');
                            currentImageUrl.set('');
                            
                            // Update video state
                            if (state.videoUrl) {
                                currentVideoUrl.set(state.videoUrl);
                                if (videoPlayer) {
                                    videoPlayer.src = state.videoUrl;
                                    
                                    // Handle play state differently based on capabilities
                                    if (inDataChannelOnlyMode) {
                                        // In data-channel-only mode, we can't rely on autoplay
                                        // so we need to manually control the video
                                        if (state.isPlaying) {
                                            // Use a user interaction event handler to play later
                                            const playPromise = videoPlayer.play().catch(e => {
                                                console.warn('Auto-play blocked in data-channel-only mode:', e);
                                                // Set up a one-time click handler to play on user interaction
                                                const playOnClick = () => {
                                                    videoPlayer.play().catch(err => console.error('Play on click failed:', err));
                                                    document.removeEventListener('click', playOnClick);
                                                };
                                                document.addEventListener('click', playOnClick, { once: true });
                                            });
                                        }
                                    } else {
                                        // Normal mode with full capabilities
                                        if (state.isPlaying) {
                                            videoPlayer.play().catch(e => console.error('Error playing video:', e));
                                        }
                                    }
                                    
                                    // Set the current time
                                    videoPlayer.currentTime = state.currentTime || 0;
                                }
                            }
                            
                            // Update PDF state
                            if (state.pdfUrl) {
                                currentPdfUrl.set(state.pdfUrl);
                                pdfScrollPosition.set(state.pdfScrollPosition || 0);
                            }
                            
                            // Update DOCX state
                            if (state.docxUrl) {
                                currentDocxUrl.set(state.docxUrl);
                                docxScrollPosition.set(state.docxScrollPosition || 0);
                            }
                            
                            // Update image state
                            if (state.imageUrl) {
                                currentImageUrl.set(state.imageUrl);
                                imageZoomLevel.set(state.imageZoomLevel || 1);
                            }
                            
                            // Update sync source
                            if (state.syncSource) {
                                syncSource = state.syncSource;
                            }
                            
                            // Update play state
                            playVideoStore.set(state.isPlaying || false);
                        }
                        
                        // Handle video URL updates
                        if (messageBody.eventType === 'video_url_update' && messageBody.messageBody) {
                            const videoUpdateData = JSON.parse(messageBody.messageBody);
                            
                            if (videoUpdateData.videoUrl) {
                                currentVideoUrl.set(videoUpdateData.videoUrl);
                                currentPdfUrl.set(''); // Clear PDF when video is shown
                                if (videoPlayer) {
                                    videoPlayer.src = videoUpdateData.videoUrl;
                                    if ($playVideoStore) {
                                        videoPlayer.play().catch(e => console.error('Error playing video:', e));
                                    }
                                }
                            }
                        } 
                        // Handle PDF URL updates
                        else if (messageBody.eventType === 'pdf_url_update' && messageBody.messageBody) {
                            const pdfUpdateData = JSON.parse(messageBody.messageBody);
                            
                            if (pdfUpdateData.fileUrl) {
                                // Clear all media types first
                                currentVideoUrl.set('');
                                currentDocxUrl.set('');
                                // Then set the new PDF URL
                                currentPdfUrl.set(pdfUpdateData.fileUrl);
                            }
                        } 
                        // Handle PDF scroll sync
                        else if (messageBody.eventType === 'pdf_scroll_sync' && messageBody.messageBody) {
                            const scrollData = JSON.parse(messageBody.messageBody);
                            if (scrollData.scrollPosition !== undefined) {
                                pdfScrollPosition.set(scrollData.scrollPosition);
                            }
                        } 
                        // Handle PDF zoom sync
                        else if (messageBody.eventType === 'pdf_zoom_sync' && messageBody.messageBody) {
                            const zoomData = JSON.parse(messageBody.messageBody);
                            if (zoomData.scale !== undefined) {
                                // Update the PDF URL with the new scale parameter
                                currentPdfUrl.update(url => {
                                    if (!url) return url;
                                    const urlObj = new URL(url);
                                    urlObj.searchParams.set('scale', zoomData.scale.toString());
                                    return urlObj.toString();
                                });
                            }
                        }
                        // Handle DOCX URL updates
                        else if (messageBody.eventType === 'docx_url_update' && messageBody.messageBody) {
                            const docxUpdateData = JSON.parse(messageBody.messageBody);
                            
                            if (docxUpdateData.fileUrl) {
                                // Clear all media types first
                                currentVideoUrl.set('');
                                currentPdfUrl.set('');
                                // Then set the new DOCX URL
                                currentDocxUrl.set(docxUpdateData.fileUrl);
                            }
                        } 
                        // Handle DOCX scroll sync
                        else if (messageBody.eventType === 'docx_scroll_sync' && messageBody.messageBody) {
                            const scrollData = JSON.parse(messageBody.messageBody);
                            if (scrollData.scrollPosition !== undefined) {
                                docxScrollPosition.set(scrollData.scrollPosition);
                            }
                        }
                        // Handle image URL updates
                        else if (messageBody.eventType === 'image_url_update' && messageBody.messageBody) {
                            const imageUpdateData = JSON.parse(messageBody.messageBody);
                            
                            if (imageUpdateData.fileUrl) {
                                // Clear all media types first
                                currentVideoUrl.set('');
                                currentPdfUrl.set('');
                                currentDocxUrl.set('');
                                // Then set the new image URL
                                currentImageUrl.set(imageUpdateData.fileUrl);
                            }
                        } 
                        // Handle image zoom sync
                        else if (messageBody.eventType === 'image_zoom_sync' && messageBody.messageBody) {
                            const zoomData = JSON.parse(messageBody.messageBody);
                            if (zoomData.zoomLevel !== undefined) {
                                imageZoomLevel.set(zoomData.zoomLevel);
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
                        case 'video_mute_sync':
                            try {
                                // Parse the inner messageBody for video mute sync
                                const muteData = JSON.parse(messageBody.messageBody);
                                
                                // Only apply if we're not the controller
                                const isCurrentController = (syncSource === 'host' && isHost) || 
                                                               (syncSource === 'representative' && isRepresentative);
                                
                                if (!isCurrentController && videoPlayer) {
                                    isVideoMuted = muteData.isMuted;
                                    videoPlayer.muted = isVideoMuted;
                                }
                            } catch (error) {
                                console.error('Error handling video mute sync:', error);
                            }
                            break;
                        case 'video_sync':
                            try {
                                // Parse the inner messageBody for video sync
                                const syncData = JSON.parse(messageBody.messageBody);
                                
                                // Accept sync if we're not the current controller
                                const isCurrentController = (syncSource === 'host' && isHost) || 
                                                                  (syncSource === 'representative' && isRepresentative);
                                
                                if (!isCurrentController && videoPlayer) {
                                    

                                    // Sync video time if difference is more than 0.5 seconds
                                    const timeDiff = Math.abs(videoPlayer.currentTime - syncData.currentTime);
                                    if (timeDiff > 0.5) {
                                        videoPlayer.currentTime = syncData.currentTime;
                                    }

                                    // Update the playVideoStore to match the sync state
                                    playVideoStore.set(syncData.isPlaying);
                                    
                                    // Sync play/pause state
                                    if (syncData.isPlaying && videoPlayer.paused) {
                                        videoPlayer.play().catch(e => console.error('Error playing video:', e));
                                    } else if (!syncData.isPlaying && !videoPlayer.paused) {
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
                                
                                
                                // Update sync source if message is from host
                                if (innerMessageBody.fromHost) {
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
          
            break;            
        case "connected":
            
            break;
        case "peerconnection_created":
           
            break;
        case "sdp_received":
           
            break;
        case "closed":
           
            connectionStatus = 'disconnected';
            break;
            // Add other cases as needed
    }
}

function handleWebRTCError(error: string, message: string) {
    console.error("WebRTC Error:", error, message);
    connectionStatus = 'error';
    
    // Show user-friendly error based on error type
    if (error === "WebSocketNotConnected") {
      toast.error("Connection to media server failed. Please check your internet connection and try again.");
    } else if (error === "UserMediaError") {
      toast.error("Cannot access camera or microphone. Please check your device permissions.");
    } else {
      console.error("WebRTC Error:", error, message);
    }
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
    console.log('joinRoom called with:', {
        isScheduledMeeting,
        meetingStatus,
        uniqueSessionId,
        roomName,
        baseRoomName,
        isRepresentative: isRepresentative || !!data.representativeName || $page.url.searchParams.get('repid') !== null
    });
    
    // More careful check for scheduled meetings
    const isScheduledMeetingActive = isScheduledMeeting && scheduledMeetingTime;
    
    // Always use URL param as fallback for any type of meeting
    const baseRoomId = isScheduledMeetingActive 
        ? (data?.scheduledRoomId || $page.params.roomId) 
        : (room?.id || $page.params.roomId);
    
    if (!baseRoomId) {
        console.error('Cannot join room: No valid room ID available');
        return;
    }
    
    console.log('Joining room with ID:', baseRoomId);
    
    console.log('Joining room:', {
        roomName,
        sanitizedRoomName: sanitizeStreamName(roomName),
        publishStreamId: publishStreamId || 'not set',
        displayName: isAuthenticated ? name : $anonymousUser,
        isRepresentative,
        isScheduledMeeting
    });

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
    // Use the unique room name with uid for the stream
    const sanitizedRoomName = sanitizeStreamName(roomName);

    // First check if the stream exists
    console.log('Checking if stream exists:', sanitizedRoomName);
    
    try {
        // First check if we need to publish (not in playOnly mode)
        if (!playOnly) {
            const streamId = `${publishStreamId}-${sanitizedName}`;
            console.log('Starting publish with streamId:', streamId);
            
            // Check if this is a representative by URL param or other means
            const isRep = isRepresentative || !!data.representativeName || $page.url.searchParams.get('repid') !== null;
            
            // For representatives, make sure video is enabled
            if (isRep && !webRTCAdaptor.mediaConstraints.video && !webRTCAdaptor.onlyDataChannel) {
                console.log('Enabling video for representative before publishing');
                
                // Request camera access for representatives
                navigator.mediaDevices.getUserMedia({ 
                    video: true, 
                    audio: mediaConstraints.audio 
                })
                .then(stream => {
                    // Update local stream with camera
                    webRTCAdaptor.localStream = stream;
                    webRTCAdaptor.mediaConstraints.video = true;
                    
                    // Now continue with publish
                    publishStream(streamId, sanitizedName, sanitizedRoomName, isRep);
                })
                .catch(err => {
                    console.error('Error getting camera for representative:', err);
                    // Continue without camera
                    publishStream(streamId, sanitizedName, sanitizedRoomName, isRep);
                });
            } else {
                // Normal publish for non-representatives or if camera is already enabled
                publishStream(streamId, sanitizedName, sanitizedRoomName, isRep);
            }
        }

        // Always play the main room
        console.log('Playing room stream:', sanitizedRoomName);
        webRTCAdaptor.play(sanitizedRoomName, null, null, [], null);
        
    } catch (error) {
        console.error('Error in room joining process:', error);
    }
}

// Helper function to publish stream (extracted from joinRoom)
function publishStream(streamId, sanitizedName, sanitizedRoomName, isRep) {
    const metadata = JSON.stringify({
        isCameraOff: !isRep && isCameraOff, // Force camera on for representatives
        isMicMuted,
        isRepresentative: isRep,
        displayName: sanitizedName,
        roomId: baseRoomName,
        uid: uniqueSessionId,
        isScheduledMeeting
    });
    
    try {
        // Check if we're in data channel only mode
        const inDataChannelOnlyMode = webRTCAdaptor.onlyDataChannel;
        
        if (!inDataChannelOnlyMode) {
            // Always create our stream
            webRTCAdaptor.publish(
                streamId,
                null,
                metadata,
                null,
                sanitizedName,
                sanitizedRoomName
            );
            
            console.log('Stream publish initiated with:', {
                streamId,
                displayName: sanitizedName,
                roomId: sanitizedRoomName,
                isRepresentative: isRep,
                isScheduledMeeting
            });
        } else {
            console.log('In data channel only mode, skipping media publish');
            isDataChannelOpen = true;
        }
    } catch (error) {
        console.error('Error publishing stream:', error);
    }
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
    // Pass uid parameter to getStreamInfo to get the correct streamId
    if (uniqueSessionId) {
        getStreamInfo(baseRoomName, uniqueSessionId).then(streamInfo => {
            console.log('Got stream info:', {
                baseRoomName,
                uniqueSessionId,
                hasSubTracks: !!streamInfo.subTrackStreamIds,
                subTrackCount: streamInfo.subTrackStreamIds?.length || 0
            });
            
            // Update participants if we have valid data, otherwise keep empty array
            if (streamInfo && !streamInfo.error && streamInfo.subTrackStreamIds) {
                meetingParticipants = streamInfo.subTrackStreamIds || [];
            } else {
                meetingParticipants = [];
            }
        }).catch(err => {
            console.error('Error getting stream info:', err);
            // Set empty array on error
            meetingParticipants = [];
        });
    }
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
    
    // Get the correct stream ID based on user type
    let displayName;
    if (isAuthenticated) {
        displayName = formatDisplayName(name);
    } else if (data.representativeName) {
        displayName = formatDisplayName(data.representativeName, true);
    } else {
        displayName = formatDisplayName($anonymousUser);
    }
    
    const sanitizedName = sanitizeStreamName(displayName);
    const streamId = `${publishStreamId}-${sanitizedName}`;
    
    console.log('Turning on camera for streamId:', streamId);
    
    // Stop current connection
    webRTCAdaptor.stop(streamId);
    
    // Reinitialize with new constraints
    setTimeout(() => {
        // First completely remove all tracks
        if (webRTCAdaptor.localStream) {
            webRTCAdaptor.localStream.getTracks().forEach(track => track.stop());
        }
        
        // Request new camera access
        navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: mediaConstraints.audio 
        })
        .then(stream => {
            // Manually set the local stream
            webRTCAdaptor.localStream = stream;
            
            // Now turn on camera in adaptor
            webRTCAdaptor.turnOnLocalCamera();
            isCameraOff = false;
            
            // Update metadata and republish
            const metadata = JSON.stringify({
                isCameraOff: false,
                isMicMuted,
                isRepresentative: !!data.representativeName,
                displayName,
                roomId: baseRoomName,
                uid: uniqueSessionId
            });
            
            console.log('Publishing with new camera stream:', {
                streamId,
                metadata,
                displayName,
                roomName: sanitizeStreamName(roomName)
            });
            
            // Republish with updated metadata
            webRTCAdaptor.publish(
                streamId,
                null,
                metadata,
                null,
                displayName,
                sanitizeStreamName(roomName)
            );
        })
        .catch(err => {
            console.error("Error reacquiring camera:", err);
            toast.error("Could not access camera. Please check your device permissions.");
        });
    }, 1000); // Increased timeout to ensure previous stream is fully stopped
}

function turnOffCamera() {
    if (!webRTCAdaptor) return;
    
    // Update media constraints to disable video
    mediaConstraints.video = false;
    
    // Stop video track
    webRTCAdaptor.turnOffLocalCamera();
    isCameraOff = true;
    
    // Get the correct stream ID based on user type
    let displayName;
    if (isAuthenticated) {
        displayName = formatDisplayName(name);
    } else if (data.representativeName) {
        displayName = formatDisplayName(data.representativeName, true);
    } else {
        displayName = formatDisplayName($anonymousUser);
    }
    
    const sanitizedName = sanitizeStreamName(displayName);
    const streamId = `${publishStreamId}-${sanitizedName}`;
    
    console.log('Turning off camera for streamId:', streamId);
    
    // Update stream metadata
    const metadata = JSON.stringify({
        isCameraOff: true,
        isMicMuted,
        isRepresentative: !!data.representativeName,
        displayName,
        roomId: baseRoomName,
        uid: uniqueSessionId
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
    
    // Update the playVideoStore to match the current play state
    const isPlaying = !videoPlayer.paused;
    playVideoStore.set(isPlaying);
    
    console.log('Video state change:', { 
        isHost, 
        isRepresentative, 
        syncSource,
        isCurrentController,
        currentTime: videoPlayer.currentTime,
        isPlaying: isPlaying,
        playVideoStore: $playVideoStore
    });
    
    if (isCurrentController && webRTCAdaptor && isDataChannelOpen) {
        const videoState = {
            eventType: 'video_sync',
            messageBody: JSON.stringify({
                currentTime: videoPlayer.currentTime,
                isPlaying: isPlaying,
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

// Update video player initialization
$: if (videoPlayer) {
    videoPlayer.ontimeupdate = () => {
        // Only sync every second to avoid flooding
        const now = Date.now();
        if (now - lastUpdate > 1000) {
            handleVideoStateChange();
            lastUpdate = now;
        }
    };
    
    // Don't automatically pause the video on initialization
    // This was causing the video to pause after play
}

const handleScheduleClose = () => {
    scheduleOpen = false;
};

// Modified togglePanel function to fix panel behavior 
function togglePanel(id) {
    const chatPanel = document.getElementById("chatPanel");
    const participantsPanel = document.getElementById("participantsPanel");
    const isMobile = window.innerWidth < 1024;
    
    if (!chatPanel || !participantsPanel) return;
    
    if (id === "chatPanel") {
        // Toggle chat panel
        chatPanelOpen = !chatPanelOpen;
        participantsPanelOpen = false;
        
        // Update UI for chat panel
        chatPanel.style.transform = chatPanelOpen ? "translateX(0%)" : "translateX(100%)";
        chatPanel.style.width = chatPanelOpen ? (isMobile ? "100vw" : "30rem") : "0px";
        
        // Close participants panel
        participantsPanel.style.transform = "translateX(100%)";
        participantsPanel.style.width = "0px";
    } else {
        // Toggle participants panel
        participantsPanelOpen = !participantsPanelOpen;
        chatPanelOpen = false;
        
        // Update UI for participants panel
        participantsPanel.style.transform = participantsPanelOpen ? "translateX(0%)" : "translateX(100%)";
        participantsPanel.style.width = participantsPanelOpen ? (isMobile ? "100vw" : "30rem") : "0px";
        
        // Close chat panel
        chatPanel.style.transform = "translateX(100%)";
        chatPanel.style.width = "0px";
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
    audio.setAttribute('playsinline', 'true');  // Use setAttribute instead of direct property
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
        file: selectedVideo?.file,
        roomName,
        isDataChannelOpen
    });
    
    // Check if we can send updates
    if ((isHost || isRepresentative) && webRTCAdaptor && isDataChannelOpen) {
        const newUrl = selectedVideo && selectedVideo.file ? 
            `${PUBLIC_POCKETBASE_INSTANCE}api/files/${selectedVideo.collectionId}/${selectedVideo.id}/${selectedVideo.file}` : '';
        
        console.log('Preparing to send video URL update:', {
            newUrl,
            roomName,
            isHost,
            isRepresentative
        });
        
        // Update local state first
        currentVideoUrl.set(newUrl);
        currentPdfUrl.set(''); // Ensure PDF is cleared
        
        // Set playVideoStore to false initially to prevent auto-play
        playVideoStore.set(false);
        
        if (videoPlayer) {
            console.log('Updating video player source');
            videoPlayer.src = newUrl;
            // Don't force pause here, let the playVideoStore control it
        }
        
        // Send update to all participants
        const videoUrlUpdate = {
            eventType: 'video_url_update',
            messageBody: JSON.stringify({
                videoUrl: newUrl,
                fromHost: isHost,
                fromRepresentative: isRepresentative,
                shouldPlay: false // Explicitly set to not play
            })
        };
        
        console.log('Sending video URL update message:', {
            videoUrlUpdate,
            roomName
        });
        
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
    } else {
        console.warn('Cannot send video update - conditions not met:', {
            isHost,
            isRepresentative,
            hasWebRTCAdaptor: !!webRTCAdaptor,
            isDataChannelOpen
        });
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
            currentTime: videoPlayer?.currentTime,
            playVideoStore: $playVideoStore
        });
        
        // If we have a video player and a URL, update it
        if (videoPlayer && value) {
            console.log('Updating video player source');
            videoPlayer.src = value;
            
            // Only play if playVideoStore is true
            if ($playVideoStore) {
                console.log('Auto-playing video based on playVideoStore');
                videoPlayer.play().catch(e => console.error('Error playing video:', e));
            } else {
                console.log('Not auto-playing video (playVideoStore is false)');
            }
        }
    });

    return () => {
        console.log('Cleaning up store subscription');
        if (unsubscribe) unsubscribe();
    };
});


function handleGreetingDismissed() {
    showGreetingPopup = false;
}

// Add the missing handleNewParticipant function
function handleNewParticipant(participant) {
    console.log("New participant joined:", participant);
    // You can add additional logic here if needed
    // For example, updating UI or sending notifications
}

// Helper function to send video updates
function sendVideoUpdate(videoUrl) {
    if (webRTCAdaptor && isDataChannelOpen) {
        const videoUrlUpdate = {
            eventType: 'video_url_update',
            messageBody: JSON.stringify({
                videoUrl,
                fromHost: true,
                fromRepresentative: false,
                shouldPlay: false // Explicitly set to not play
            })
        };
        
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

// Add function to toggle video mute
function toggleVideoMute() {
    if (videoPlayer) {
        isVideoMuted = !isVideoMuted;
        
        // If we're a controller, sync mute state to other participants
        const isCurrentController = (syncSource === 'host' && isHost) || 
                                  (syncSource === 'representative' && isRepresentative);
        
        if (isCurrentController && webRTCAdaptor && isDataChannelOpen) {
            const muteState = {
                eventType: 'video_mute_sync',
                messageBody: JSON.stringify({
                    isMuted: isVideoMuted,
                    fromHost: isHost,
                    fromRepresentative: isRepresentative
                })
            };
            
            try {
                sendMessage(
                    roomName,
                    Date.now(),
                    JSON.stringify(muteState),
                    roomName
                );
            } catch (error) {
                console.error('Error sending video mute state:', error);
            }
        }
    }
}

function handleVolumeChange(event) {
    const { volume } = event.detail;
    if (videoPlayer) {
        videoPlayer.volume = volume;
        // Store the volume level
        videoVolume = volume;
    }
}

// Add this to ensure volume is set when video player is initialized
$: if (videoPlayer) {
    videoPlayer.volume = videoVolume;
}

// Handle representative updates
function handleRepresentativesUpdate(event) {
    availableRepresentatives = event.detail.representatives;
    console.log('Available representatives updated:', availableRepresentatives);
}

// Update the shareURL reactive declaration to ensure it's always up-to-date:
$: {
    // Only update if uniqueSessionId is set and different from what's in the URL
    if (uniqueSessionId) {
        try {
            const shareUrlObj = new URL(window.location.href);
            const currentUrlUid = shareUrlObj.searchParams.get('uid');
            
            // Only update if the uid is different or missing
            if (currentUrlUid !== uniqueSessionId) {
                shareUrlObj.searchParams.set('uid', uniqueSessionId);
                shareURL = shareUrlObj.toString();
                console.log('Updated share URL:', shareURL);
            }
        } catch (error) {
            console.error('Error updating share URL:', error);
        }
    }
}

function joinRoomWithRetry() {
    // Check meeting status before attempting to join, but don't show toast
    const status = getMeetingStatus(data);
    console.log('joinRoomWithRetry - Meeting status:', status);
    
    // Only check status if this is actually a scheduled meeting
    if (isScheduledMeeting) {
        if (!status.canJoin || status.isPast) {
            console.log(`Cannot join room: ${status.isPast ? 'Meeting has ended' : 'Meeting not yet available'}`);
            return;
        }
    }
    
    joinAttempts++;
    console.log(`Attempt ${joinAttempts} to join room...`);
    
    try {
        joinRoom();
    } catch (error) {
        console.error(`Error joining room (attempt ${joinAttempts}):`, error);
        
        if (joinAttempts < MAX_JOIN_ATTEMPTS) {
            console.log(`Will retry joining room in ${joinAttempts * 2} seconds...`);
            setTimeout(joinRoomWithRetry, joinAttempts * 2000);
        } else {
            console.error('Failed to join room after maximum attempts');
            connectionStatus = 'error';
        }
    }
}

function initWithRetry() {
    webrtcInitAttempts++;
    console.log(`Initializing WebRTC attempt ${webrtcInitAttempts}/${MAX_WEBRTC_INIT_ATTEMPTS}`);
    
    try {
        initializeWebRTC();
    } catch (error) {
        console.error(`Error initializing WebRTC (attempt ${webrtcInitAttempts}):`, error);
        
        if (webrtcInitAttempts < MAX_WEBRTC_INIT_ATTEMPTS) {
            console.log(`Will retry WebRTC initialization in ${webrtcInitAttempts * 2} seconds...`);
            setTimeout(initWithRetry, webrtcInitAttempts * 2000);
        } else {
            console.error('Failed to initialize WebRTC after maximum attempts');
            connectionStatus = 'error';
            // Remove toast notifications here
        }
    }
}

// Improved getMeetingStatus function that always returns minutesLeft
function getMeetingStatus(data) {
  // If no data, meeting is available now (not scheduled)
  if (!data) return { canJoin: true, isPast: false, joinBeforeMinutes: 60, minutesLeft: 0 };
  
  // Extract the scheduled room data from the nested structure
  const scheduledRoom = data.scheduledRoom || data;
  
  // Get schedule time from the correct location
  const scheduleTime = scheduledRoom?.schedule_time || scheduledRoom?.scheduledTime;
  if (!scheduleTime) return { canJoin: true, isPast: false, joinBeforeMinutes: 60, minutesLeft: 0 };
  
  // Make sure we're working with Date objects
  const scheduleDate = scheduleTime instanceof Date ? scheduleTime : new Date(scheduleTime);
  const now = new Date();
  
  // Calculate time difference in milliseconds
  const timeDiff = scheduleDate.getTime() - now.getTime();
  
  // Convert to minutes
  const minutesLeft = Math.floor(timeDiff / 60000);
  
  // If negative, meeting has passed
  const isPast = minutesLeft < 0;
  
  // Get the join_before_minutes from the scheduled room data or default to 60
  const joinBeforeMinutes = scheduledRoom?.join_before_minutes ?? 60;
  
  // Can join if it's not in the past and scheduled to start within the allowed time
  const canJoin = !isPast && minutesLeft <= joinBeforeMinutes;
  
  console.log('Meeting status check:', {
    now: now.toISOString(),
    scheduledTime: scheduleDate.toISOString(),
    timeDiff,
    minutesLeft,
    joinBeforeMinutes,
    isPast,
    canJoin
  });
  
  return { canJoin, isPast, minutesLeft, joinBeforeMinutes };
}

// Helper function to generate an ICS calendar file
function generateCalendarInvite(scheduledRoom) {
  const startTime = new Date(scheduledRoom.schedule_time);
  const endTime = new Date(startTime.getTime() + (scheduledRoom.meeting_duration || 60) * 60 * 1000);
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ViewRoom//Calendar//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
DTSTART:${formatDateForICS(startTime)}
DTEND:${formatDateForICS(endTime)}
SUMMARY:${scheduledRoom.title || "Scheduled Meeting"}
DESCRIPTION:Join this meeting at ${window.location.href}
LOCATION:Online
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;
}

// Helper to format date for ICS
function formatDateForICS(date) {
  return date.toISOString().replace(/-|:|\.\d+/g, '');
}

// Helper to download ICS file
function downloadICS(content, filename) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

</script>


{#if isScheduledMeeting && !meetingStatus.canJoin}
  <div class="flex flex-col items-center justify-center h-screen bg-[#eceef3] p-6 text-center">
    <div class="bg-white p-8 rounded-lg shadow-lg max-w-md">
      <h2 class="text-xl font-semibold mb-4" class:text-red-600={meetingStatus.isPast} class:text-yellow-600={!meetingStatus.canJoin && !meetingStatus.isPast} class:text-green-600={meetingStatus.canJoin && !meetingStatus.isPast}>
        {meetingStatus.isPast ? 'Meeting Has Ended' : (meetingStatus.canJoin ? 'Waiting Room Open' : 'Meeting Not Available Yet')}
      </h2>
      <p class="mb-4">This meeting is scheduled and {meetingStatus.isPast ? 'has already taken place' : 'is not yet available'}.</p>
      
      <div class="mb-6">
        <p class="text-sm font-medium">Scheduled For:</p>
        <p class="text-lg">{scheduledMeetingTime.toLocaleString()}</p>
      </div>
      
      {#if meetingStatus.isPast}
        <div class="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
          <p class="text-red-800">
            This meeting has already taken place and is no longer available.
          </p>
        </div>
      {:else if !meetingStatus.canJoin}
        <div class="mb-6">
          <p class="text-sm text-gray-500">Time remaining:</p>
          <p class="text-2xl font-bold">
            {calculateTimeRemaining(scheduledMeetingTime)}
          </p>
        </div>
        
        <div class="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p class="text-yellow-800">
            {#if meetingStatus.joinBeforeMinutes === 0}
              You'll be able to join this meeting when it starts.
            {:else}
              You'll be able to join the waiting room {meetingStatus.joinBeforeMinutes} minute{meetingStatus.joinBeforeMinutes !== 1 ? 's' : ''} before the scheduled start time.
            {/if}
          </p>
        </div>
        
        <button 
          class="w-full py-2 mb-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          on:click={() => {
            const icsContent = generateCalendarInvite({
              schedule_time: scheduledMeetingTime,
              title: data?.scheduledRoom?.title || data?.title || 'Scheduled Meeting',
              id: data?.scheduledRoom?.id || data?.id || 'meeting'
            });
            downloadICS(icsContent, `meeting-invite.ics`);
          }}
        >
          Add to Calendar
        </button>
      {:else}
        <div class="mb-6">
          <p class="text-sm text-gray-500">Time remaining:</p>
          <p class="text-2xl font-bold">
            {calculateTimeRemaining(scheduledMeetingTime)}
          </p>
        </div>
        
        <div class="mb-6 p-3 bg-green-50 border border-green-200 rounded-md">
          <p class="text-green-800">
            You're now in the waiting room. The meeting will start soon.
          </p>
        </div>
      {/if}
      
      <button 
        class="w-full py-2 bg-primary text-white rounded-md hover:bg-primary/80"
        on:click={() => window.location.reload()}
      >
        Refresh Page
      </button>
    </div>
  </div>
{:else if !isAuthenticated && (!$anonymousUser || $anonymousUser === '') && !data?.representativeName}
  <NameInputModal on:nameSubmitted={handleNameSubmitted} roomName={room?.title} />
{:else}
    <!-- Always render meeting room in the background -->
    <div class="h-screen min-w-full bg-[#9d9d9f] relative overflow-hidden">
        {#if showGreetingPopup}
            <GreetingPopup name={data?.representativeName} host={isHost} on:dismissed={handleGreetingDismissed} />
        {/if}
        
        <div id="players" class="hidden">
            <audio id="localAudio" autoplay playsinline></audio>
        </div>

        <div class="h-full overflow-y-scroll">
            <div class="flex items-center md:items-start h-full pt-6 pb-24">
                <!-- left sidebar -->
                <div class="hidden lg:flex">
                    <LeftBar 
                        joinURL={shareURL} 
                        videoRepresentatives={representatives} 
                        userId={user?.id || ''} 
                        shareURL={shareURL}
                        {scheduleOpen} 
                        availableRepresentatives={availableRepresentatives}
                        on:closeSchedule={handleScheduleClose} 
                    />
                </div>
                
                <!-- Main content area -->
                <div class="flex-grow h-full bg-[#9d9d9f] relative flex">
                    <div class="video-container bg-red h-full w-full relative">
                        <RepresentativeIndicator 
                            participants={meetingParticipants}
                            on:representativesUpdate={handleRepresentativesUpdate}
                        />
                        {#if isHost || isRepresentative}
                            <div class="absolute top-1 right-4 z-[32] flex gap-2 bg-black/50 p-2 rounded">
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
                            {#if (syncSource === 'host' && isHost) || (syncSource === 'representative' && isRepresentative)}
                                <video
                                    class="w-full h-full object-contain absolute inset-0"
                                    controls={true}
                                    src={$currentVideoUrl}
                                    bind:this={videoPlayer}
                                    on:play={handleVideoStateChange}
                                    on:pause={handleVideoStateChange}
                                    on:seeking={handleVideoStateChange}
                                    muted={isVideoMuted}
                                    loop
                                >
                                    Your browser does not support the video element.
                                </video>
                            {:else}
                                <video
                                    class="w-full h-full object-contain absolute inset-0"
                                    controls={false}
                                    src={$currentVideoUrl}
                                    bind:this={videoPlayer}
                                    muted={isVideoMuted}
                                    loop
                                >
                                    Your browser does not support the video element.
                                </video>
                            {/if}
                        {:else if $currentImageUrl}
                            <ImageViewer
                                roomName={roomName}
                                isController={(syncSource === 'host' && isHost) || (syncSource === 'representative' && isRepresentative)}
                            />
                        {:else if $currentDocxUrl}
                            <DocxViewer
                                roomName={roomName}
                                isController={(syncSource === 'host' && isHost) || (syncSource === 'representative' && isRepresentative)}
                            />
                        {:else if $currentPdfUrl}
                            <PdfViewer
                                roomName={roomName}
                                isController={(syncSource === 'host' && isHost) || (syncSource === 'representative' && isRepresentative)}
                            />
                        {:else}
                            <div class="absolute inset-0 flex items-center justify-center text-white text-xl">
                                No media selected
                            </div>
                        {/if}
                        
                      
                    </div>

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
                            <Participants participants={meetingParticipants} isHost={isHost} name={name} users={users} shareURL={shareURL} />
                        </div>
                    </div>
                </div>

                <!-- Right sidebar controls -->
                <div class="flex-col gap-3 h-full justify-end hidden lg:flex">
                 
                    <div class="w-14 h-auto bg-red flex flex-col gap-4 justify-end">
                        <Button
                            variant="ghost"
                            size="icon"
                            class="w-full hover:bg-red-700 relative"
                            id="participants-button"
                            on:click={() => togglePanel("participantsPanel")}
                        >
                            <div class="absolute -top-2 left-8 w-6 h-6 flex items-center justify-center bg-[#47484b] text-white rounded-full">
                                {selfIncludedParticipantCount}
                            </div>
                            <img src="/icons/icon-participants.svg" alt="Participants" class="w-11 h-11" />
                        </Button>
                    </div>

                    <div class="w-14 h-auto bg-red flex flex-col gap-1 justify-end items-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            class="w-full hover:bg-red-700"
                            id="chat-button"
                            on:click={() => togglePanel("chatPanel")}
                        >
                        <img src="/icons/icon-chat.svg" alt="Chat" class="w-9 h-9" />
                        </Button>
                        <p class="text-white text-sm">Chat</p>
                    </div>

                </div>
            </div>

            <!-- Mobile Bottom Bar -->
            <MobileBottomBar 
                roomIdentityName={room?.title || 'Meeting Room'}
                videoRepresentatives={representatives}
                availableRepresentatives={availableRepresentatives}
                scheduleOpen={scheduleOpen}
                userId={user?.id || ''}
                joinURL={shareURL}
                {isMicMuted}
                {isCameraOff}
                {isVideoMuted}
                on:leaveRoom={leaveRoom}
                on:toggleMicrophone={toggleMicrophone}
                on:toggleCamera={toggleCamera}
                on:toggleVideoMute={toggleVideoMute}
                on:togglePanel={handlePanelToggle}
            />

            <!-- MediaSelector -->
            {#if (isHost || isRepresentative) && room}
                <div class="h-72 ">
                    <MediaSelector 
                        {isHost} 
                        {isRepresentative} 
                        {room} 
                        {roomName}
                        on:videoSelect={handleVideoSelect}
                    />
                </div>
            {/if}



            <!-- Desktop Bottom Bar -->
            <div class="hidden lg:block">
                    <BottomBar 
                        roomIdentityName={room?.title || 'Meeting Room'}
                        {isMicMuted} 
                        on:leaveRoom={leaveRoom} 
                        on:toggleMicrophone={toggleMicrophone} 
                        {isCameraOff} 
                        on:toggleCamera={toggleCamera}
                        {isVideoMuted}
                        {videoVolume}
                        on:toggleVideoMute={toggleVideoMute}
                        on:volumeChange={handleVolumeChange}
                    />
            </div>
        </div>
    </div>

    <!-- Modal overlay for name input -->
    {#if !isAuthenticated && (!$anonymousUser || $anonymousUser === '') && !data?.representativeName}
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div class="relative z-50">
          <NameInputModal on:nameSubmitted={handleNameSubmitted} roomName={room?.title} />
        </div>
      </div>
    {/if}
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

