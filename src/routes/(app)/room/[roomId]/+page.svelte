<script lang="ts">
	import { dev } from '$app/environment';
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
    onMount,
    onDestroy
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
    import { MessageSquareDashed, PlayCircle, UsersRound, X } from 'lucide-svelte';
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
	import { getRepInfo } from '$lib/utils.js';
    import { normalizeContent } from '$lib/utils/content';
	import { Img } from 'svelte-email';
	import MobileTopBar from '$lib/components/layout/mobile-top-bar.svelte';

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
let scheduleOpen = false;
let shareURL = $page.url.href;

// Permission state: 'granted' | 'denied' | 'prompt' | 'unknown'
let micPermission: string = 'unknown';
let cameraPermission: string = 'unknown';

// Add video state management
let videoPlayer;
let isVideoPlaying = false;
let currentVideoTime = 0;
let isVideoMuted = false;

// Live mode from data channel (rep GO LIVE = composited stream full-screen)
let isRepLive = false;
let liveCameraMode: string | null = null;

// Room data

// Get the base room name from the URL
const baseRoomName = $page.url.pathname.split("/").pop().split("&")[0];

// Near the top with other state variables
let uniqueSessionId = '';

// Room data
$: roomName = uniqueSessionId ? `${baseRoomName}-${uniqueSessionId}` : baseRoomName;
const user = data?.user;
const viewroomUser = data?.viewroomUser;
const isAuthenticated = !!user || !!viewroomUser;
const viewroomDisplayName = viewroomUser ? [viewroomUser.first_name, viewroomUser.last_name].filter(Boolean).join(' ').trim() || viewroomUser.email : '';
// Construct proper display name based on user type
// Prioritize anonymous user ID if anonymous mode is active (reactive to URL changes)
let name = '';
$: {
    const isAnonymousMode = $page.url.searchParams.get('anonymous') === 'true';
    const urlAnonymousUserId = $page.url.searchParams.get('anonymousUserId') || '';
    
    if (isAnonymousMode && urlAnonymousUserId) {
        // Use anonymous user ID from URL params when in anonymous mode
        name = urlAnonymousUserId;
    } else if (user && !isAnonymousMode) {
        name = user?.company_name || '';
    } else if (viewroomUser && !isAnonymousMode) {
        name = viewroomDisplayName;
    } else if (data?.representativeName) {
        // Use the representative name from server data
        name = data.representativeName;
    } else {
        // Will be set later when representative info is available
        name = '';
    }
}
const representatives = data?.representatives || [];
const users = data?.users || [];
let isAnonymousHost = false;
let isHost = false;
const host = $page.url.pathname.split("/").pop().split("-").pop();
let showGreetingPopup = false;

// Fix room data structure - data is the room object directly from server
const room = data?.id ? data : null;

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
    // Determine if user is host (owner of the room or anonymous host from embed)
    isAnonymousHost = $page.url.searchParams.get('isHost') === 'true' && 
                       $page.url.searchParams.get('anonymous') === 'true';
    isHost = room ? (user?.id === room.owner_company) || 
             isAnonymousHost || 
             (room.host && room.host.includes($page.url.searchParams.get('hostUserId') || '')) : false;
    
    // Set showGreetingPopup based on isAnonymousHost
    showGreetingPopup = isAnonymousHost;
    
    // Determine if user is a representative - repid URL param is the primary indicator
    const urlRepId = $page.url.searchParams.get('repid');
    isRepresentative = (urlRepId !== null && urlRepId !== '') || 
                      !!data?.representativeName ||
                      representatives?.some(rep => rep.id === (user?.id || viewroomUser?.id)) || false;
    

}

// Add videoElements map declaration at the top with other state variables
let videoElements = new Map();

// Dual camera streaming state (rep front/back from mobile LIVE mode)
let representativeStreams: {
	odooRepId: string | null;
	front: { streamId: string | null; mediaStream: MediaStream | null; playing: boolean };
	back: { streamId: string | null; mediaStream: MediaStream | null; playing: boolean };
	isLive: boolean;
} = {
	odooRepId: null,
	front: { streamId: null, mediaStream: null, playing: false },
	back: { streamId: null, mediaStream: null, playing: false },
	isLive: false
};
/** Stream IDs currently shown in dual-camera layout (so RepresentativeIndicator can hide them) */
let dualCameraStreamIds: string[] = [];

function parseStreamId(streamId: string): {
	uniqueId: string;
	odooRepId: string | null;
	cameraType: string;
	isBackCamera: boolean;
	isFrontCamera: boolean;
} {
	const match = streamId.match(/^(.+)-(.+)_(front|back)$/);
	if (match) {
		return {
			uniqueId: match[1],
			odooRepId: match[2],
			cameraType: match[3],
			isBackCamera: match[3] === 'back',
			isFrontCamera: match[3] === 'front'
		};
	}
	return {
		uniqueId: streamId,
		odooRepId: null,
		cameraType: 'unknown',
		isBackCamera: false,
		isFrontCamera: false
	};
}

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
let availableRepresentatives = [...representatives];

// Helper to read representative name from cookie
function getRepresentativeCookieName(): string {
    try {
        const entry = document.cookie.split('; ').find(c => c.startsWith('rep_user='));
        if (!entry) return '';
        const json = decodeURIComponent(entry.split('=')[1] || '');
        const rep = JSON.parse(json);
        
        // Prioritize full name construction from firstName and lastName
        if (rep?.firstName && rep?.lastName) {
            return `${rep.firstName} ${rep.lastName}`.trim();
        }
        
        // Fallback to name field
        return (rep?.name || rep?.firstName || rep?.lastName || '').toString();
    } catch { 
        console.error('Failed to parse representative cookie');
        return ''; 
    }
}

// Keep a self name for indicator suppression
let repSelfName = '';

// Find the rep's regular stream ID for live mode (when no _back stream exists)
$: liveRepStreamId = (() => {
	if (representativeStreams.back.streamId) return null;
	for (const p of meetingParticipants) {
		const sid = typeof p === 'string' ? p : p?.streamId;
		const isRep = typeof p === 'string'
			? /_representative$/i.test((p.split('-').pop() || ''))
			: (p?.isRepresentative || /_representative$/i.test(p?.name || ''));
		if (isRep && sid && !dualCameraStreamIds.includes(sid)) return sid;
	}
	return null;
})();

// Find rep display name from meetingParticipants for indicator label
$: liveRepName = (() => {
	for (const p of meetingParticipants) {
		if (typeof p === 'string') {
			if (/_representative$/i.test(p.split('-').pop() || ''))
				return (p.split('-').pop() || '').replace(/_representative$/i, '').replace(/_/g, ' ').trim() || 'Representative';
		} else if (p?.isRepresentative || /_representative$/i.test(p?.name || '')) {
			return (p.name || '').replace(/_representative$/i, '').replace(/_/g, ' ').trim() || 'Representative';
		}
	}
	return 'Representative';
})();

// PIP (selfie/front) only in rep indicator. Normal stream (back) only in big view.
$: indicatorParticipants = (() => {
	if (representativeStreams.front.streamId) {
		return [{ streamId: representativeStreams.front.streamId, name: liveRepName + '_representative', isRepresentative: true }];
	}
	if (isRepLive) return []; // back/composited in big view only
	return meetingParticipants.filter((p: any) => !dualCameraStreamIds.includes(typeof p === 'string' ? p : p?.streamId || ''));
})();

function getWebSocketURL() {
    const raw = (PUBLIC_ANT_MEDIA_URL || '').trim();
    try {
        // Build a URL object regardless of whether protocol is provided
        const hasProto = /^https?:\/\//i.test(raw) || /^wss?:\/\//i.test(raw);
        const base = hasProto ? raw : `${location.protocol === 'https:' ? 'https://' : 'http://'}${raw}`;
        const u = new URL(base);

        // Normalize pathname: drop trailing /websocket if present; ensure no trailing slash
        let appPath = (u.pathname || '').replace(/\/+$/, '');
        if (/\/websocket$/i.test(appPath)) {
            appPath = appPath.replace(/\/websocket$/i, '');
        }
        if (appPath === '' || appPath === '/') {
            appPath = '/WebRTCAppEE';
        }

        // Decide protocol
        const secure = u.protocol === 'https:' || u.protocol === 'wss:' || location.protocol === 'https:' || u.host.includes(':5443');
        const wsProto = secure ? 'wss' : 'ws';

        return `${wsProto}://${u.host}${appPath}/websocket`;
    } catch {
        // Fallback to previous behavior with extra sanitization
        let cleaned = raw.replace(/^wss?:\/\//i, '').replace(/^https?:\/\//i, '');
        cleaned = cleaned.replace(/[?#].*$/, '').replace(/\/+$|^\/+/, '');
        const host = cleaned.split('/')[0];
        const secure = host.includes(':5443') || location.protocol === 'https:';
        const wsProto = secure ? 'wss' : 'ws';
        return `${wsProto}://${host}/WebRTCAppEE/websocket`;
    }
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
    const repId = params.get('repid');
    
    // Set isRepresentative based on URL parameter
    if (repId) {
        isRepresentative = true;
    }

    // Check if this is a scheduled meeting
    
    // Check all possible schedule data locations but be more strict about detection
    isScheduledMeeting = false; // Reset to false by default
    if (data) {
      // Check for error in scheduled meeting first
      if (data.error && data.scheduledMeeting) {
        isScheduledMeeting = true;
        scheduledMeetingTime = new Date(data.scheduledTime);
        
        // Ensure meetingStatus reflects the error state
        meetingStatus = {
          canJoin: false,
          isPast: false,
          joinBeforeMinutes: data.join_before_minutes || 0,
          minutesLeft: Math.floor((scheduledMeetingTime.getTime() - new Date().getTime()) / 60000)
        };
        
        
        // Exit early to prevent further processing
        return;
      }
      
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
            join_before_minutes: data.join_before_minutes || data.scheduledRoom?.join_before_minutes || 0
          }
        });
        
        // Ensure we always have minutesLeft property
        meetingStatus = {
          ...meetingStatusResult,
          minutesLeft: meetingStatusResult.minutesLeft || 0
        };
        
      }
    }
    
    // Initialize WebRTC only if meeting is available
    if (meetingStatus.canJoin) {
      // Initialize WebRTC if we have a name or are a representative
      if (isAuthenticated || $anonymousUser || data?.representativeName || isRepresentative) {
        initializeWebRTC();
      }
    }

    // Check mic/camera permissions so warning indicators are immediately visible
    checkPermissions();
    
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
        
        // Destroy existing WebRTC adaptor if it exists
        if (webRTCAdaptor) {
            try {
                webRTCAdaptor.close();
            } catch (closeError) {
                console.warn('Error closing existing WebRTC adaptor:', closeError);
            }
            webRTCAdaptor = null;
        }
        
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
        }
        
        // Initialize WebRTC with more robust configuration
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
            },
            // Add reconnection configuration
            reconnectionTimeout: 5000,  // 5 seconds between reconnection attempts
            maxReconnectionAttempts: 3  // Maximum number of reconnection attempts
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
            console.error('Failed to initialize WebRTC. Please check your connection and try again.');
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
            // This is expected when trying to play a room that doesn't have any publishers yet
            isNoStreamExist = true;
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
                const streamInfo = parseStreamId(obj.streamId);
                // Dual camera: subscribe to front/back streams and track state
                if (streamInfo.isBackCamera) {
                    representativeStreams.back.streamId = obj.streamId;
                    representativeStreams.isLive = true;
                    representativeStreams.odooRepId = streamInfo.odooRepId;
                    if (!dualCameraStreamIds.includes(obj.streamId)) dualCameraStreamIds = [...dualCameraStreamIds, obj.streamId];
                    if (webRTCAdaptor) webRTCAdaptor.play(obj.streamId);
                } else if (streamInfo.isFrontCamera) {
                    representativeStreams.front.streamId = obj.streamId;
                    representativeStreams.odooRepId = representativeStreams.odooRepId ?? streamInfo.odooRepId;
                    if (!dualCameraStreamIds.includes(obj.streamId)) dualCameraStreamIds = [...dualCameraStreamIds, obj.streamId];
                    if (webRTCAdaptor) webRTCAdaptor.play(obj.streamId);
                }

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
        case "streamLeaved":
        case "streamLeft":
            if (obj.streamId) {
                const streamInfo = parseStreamId(obj.streamId);
                if (streamInfo.isBackCamera) {
                    representativeStreams.back.streamId = null;
                    representativeStreams.back.mediaStream = null;
                    representativeStreams.back.playing = false;
                    representativeStreams.isLive = false;
                    dualCameraStreamIds = dualCameraStreamIds.filter((id) => id !== obj.streamId);
                    const backEl = document.getElementById('back-camera-video') as HTMLVideoElement;
                    if (backEl) backEl.srcObject = null;
                } else if (streamInfo.isFrontCamera) {
                    representativeStreams.front.streamId = null;
                    representativeStreams.front.mediaStream = null;
                    representativeStreams.front.playing = false;
                    dualCameraStreamIds = dualCameraStreamIds.filter((id) => id !== obj.streamId);
                    const frontEl = document.getElementById('front-camera-video') as HTMLVideoElement;
                    if (frontEl) frontEl.srcObject = null;
                }
            }
            break;
        case "data_channel_opened":
            isDataChannelOpen = true;
            
            // If we're not the current controller, request the current media state
            if (!((syncSource === 'host' && isHost) || (syncSource === 'representative' && isRepresentative))) {
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
                        if (messageBody.eventType === 'media_state_request') {
                            const isController = (syncSource === 'host' && isHost) || (syncSource === 'representative' && isRepresentative);
                            if (isController) {
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
                                        syncSource,
                                        isLive: isRepLive,
                                        ...(liveCameraMode && { cameraMode: liveCameraMode })
                                    })
                                };
                                sendMessage(
                                    roomName,
                                    Date.now(),
                                    JSON.stringify(currentState),
                                    roomName
                                );
                            }
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
                                            } else {
                                                videoPlayer.pause();
                                            }
                                        } else {
                                            // Normal mode with full capabilities
                                            if (state.isPlaying) {
                                                videoPlayer.play().catch(e => console.error('Error playing video:', e));
                                            } else {
                                                videoPlayer.pause();
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

                            // Live mode (for late joiners)
                            if (state.isLive !== undefined) {
                                isRepLive = state.isLive;
                                liveCameraMode = state.cameraMode || null;
                            }
                        }
                        
                        // Handle media URL updates
                        if (messageBody.eventType.endsWith('_url_update') && messageBody.messageBody) {
                            const mediaUpdateData = JSON.parse(messageBody.messageBody);
                            
                            // Determine media type from event type
                            const mediaType = messageBody.eventType.replace('_url_update', '');
                            
                            // Clear all media stores first
                            currentVideoUrl.set('');
                            currentPdfUrl.set('');
                            currentDocxUrl.set('');
                            currentImageUrl.set('');
                            
                            // Set the appropriate media URL
                            switch (mediaType) {
                                case 'video':
                                    currentVideoUrl.set(mediaUpdateData.fileUrl);
                                    playVideoStore.set(mediaUpdateData.shouldPlay || false);
                                    break;
                                case 'pdf':
                                    currentPdfUrl.set(mediaUpdateData.fileUrl);
                                    break;
                                case 'docx':
                                    currentDocxUrl.set(mediaUpdateData.fileUrl);
                                    break;
                                case 'image':
                                    currentImageUrl.set(mediaUpdateData.fileUrl);
                                    break;
                            }
                            
                            // Update sync source if needed
                            if (mediaUpdateData.fromHost) {
                                syncSource = 'host';
                            } else if (mediaUpdateData.fromRepresentative) {
                                syncSource = 'representative';
                            }
                        }
                        
                        // Handle video URL updates
                        if (messageBody.eventType === 'video_url_update' && messageBody.messageBody) {
                            const videoUpdateData = JSON.parse(messageBody.messageBody);
                            
                            if (videoUpdateData.videoUrl) {
                                currentVideoUrl.set(videoUpdateData.videoUrl);
                                currentPdfUrl.set(''); // Clear PDF when video is shown
                                // Update play intent based on controller
                                const shouldPlay = videoUpdateData.shouldPlay === true;
                                playVideoStore.set(shouldPlay);
                                if (videoPlayer) {
                                    videoPlayer.src = videoUpdateData.videoUrl;
                                    if (shouldPlay) {
                                        videoPlayer.play().catch(e => console.warn('Autoplay blocked. Waiting for user interaction to play.', e));
                                    } else {
                                        videoPlayer.pause();
                                    }
                                }
                            }
                        } 
                        // Handle PDF URL updates
                        else if (messageBody.eventType === 'pdf_url_update' && messageBody.messageBody) {
                            try {
                                const pdfUpdateData = JSON.parse(messageBody.messageBody);
                                
                                // Clear all media stores first
                                currentVideoUrl.set('');
                                currentPdfUrl.set('');
                                currentDocxUrl.set('');
                                currentImageUrl.set('');
                                
                                // Set the PDF URL
                                currentPdfUrl.set(pdfUpdateData.fileUrl);
                                
                                // Update sync source if needed
                                if (pdfUpdateData.fromHost) {
                                    syncSource = 'host';
                                } else if (pdfUpdateData.fromRepresentative) {
                                    syncSource = 'representative';
                                }
                                
                                // Optional: handle initial scale and page if provided
                                if (pdfUpdateData.initialScale) {
                                    // You might want to set this in a PDF-specific store or pass to the PDF viewer
                                    pdfScrollPosition.set(pdfUpdateData.initialScale);
                                }
                            } catch (error) {
                                console.error('Error handling PDF update:', error);
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
                                // Pause any playing video for document focus
                                playVideoStore.set(false);
                                if (videoPlayer) videoPlayer.pause();
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
                        // Handle camera state updates
                        else if (messageBody.eventType === 'camera_state_update' && messageBody.messageBody) {
                            try {
                                const cameraStateData = JSON.parse(messageBody.messageBody);
                                
                                // Only apply if we're not the controller
                                const isCurrentController = (syncSource === 'host' && isHost) || 
                                                           (syncSource === 'representative' && isRepresentative);
                                
                                // if (!isCurrentController) {
                                //     isCameraOff = cameraStateData.isCameraOff;
                                    
                                //     // Clear video player source if camera is off
                                //     if (videoPlayer) {
                                //         if (isCameraOff) {
                                //             videoPlayer.srcObject = null;
                                //             videoPlayer.src = '';
                                //         } else {
                                //             // Attempt to restore video stream
                                //             if (webRTCAdaptor && webRTCAdaptor.localStream) {
                                //                 videoPlayer.srcObject = webRTCAdaptor.localStream;
                                //                 videoPlayer.play().catch(e => console.error('Error playing video:', e));
                                //             }
                                //         }
                                //     }
                                // }
                            } catch (error) {
                                console.error('Error handling camera state update:', error);
                            }
                        }
                    }
                    
                    
                    // Handle other message types
                    switch (messageBody?.eventType) {
                        case 'live_mode_change': {
                            try {
                                const payload = JSON.parse(messageBody.messageBody);
                                isRepLive = !!payload.isLive;
                                liveCameraMode = payload.cameraMode || null;
                                console.log(`[LiveMode] isLive=${isRepLive}, cameraMode=${liveCameraMode}`);
                            } catch (e) {
                                console.error('Error parsing live_mode_change:', e);
                            }
                            break;
                        }
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
                                    
                                    
                                    // Improved sync strategy for variable networks:
                                    // - Hard seek only if desync >= 5s
                                    // - For 0.5s <= desync < 5s, drift via temporary playbackRate nudge
                                    const timeDiffSigned = (syncData.currentTime ?? 0) - (videoPlayer.currentTime ?? 0);
                                    const timeDiff = Math.abs(timeDiffSigned);
                                    if (timeDiff >= 5.0) {
                                        videoPlayer.currentTime = syncData.currentTime;
                                    } else if (timeDiff >= 0.5) {
                                        const originalRate = videoPlayer.playbackRate || 1.0;
                                        const nudgeRate = timeDiffSigned > 0 ? Math.min(1.25, originalRate + 0.05) : Math.max(0.75, originalRate - 0.05);
                                        videoPlayer.playbackRate = nudgeRate;
                                        setTimeout(() => {
                                            videoPlayer.playbackRate = 1.0;
                                        }, 2000);
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
    // Log full error details for debugging
    const logMethod = error === "no_stream_exist" ? console.log : console.error;
    logMethod("Detailed WebRTC Error:", {
        error,
        message,
        currentStreamId: publishStreamId,
        roomName,
        isRepresentative,
        isHost,
        connectionStatus
    });
    
    // Use console.log instead of console.error for expected errors
    if (error === "no_stream_exist") {
        console.log("WebRTC Info:", error, message);
    } else {
        console.error("WebRTC Error:", error, message);
    }
    
    // Don't set error status for expected errors
    if (error !== "no_stream_exist") {
        connectionStatus = 'error';
    }
    
    // More comprehensive error handling
    switch (error) {
        case "already_publishing":
            console.warn("Stream already in publishing state. Attempting to recover...");
            try {
                // Force stop all streams and reset
                webRTCAdaptor.stop(roomName);
                webRTCAdaptor.stop(publishStreamId);
                
                // Reinitialize WebRTC connection
                setTimeout(initWithRetry, 1000);
            } catch (recoveryError) {
                console.error("Recovery attempt failed:", recoveryError);
                console.error("Stream recovery failed. Please refresh the page.");
            }
            break;
        case "WebSocketNotConnected":
            console.error("Connection to media server failed. Please check your internet connection and try again.");
            break;
        case "UserMediaError":
            console.error("Cannot access camera or microphone. Please check your device permissions.");
            // Update permission states so the UI shows warning indicators
            micPermission = 'denied';
            cameraPermission = 'denied';
            break;
        case "notSetRemoteDescription":
            // Specific handling for remote description error
            console.warn("Remote description error. Attempting to reset WebRTC connection.");
            // Attempt to reinitialize WebRTC
            if (webrtcInitAttempts < MAX_WEBRTC_INIT_ATTEMPTS) {
                setTimeout(initWithRetry, 1000);
            } else {
                console.error("Persistent WebRTC connection issues. Please refresh the page.");
            }
            break;
        case "no_stream_exist":
            // This is expected when you're the first person in the room
            // The room stream doesn't exist yet, which is normal
            console.log("Room stream doesn't exist yet. This is normal if you're the first participant.");
            isNoStreamExist = true;
            // Don't show error toast for this expected case
            break;
        default:
            console.error("Unhandled WebRTC Error:", error, message);
            console.error("An unexpected WebRTC error occurred. Please try again.");
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

// Helper function to get clean display name for UI (without _representative suffix)
function getCleanDisplayName(name: string): string {
    if (!name) return 'Unknown User';
    return name.replace(/_+representative$/i, '').trim();
}

import { isCurrentUserMessage, extractAndNormalizeName, getInitials } from '$lib/utils/chat';

// can't use await at top-level in Svelte component scripts, so use an async IIFE if you want to log this
// (async () => {
//     console.log("repppp",await getRepInfo($page.url.searchParams.get('repid')));
// })();

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
    
    if (!publishStreamId) {
        publishStreamId = generateRandomString(8);            
    }

    // Format the display name based on user type
    // Check for anonymous mode first (even if user is authenticated)
    const isAnonymousMode = $page.url.searchParams.get('anonymous') === 'true';
    const urlAnonymousUserId = $page.url.searchParams.get('anonymousUserId') || '';
    
    let displayName;
    if (isAnonymousMode && urlAnonymousUserId) {
        // Use anonymous user ID when in anonymous mode, even if authenticated
        displayName = formatDisplayName(urlAnonymousUserId);
    } else if (isAuthenticated) {
        displayName = formatDisplayName(name);
    } else if (data.representativeName) {
        displayName = formatDisplayName(data.representativeName, true);
    } else if (isRepresentative) {
        // Get representative name from the API response
        const repId = $page.url.searchParams.get('repid');
        if (repId) {
            // Use the representative data we already fetched
            getRepInfo(repId).then(repData => {
                if (repData) {
                    const repDisplayName = formatDisplayName(repData.name || `${repData.firstName} ${repData.lastName}`.trim(), true);
                    console.log('Using representative name from API:', repDisplayName);
                    
                    // Now join with the correct name
                    joinWithDisplayName(repDisplayName);
                } else {
                    // Fallback to cookie name
                    const cookieName = getRepresentativeCookieName();
                    const fallbackName = cookieName && cookieName.trim() ? cookieName : 'Representative';
                    joinWithDisplayName(formatDisplayName(fallbackName, true));
                }
            }).catch(err => {
                console.error('Error getting rep info:', err);
                // Fallback to cookie name
                const cookieName = getRepresentativeCookieName();
                const fallbackName = cookieName && cookieName.trim() ? cookieName : 'Representative';
                joinWithDisplayName(formatDisplayName(fallbackName, true));
            });
            return; // Exit early since we're handling this asynchronously
        } else {
            // Fallback to cookie name
            const cookieName = getRepresentativeCookieName();
            if (cookieName && cookieName.trim()) {
                displayName = formatDisplayName(cookieName, true);
            } else {
                displayName = formatDisplayName('Representative', true);
            }
        }
    } else {
        displayName = formatDisplayName($anonymousUser);
    }

    // If we have a synchronous displayName, join immediately
    if (displayName) {
        joinWithDisplayName(displayName);
    }
}

// Helper function to join with a specific display name
function joinWithDisplayName(displayName) {
    const sanitizedName = sanitizeStreamName(displayName);
    const sanitizedRoomName = sanitizeStreamName(roomName);

    console.log('Joining room with display name:', {
        displayName,
        sanitizedName,
        sanitizedRoomName,
        isRepresentative,
        isScheduledMeeting
    });

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
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
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

// ─── Permission utilities ────────────────────────────────────────────────────

/**
 * Query the browser Permissions API for mic and camera state.
 * Falls back gracefully on browsers that don't support it.
 */
// Cleanup handlers for permission change listeners
let cleanupPermissionListeners: (() => void) | null = null;

async function checkPermissions() {
    if (typeof navigator === 'undefined' || !navigator.permissions) return;
    try {
        const [micResult, camResult] = await Promise.all([
            navigator.permissions.query({ name: 'microphone' as PermissionName }),
            navigator.permissions.query({ name: 'camera' as PermissionName })
        ]);
        micPermission = micResult.state;
        cameraPermission = camResult.state;

        // Watch for live changes (user may change browser settings while in room)
        const onMicChange = () => { micPermission = micResult.state; };
        const onCamChange = () => { cameraPermission = camResult.state; };
        micResult.addEventListener('change', onMicChange);
        camResult.addEventListener('change', onCamChange);

        // Store cleanup so onDestroy can remove the listeners
        cleanupPermissionListeners = () => {
            micResult.removeEventListener('change', onMicChange);
            camResult.removeEventListener('change', onCamChange);
        };
    } catch (e) {
        // Permissions API not available (e.g. Firefox < 88 for camera)
        console.warn('Permissions API not fully supported:', e);
    }
}

/**
 * Trigger the browser's default microphone permission prompt.
 * If the user grants access, also restart the WebRTC adaptor so audio works.
 */
async function requestMicPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        // Permission granted – update state and stop the temporary stream
        stream.getTracks().forEach(t => t.stop());
        micPermission = 'granted';
        // Re-initialise WebRTC so the new permission takes effect
        if (!webRTCAdaptor) {
            initializeWebRTC();
        }
    } catch (err) {
        console.warn('Mic permission request rejected:', err);
        micPermission = 'denied';
    }
}

/**
 * Trigger the browser's default camera permission prompt.
 */
async function requestCameraPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        stream.getTracks().forEach(t => t.stop());
        cameraPermission = 'granted';
        if (!webRTCAdaptor) {
            initializeWebRTC();
        }
    } catch (err) {
        console.warn('Camera permission request rejected:', err);
        cameraPermission = 'denied';
    }
}

// ─── End permission utilities ─────────────────────────────────────────────────

function muteLocalMic() {
    if (!webRTCAdaptor) return;
    // Also directly disable the track when a local stream is available; the
    // adaptor call below handles the peer-connection side regardless.
    if (webRTCAdaptor.localStream) {
        const audioTrack = webRTCAdaptor.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = false;
            console.log('Muted local mic');
        }
    }
    try {
        webRTCAdaptor.muteLocalMic();
    } catch (e) {
        console.warn('muteLocalMic error:', e);
    }
    isMicMuted = true;
}

function unmuteLocalMic() {
    if (!webRTCAdaptor) return;
    // Also directly re-enable the track when a local stream is available; the
    // adaptor call below handles the peer-connection side regardless.
    if (webRTCAdaptor.localStream) {
        const audioTrack = webRTCAdaptor.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = true;
            console.log('Unmuted local mic');
        }
    }
    try {
        webRTCAdaptor.unmuteLocalMic();
    } catch (e) {
        console.warn('unmuteLocalMic error:', e);
    }
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

        })
        .catch(err => {
            console.error("Error reacquiring camera:", err);
            console.error("Could not access camera. Please check your device permissions.");
        });
    }, 1000); // Increased timeout to ensure previous stream is fully stopped
}

function turnOffCamera() {
    if (!webRTCAdaptor) return;
    
    // // Update media constraints to disable video
    // mediaConstraints.video = false;
    
    // // Get the correct stream ID based on user type
    // let displayName;
    // if (isAuthenticated) {
    //     displayName = formatDisplayName(name);
    // } else if (data.representativeName) {
    //     displayName = formatDisplayName(data.representativeName, true);
    // } else {
    //     displayName = formatDisplayName($anonymousUser);
    // }
    
    // const sanitizedName = sanitizeStreamName(displayName);
    // const streamId = `${publishStreamId}-${sanitizedName}`;
    
    // console.log('Turning off camera for streamId:', streamId);
    

    
    try {
        // 3. Turn off local camera
        webRTCAdaptor.turnOffLocalCamera();
    } catch (turnOffError) {
        console.warn('Error turning off local camera:', turnOffError);
    }
    
    isCameraOff = true;
    
 


    // Broadcast camera off state
    if (webRTCAdaptor && isDataChannelOpen) {
        const cameraStateUpdate = {
            eventType: 'camera_state_update',
            messageBody: JSON.stringify({
                isCameraOff: true,
                fromHost: isHost,
                fromRepresentative: isRepresentative
            })
        };
        
        try {
            sendMessage(
                roomName,
                Date.now(),
                JSON.stringify(cameraStateUpdate),
                roomName
            );
        } catch (error) {
            console.error('Error sending camera state update:', error);
        }
    }

    // // Clear video player source
    // if (videoPlayer) {
    //     videoPlayer.srcObject = null;
    //     videoPlayer.src = '';
    // }
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

function toggleDevLiveMode() {
	const goingLive = !isRepLive;
	isRepLive = goingLive;
	liveCameraMode = goingLive ? 'dual' : null;
	console.log(`[DEV] Simulated live_mode_change: isLive=${isRepLive}, cameraMode=${liveCameraMode}`);

	if (webRTCAdaptor && isDataChannelOpen) {
		try {
			sendMessage(
				roomName,
				Date.now(),
				JSON.stringify({
					eventType: 'live_mode_change',
					messageBody: JSON.stringify({ isLive: goingLive, cameraMode: 'dual' })
				}),
				roomName
			);
		} catch (e) {
			console.error('[DEV] Error sending simulated live_mode_change:', e);
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
        // Ensure host or rep stays playing when they initiate play
        if (isPlaying) {
            // Try to play locally if blocked earlier
            videoPlayer.play().catch(() => {/* ignore */});
        }
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
            const streamInfo = parseStreamId(trackId);
            if (streamInfo.isBackCamera) {
                representativeStreams.back.streamId = null;
                representativeStreams.back.mediaStream = null;
                representativeStreams.back.playing = false;
                representativeStreams.isLive = false;
                dualCameraStreamIds = dualCameraStreamIds.filter((id) => id !== trackId);
                const backEl = document.getElementById('back-camera-video') as HTMLVideoElement;
                if (backEl) backEl.srcObject = null;
            } else if (streamInfo.isFrontCamera) {
                representativeStreams.front.streamId = null;
                representativeStreams.front.mediaStream = null;
                representativeStreams.front.playing = false;
                dualCameraStreamIds = dualCameraStreamIds.filter((id) => id !== trackId);
                const frontEl = document.getElementById('front-camera-video') as HTMLVideoElement;
                if (frontEl) frontEl.srcObject = null;
            }
            delete allParticipants[trackId];
        }
    });

    // Request broadcast object for new tracks
    participantIds.forEach(pid => {
        if (allParticipants[pid] === undefined) {
            webRTCAdaptor.getBroadcastObject(pid);
        }
        // Dual camera: subscribe to existing front/back streams when we first see them
        const streamInfo = parseStreamId(pid);
        if (streamInfo.isBackCamera) {
            representativeStreams.back.streamId = pid;
            representativeStreams.isLive = true;
            representativeStreams.odooRepId = streamInfo.odooRepId;
            if (!dualCameraStreamIds.includes(pid)) dualCameraStreamIds = [...dualCameraStreamIds, pid];
            webRTCAdaptor.play(pid);
        } else if (streamInfo.isFrontCamera) {
            representativeStreams.front.streamId = pid;
            representativeStreams.odooRepId = representativeStreams.odooRepId ?? streamInfo.odooRepId;
            if (!dualCameraStreamIds.includes(pid)) dualCameraStreamIds = [...dualCameraStreamIds, pid];
            webRTCAdaptor.play(pid);
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
        const derivedFromId = (String(broadcastObject.streamId || '').split('-').pop() || '').replace(/_+representative$/i, '').replace(/_/g, ' ').trim();
        let participantName = metadata.displayName || broadcastObject.streamName || derivedFromId || 'Unknown User';
        
        allParticipants[broadcastObject.streamId] = {
            streamId: broadcastObject.streamId,
            // Preserve both for backward compatibility
            streamName: participantName,
            name: participantName,
            // Keep raw metadata string for other consumers
            metaData: broadcastObject.metadata || JSON.stringify(metadata),
            isRepresentative: metadata.isRepresentative ?? /_representative$/i.test(String(metadata.displayName || broadcastObject.streamName || broadcastObject.streamId)),
            isCameraOff: !!metadata.isCameraOff,
            isMicMuted: !!metadata.isMicMuted
        };

        // Update meetingParticipants inline when possible
        const idx = meetingParticipants.findIndex(p => (typeof p === 'string' ? p : p.streamId) === broadcastObject.streamId);
        if (idx !== -1) {
            const base = typeof meetingParticipants[idx] === 'string' ? { streamId: broadcastObject.streamId } : meetingParticipants[idx];
            meetingParticipants = [
                ...meetingParticipants.slice(0, idx),
                {
                    ...base,
                    name: participantName,
                    isRepresentative: allParticipants[broadcastObject.streamId].isRepresentative,
                    isCameraOff: !!metadata.isCameraOff,
                    isMicMuted: !!metadata.isMicMuted
                },
                ...meetingParticipants.slice(idx + 1)
            ];
        }
    } catch (e) {
        console.error('Error handling subtrack broadcast object:', e);
    }
}

function playVideo(obj) {
    const roomId = roomName;
    console.log("new track available with id: " + obj.trackId + " and kind: " + obj.track.kind + " on the room:" + roomId);

    const incomingTrackId = obj.trackId.substring("ARDAMSx".length);
    const streamId = obj.stream.id;
    const streamInfo = parseStreamId(streamId);

    if (incomingTrackId == roomId || incomingTrackId == publishStreamId) {
        return;
    }

    // Dual camera: route front/back video to dedicated elements
    if (obj.track.kind === "video" && (streamInfo.isFrontCamera || streamInfo.isBackCamera)) {
        const slot = streamInfo.isBackCamera ? representativeStreams.back : representativeStreams.front;
        if (!slot.mediaStream) slot.mediaStream = new MediaStream();
        slot.mediaStream.addTrack(obj.track);
        const videoId = streamInfo.isBackCamera ? 'back-camera-video' : 'front-camera-video';
        const videoEl = document.getElementById(videoId) as HTMLVideoElement;
        if (videoEl) {
            videoEl.srcObject = slot.mediaStream;
            slot.playing = true;
            videoEl.play().catch((e) => console.warn('Dual-camera autoplay:', e));
        }
        obj.track.onended = () => {};
        obj.stream.onremovetrack = (event: MediaStreamTrackEvent) => {
            if (slot.mediaStream && event.track) slot.mediaStream.removeTrack(event.track);
        };
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
    
    // Clean up URL parameters to prevent double-encoding
    const searchParams = $page.url.searchParams;
    const cleanParams = new URLSearchParams();
    
    // Carefully transfer parameters
    if (searchParams.get('repid')) {
        cleanParams.set('repid', searchParams.get('repid'));
    }
    if (searchParams.get('uid')) {
        cleanParams.set('uid', searchParams.get('uid'));
    }
    if (searchParams.get('isHost')) {
        cleanParams.set('isHost', searchParams.get('isHost'));
    }
    if (searchParams.get('anonymous')) {
        cleanParams.set('anonymous', searchParams.get('anonymous'));
    }
    if (searchParams.get('hostUserId')) {
        cleanParams.set('hostUserId', searchParams.get('hostUserId'));
    }
    if (searchParams.get('anonymousUserId')) {
        cleanParams.set('anonymousUserId', searchParams.get('anonymousUserId'));
    }
    
    // Update URL if parameters are not clean
    if (cleanParams.toString() !== searchParams.toString()) {
        history.replaceState(
            null, 
            '', 
            `${$page.url.pathname}?${cleanParams.toString()}`
        );
    }
    
    // If anonymous mode is active, prioritize anonymousUserId from URL over authenticated user
    const isAnonymousMode = searchParams.get('anonymous') === 'true';
    const urlAnonymousUserId = searchParams.get('anonymousUserId');
    if (isAnonymousMode && urlAnonymousUserId) {
        // Always update anonymousUser store when in anonymous mode to ensure it matches URL param
        if ($anonymousUser !== urlAnonymousUserId) {
            anonymousUser.set(urlAnonymousUserId);
        }
        // Name will be updated by the reactive declaration above
    }
    
    // If we have a representative name, set it as the anonymous user with proper formatting
    if (data.representativeName && !$anonymousUser && !isAnonymousMode) {
        anonymousUser.set(formatUserName(data.representativeName, true));
        // Initialize WebRTC after setting the name
        if (webRTCAdaptor === null) {
            initializeWebRTC();
        }
    }
    
    // Compute representative self name from server data or cookie
    if (isRepresentative && !data.representativeName) {
        repSelfName = getRepresentativeCookieName();
        // Also update the name for chat purposes if not already set
        if (!name && repSelfName) {
            name = repSelfName;
        }
    } else if (data.representativeName) {
        repSelfName = data.representativeName;
        // Also update the name for chat purposes if not already set
        if (!name) {
            name = data.representativeName;
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
    // Use publishStreamId as a unique session ID to distinguish between users with same name
    const isCurrentUser = isCurrentUserMessage(messageBody.name, name || $anonymousUser, messageBody.senderId, publishStreamId);

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
    // Clear dual-camera state
    representativeStreams.front.streamId = null;
    representativeStreams.front.mediaStream = null;
    representativeStreams.front.playing = false;
    representativeStreams.back.streamId = null;
    representativeStreams.back.mediaStream = null;
    representativeStreams.back.playing = false;
    representativeStreams.isLive = false;
    representativeStreams.odooRepId = null;
    dualCameraStreamIds = [];
    const backEl = document.getElementById('back-camera-video') as HTMLVideoElement;
    const frontEl = document.getElementById('front-camera-video') as HTMLVideoElement;
    if (backEl) backEl.srcObject = null;
    if (frontEl) frontEl.srcObject = null;
}

// Example of how to use the update function
function handleVideoSelect(event) {
    const isCurrentController = (syncSource === 'host' && isHost) || 
                               (syncSource === 'representative' && isRepresentative);

    // Set the selected video from the event detail
    selectedVideo = event.detail;
    
    // Determine the most accurate file type
    const determineFileType = (item) => {
        // Prioritize specific type checks
        const type = (item.type || '').toLowerCase();
        const fileKind = (item.fileKind || '').toLowerCase();
        
        // Explicit type mappings
        const typeMap = {
            'video': 'video',
            'pdf': 'pdf',
            'document': 'docx',
            'image': 'image'
        };

        // Check type first
        if (typeMap[type]) return typeMap[type];
        
        // Check fileKind next
        if (typeMap[fileKind]) return typeMap[fileKind];
        
        // File extension fallback
        const fileName = item.file || '';
        if (fileName.toLowerCase().endsWith('.pdf')) return 'pdf';
        if (fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc')) return 'docx';
        if (fileName.toLowerCase().endsWith('.mp4') || fileName.toLowerCase().endsWith('.avi') || fileName.toLowerCase().endsWith('.mov')) return 'video';
        if (fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.png') || fileName.toLowerCase().endsWith('.jpeg') || fileName.toLowerCase().endsWith('.gif')) return 'image';
        
        // Default fallback
        return 'unknown';
    };

    const fileType = determineFileType(selectedVideo);
    
    // Clear all media stores first
    currentVideoUrl.set('');
    currentPdfUrl.set('');
    currentDocxUrl.set('');
    currentImageUrl.set('');

    // Determine content URL
    const fileUrl = selectedVideo && selectedVideo.file 
        ? `${selectedVideo.file}` 
        : '';

    // Set the appropriate media URL based on file type
    switch (fileType) {
        case 'video':
            currentVideoUrl.set(fileUrl);
            break;
        case 'pdf':
            currentPdfUrl.set(fileUrl);
            break;
        case 'docx':
            currentDocxUrl.set(fileUrl);
            break;
        case 'image':
            currentImageUrl.set(fileUrl);
            break;
        default:
            console.warn('Unknown content type, attempting to play as video:', fileType);
            currentVideoUrl.set(fileUrl);
    }
    
    // Always send update if we're the controller
    if (isCurrentController && webRTCAdaptor && isDataChannelOpen) {
        // Prepare media update message
        const mediaUpdateMessage = {
            eventType: `${fileType}_url_update`,
            messageBody: JSON.stringify({
                fileUrl,
                fromHost: isHost,
                fromRepresentative: isRepresentative,
                shouldPlay: fileType === 'video',
                // Include full item details for comprehensive sync
                fullItem: selectedVideo
            })
        };
        
        try {
            // Broadcast media update
            sendMessage(
                roomName,
                Date.now(),
                JSON.stringify(mediaUpdateMessage),
                roomName
            );

            // Broadcast sync source if needed
            const syncSourceUpdate = {
                eventType: 'sync_source_change',
                messageBody: JSON.stringify({
                    syncSource,
                    fromHost: isHost,
                    fromRepresentative: isRepresentative
                })
            };

            sendMessage(
                roomName,
                Date.now(),
                JSON.stringify(syncSourceUpdate),
                roomName
            );
        } catch (error) {
            console.error('Error sending media update:', error);
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
            currentTime: videoPlayer?.currentTime,
            playVideoStore: $playVideoStore
        });

        // Only set to false on initial load or when video URL changes
        if (!value || !videoPlayer) {
            playVideoStore.set(false);
        }
        
        // If we have a video player and a URL, update it
        if (videoPlayer && value) {
            console.log('Updating video player source');
            videoPlayer.src = value;
            
            // Only play if playVideoStore is true and we're the controller
            const isCurrentController = (syncSource === 'host' && isHost) || 
                                        (syncSource === 'representative' && isRepresentative);
            
            if ($playVideoStore && isCurrentController) {
                console.log('Auto-playing video based on playVideoStore');
                videoPlayer.play().catch(e => console.error('Error playing video:', e));
            } else {
                console.log('Not auto-playing video (playVideoStore is false or not controller)');
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
  if (!data) return { canJoin: true, isPast: false, joinBeforeMinutes: 0, minutesLeft: 0 };
  
  // Extract the scheduled room data from the nested structure
  const scheduledRoom = data.scheduledRoom || data;
  
  // Get schedule time from the correct location
  const scheduleTime = scheduledRoom?.schedule_time || scheduledRoom?.scheduledTime;
  if (!scheduleTime) return { canJoin: true, isPast: false, joinBeforeMinutes: 0, minutesLeft: 0 };
  
  // Make sure we're working with Date objects
  const scheduleDate = scheduleTime instanceof Date ? scheduleTime : new Date(scheduleTime);
  const now = new Date();
  
  // Calculate time difference in milliseconds
  const timeDiff = scheduleDate.getTime() - now.getTime();
  
  // Convert to minutes
  const minutesLeft = Math.floor(timeDiff / 60000);
  
  // If negative, meeting has passed
  const isPast = minutesLeft < 0;
  
  // Get the join_before_minutes from the scheduled room data or default to 0
  const joinBeforeMinutes = Math.max(scheduledRoom?.join_before_minutes ?? 0, 0);
  
  // Can join ONLY if:
  // 1. Meeting is not in the past
  // 2. Current time is within the allowed join window (joinBeforeMinutes)
  // 3. Explicitly check that minutes left is less than or equal to join window
  // 4. Ensure join window is exactly 0 if not specified
  const canJoin = !isPast && 
                  minutesLeft <= joinBeforeMinutes && 
                  minutesLeft >= 0 &&
                  (joinBeforeMinutes > 0 || minutesLeft === 0);
  
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

// Check if we need to redirect
if (data.redirectTo) {

    setTimeout(() => {
        window.location.href = data.redirectTo;
    }, 4000);
}

// Check if this is a scheduled meeting
console.log('Room data on mount:', data);

// Add a reference to the MediaSelector
let mediaSelectorRef;

// Remove previous references
let mediaSelectorComponent;

// Add a function to automatically select first host content
function autoSelectFirstHostContent() {
    console.log('Auto-select first host content called', {
        mediaSelectorComponent: !!mediaSelectorComponent,
        hasGetFirstHostContent: mediaSelectorComponent && typeof mediaSelectorComponent.getFirstHostContent === 'function',
        roomHostContent: room?.host_content,
        roomExpandHostContent: room?.expand?.host_content
    });

    if (mediaSelectorComponent && mediaSelectorComponent.getFirstHostContent) {
        const firstHostContent = mediaSelectorComponent.getFirstHostContent();
        
        console.log('First host content result:', {
            firstHostContent,
            hasContent: !!firstHostContent
        });
        
        if (firstHostContent) {
            console.log('Automatically selecting first host content:', firstHostContent);
            handleVideoSelect({ detail: firstHostContent });
        } else {
            console.warn('No first host content found to auto-select');
        }
    }
}

// Add a function to force media selection if no media is selected
function ensureMediaSelection() {
    // Remove verbose logging
    if (!$currentVideoUrl && !$currentPdfUrl && !$currentDocxUrl && !$currentImageUrl) {
        // Attempt to select first available content
        if (mediaSelectorComponent && mediaSelectorComponent.getFirstHostContent) {
            const firstHostContent = mediaSelectorComponent.getFirstHostContent();
            
            if (firstHostContent) {
                handleVideoSelect({ detail: firstHostContent });
            } else {
                // Fallback: try to select first available content from room
                const allContent = [
                    ...(room?.expand?.host_content || []),
                    ...(room?.expand?.representative_content || [])
                ];
                
                if (allContent.length > 0) {
                    const firstContent = normalizeContent(allContent)[0];
                    handleVideoSelect({ detail: firstContent });
                }
            }
        }
    }
}

// Modify the onMount to include media selection fallback
onMount(() => {
    // Single delayed attempt to ensure media selection
    setTimeout(() => {
        if (!selectedVideo) {
            autoSelectFirstHostContent();
            ensureMediaSelection();
        }
    }, 2000);
});

onDestroy(() => {
    if (cleanupPermissionListeners) {
        cleanupPermissionListeners();
        cleanupPermissionListeners = null;
    }
});

// Track the currently selected video
let selectedVideo = null;

</script>


{#if isScheduledMeeting && !meetingStatus.canJoin}
  <div class="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-2xl max-w-md w-full p-8 text-center">
      <h2 class="text-2xl font-bold mb-6 text-red-600">Meeting Not Available</h2>
      
      <div class="mb-6">
        <p class="text-lg mb-4">This meeting is scheduled for:</p>
        <p class="text-xl font-semibold text-gray-800">
          {scheduledMeetingTime.toLocaleString()}
        </p>
      </div>
      
      {#if meetingStatus.isPast}
        <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p class="text-red-800">
            This meeting has already taken place and is no longer available.
          </p>
        </div>
      {:else}
        <div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p class="text-yellow-800">
            {#if meetingStatus.joinBeforeMinutes === 0}
              You can only join this meeting at the exact scheduled time.
            {:else}
              You can join this meeting {meetingStatus.joinBeforeMinutes} minute{meetingStatus.joinBeforeMinutes !== 1 ? 's' : ''} before the scheduled start time.
            {/if}
          </p>
        </div>
        
        <div class="mb-6">
          <p class="text-sm text-gray-500">Time remaining:</p>
          <p class="text-2xl font-bold text-gray-800">
            {calculateTimeRemaining(scheduledMeetingTime)}
          </p>
        </div>
      {/if}
      
      <button 
        class="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        on:click={() => {
          // Redirect to home page
          window.location.href = '/';
        }}
      >
        Return to Home
      </button>
    </div>
  </div>
{/if}

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
      {/if}
      
      <button 
        class="w-full py-2 bg-primary text-white rounded-md hover:bg-primary/80"
        on:click={() => window.location.href = '/'}
      >
        Return to Home
      </button>
    </div>
  </div>
{:else if !isAuthenticated && (!$anonymousUser || $anonymousUser === '') && !data?.representativeName && !isRepresentative}
  <NameInputModal on:nameSubmitted={handleNameSubmitted} roomName={room?.title} />
{:else}
    <!-- Always render meeting room in the background -->
    <div class="h-screen min-w-full bg-bgdefault relative overflow-hidden">
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
                        room={room}
                        on:closeSchedule={handleScheduleClose} 
                    />
                </div>
                
                <!-- Main content area -->
                <div class="flex-grow h-[70vh] md:h-full bg-bgdefault relative flex px-2">
                    <div class="video-container bg-red h-full w-full relative">
                        <!-- Rep stream: full-screen when GO LIVE (data channel), else back+front when dual streams -->
                        <div
                            id="back-camera-container"
                            class="dual-camera-back-container"
                            class:live-fullscreen={isRepLive}
                            class:hidden={!isRepLive && !representativeStreams.isLive}
                        >
                            {#if isRepLive && liveRepStreamId && !representativeStreams.back.streamId}
                                <!-- Live mode using rep's regular stream (no _back stream available) -->
                                <iframe
                                    title="Representative live stream"
                                    src="https://{PUBLIC_ANT_MEDIA_URL}/WebRTCAppEE/play.html?id={encodeURIComponent(liveRepStreamId)}&playOrder=webrtc"
                                    class="dual-camera-back-video"
                                    style="border:none;width:100%;height:100%;position:absolute;inset:0"
                                    allowfullscreen
                                ></iframe>
                            {:else}
                                <video id="back-camera-video" autoplay playsinline class="dual-camera-back-video"></video>
                            {/if}
                            {#if isRepLive}
                                <div class="live-badge">
                                    <span class="live-badge-dot"></span>
                                    <span>LIVE</span>
                                </div>
                            {:else if representativeStreams.isLive}
                                <div class="dual-camera-live-indicator">
                                    <span class="dual-camera-live-dot"></span>
                                    <span>LIVE</span>
                                </div>
                                <div class="dual-camera-label">Back Camera</div>
                            {/if}
                            {#if dev}
                                <div class="dev-stream-overlay">
                                    <div class="dev-stream-overlay-title">DEV Stream Debug</div>
                                    <div>isRepLive: <strong>{isRepLive}</strong></div>
                                    <div>liveCameraMode: <strong>{liveCameraMode ?? 'null'}</strong></div>
                                    <div>liveRepStreamId: <strong>{liveRepStreamId ?? 'none'}</strong></div>
                                    <div>liveRepName: <strong>{liveRepName}</strong></div>
                                    <div>back stream: <strong>{representativeStreams.back.streamId ?? 'none'}</strong> {representativeStreams.back.playing ? '▶' : '⏸'}</div>
                                    <div>front stream: <strong>{representativeStreams.front.streamId ?? 'none'}</strong> {representativeStreams.front.playing ? '▶' : '⏸'}</div>
                                    <div>indicator mode: <strong>{isRepLive && representativeStreams.front.streamId ? 'front-cam only' : 'normal'}</strong></div>
                                    <div>dualCameraStreamIds: <strong>{dualCameraStreamIds.length ? dualCameraStreamIds.join(', ') : 'none'}</strong></div>
                                    <div class="dev-stream-overlay-title" style="margin-top:4px">Participants ({meetingParticipants.length})</div>
                                    {#each meetingParticipants as p}
                                        {@const sid = typeof p === 'string' ? p : p.streamId}
                                        {@const pname = typeof p === 'string' ? p.split('-').pop() : p.name}
                                        {@const isRep = typeof p === 'string' ? /_representative$/i.test(p.split('-').pop() || '') : p.isRepresentative}
                                        <div style="font-size:10px;opacity:0.85">{isRep ? '🎥' : '👤'} {pname} <span style="opacity:0.5">({sid})</span></div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                        <!-- Front camera (selfie) only in rep indicator, not as overlay here -->
                        <div
                            id="front-camera-container"
                            class="dual-camera-front-pip hidden"
                            aria-hidden="true"
                        >
                            <video id="front-camera-video" autoplay playsinline class="dual-camera-front-video"></video>
                            <div class="dual-camera-label">Rep</div>
                        </div>
                        <RepresentativeIndicator 
                            participants={indicatorParticipants}
                            selfName={repSelfName}
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
                                {#if dev}
                                    <Button
                                        variant={isRepLive ? 'destructive' : 'secondary'}
                                        size="sm"
                                        on:click={toggleDevLiveMode}
                                    >
                                        {isRepLive ? '⏹ Stop Live' : '🔴 Sim Go Live'}
                                    </Button>
                                {/if}
                            </div>
                        {/if}
                        
                        <!-- Main content (hidden when rep is LIVE or dual-camera back is showing) -->
                        <div class="dual-camera-content-wrap" class:hidden={isRepLive || representativeStreams.isLive}>
                        {#if $currentVideoUrl}
                            {#if (syncSource === 'host' && isHost) || (syncSource === 'representative' && isRepresentative)}
                            {console.log("playvideo store", $playVideoStore)}
                            {#if !$playVideoStore}
                            <div class="h-full w-full absolute inset-0 z-40">
                                {#if selectedVideo && selectedVideo.thumbnail}
                                    <img 
                                        src={`/api/files/${selectedVideo.collectionId || selectedVideo.collection || 'content_library'}/${selectedVideo.id}/${selectedVideo.thumbnail}`} 
                                        alt={selectedVideo.title} 
                                        class="absolute w-full h-full object-cover"
                                    >
                                {:else}
                                    <img src="https://placehold.co/600x400?text=No+Thumbnail" alt="" class="absolute w-full h-full object-cover">
                                {/if}
                                <div class="play-button absolute inset-0 flex items-center justify-center">
                                    <button on:click={() => videoPlayer.play()}>
                                       <img src="/icons/play.svg" alt="" class="h-28 w-28 object-cover hover:scale-110 transition-all duration-300">
                                    </button>
                                </div>
                            </div>
                            {/if}
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
                                    preload="metadata"
                                    crossorigin="anonymous"
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
                                    preload="metadata"
                                    crossorigin="anonymous"
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
                            <div class="h-full">
                                <Chat roomId={roomName} name={name} userId={publishStreamId} />
                            </div>
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
                            <Participants 
                                participants={meetingParticipants} 
                                isHost={isHost} 
                                name={name} 
                                users={users} 
                                shareURL={shareURL} 
                                localStreamId={publishStreamId}
                            />
                        </div>
                    </div>
                </div>

                <!-- Right sidebar controls -->
                <div class="hidden lg:flex h-full">
                    <RightBar 
                        participants={meetingParticipants} 
                        {isHost} 
                        {name} 
                        {shareURL} 
                        roomId={roomName}
                        {users}
                        userId={publishStreamId}
                        isChatOpen={chatPanelOpen}
                        isParticipantsOpen={participantsPanelOpen}
                        participantCount={selfIncludedParticipantCount}
                        on:togglePanel={handlePanelToggle}
                    />
                </div>
            </div>

            <!-- Mobile Bottom Bar -->
            <MobileBottomBar 
                roomIdentityName={room?.title || 'Meeting Room'}
                videoRepresentatives={representatives}
                scheduleOpen={scheduleOpen}
                userId={user?.id || ''}
                joinURL={shareURL}
                {isMicMuted}
                {isCameraOff}
                {isHost}
                {isRepresentative}
                {room}
                roomName={roomName}
                roomId={roomName}
                chatUserId={publishStreamId}
                chatName={name}
                hostContentItems={room?.expand?.host_content || []}
                repContentItems={room?.expand?.representative_content || []}
                participants={meetingParticipants}
                {micPermission}
                {cameraPermission}
                on:leaveRoom={leaveRoom}
                on:toggleMicrophone={toggleMicrophone}
                on:toggleCamera={toggleCamera}
                on:togglePanel={handlePanelToggle}
                on:videoSelect={handleVideoSelect}
                on:requestMicPermission={requestMicPermission}
                on:requestCameraPermission={requestCameraPermission}
            />

            <MobileTopBar
            roomIdentityName={room?.title || 'Meeting Room'}
            roomLink={shareURL}
            />

            <!-- MediaSelector -->
  
            {#if (isHost || isRepresentative)}
                <div class="hidden h-72 lg:block">
                    <MediaSelector 
                        {isHost} 
                        {isRepresentative} 
                        {room} 
                        {roomName}
                        on:videoSelect={handleVideoSelect}
                        hostContentItems={room?.expand?.host_content || []}
                        repContentItems={room?.expand?.representative_content || []}
                        bind:this={mediaSelectorComponent}
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
                        {micPermission}
                        {cameraPermission}
                        on:requestMicPermission={requestMicPermission}
                        on:requestCameraPermission={requestCameraPermission}
                    />
            </div>
        </div>
    </div>

    <!-- Modal overlay for name input -->
    {#if !isAuthenticated && (!$anonymousUser || $anonymousUser === '') && !data?.representativeName && !isRepresentative}
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
    background: #000;
}

.video-container video {
    position: absolute;
}

/* Dual camera: back camera full screen during LIVE */
.dual-camera-back-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
}
.dual-camera-back-container.hidden {
    display: none;
}
/* Live mode (data channel): composited rep stream full-screen */
.dual-camera-back-container.live-fullscreen {
    position: absolute;
    width: 100%;
    height: 100%;
    background: #000;
}
.dual-camera-back-container.live-fullscreen .dual-camera-back-video {
    object-fit: contain;
}
.dev-stream-overlay {
    position: absolute;
    bottom: 12px;
    left: 12px;
    z-index: 60;
    background: rgba(0, 0, 0, 0.8);
    color: #0f0;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 11px;
    line-height: 1.5;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid rgba(0, 255, 0, 0.2);
    max-width: 420px;
    max-height: 50%;
    overflow-y: auto;
    pointer-events: none;
}
.dev-stream-overlay-title {
    font-weight: bold;
    color: #0ff;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.live-badge {
    position: absolute;
    top: 16px;
    left: 16px;
    background: #e53e3e;
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 6px;
    z-index: 30;
}
.live-badge-dot {
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 50%;
    animation: live-badge-pulse 1.5s ease-in-out infinite;
}
@keyframes live-badge-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
}
.dual-camera-back-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
/* Dual camera: front PIP */
.dual-camera-front-pip {
    position: absolute;
    top: 20px;
    left: 20px;
    width: 180px;
    height: 240px;
    border-radius: 12px;
    overflow: hidden;
    border: 3px solid #fff;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 20;
}
.dual-camera-front-pip.hidden {
    display: none;
}
.dual-camera-front-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.dual-camera-label {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
}
.dual-camera-live-indicator {
    position: absolute;
    top: 16px;
    left: 16px;
    background: #ef4444;
    color: #fff;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: bold;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 30;
}
.dual-camera-live-dot {
    width: 8px;
    height: 8px;
    background: #fff;
    border-radius: 50%;
    animation: dual-camera-pulse 1s infinite;
}
@keyframes dual-camera-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}
.dual-camera-content-wrap {
    position: absolute;
    inset: 0;
    z-index: 5;
}
.dual-camera-content-wrap.hidden {
    display: none;
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

