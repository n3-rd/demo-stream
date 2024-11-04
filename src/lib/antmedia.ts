import { WebRTCAdaptor } from "@antmedia/webrtc_adaptor";

export interface Participant {
    streamId: string;
    name?: string;
    videoElement?: HTMLVideoElement;
}

export interface RoomCallbacks {
    onParticipantJoined?: (participant: Participant) => void;
    onParticipantLeft?: (streamId: string) => void;
    onLocalStream?: (stream: MediaStream) => void;
    onError?: (error: any, message: string) => void;
    onSuccess?: (message: string) => void;
}

export class AntMediaService {
    private webRTCAdaptor: WebRTCAdaptor | null = null;
    private participants: Map<string, Participant> = new Map();
    private callbacks: RoomCallbacks = {};
    private roomId?: string;
    private localStream: MediaStream | null = null;
    private isInitialized = false;
    private isPublishing = false;
    private currentStreamId: string | null = null;
    private isPublished = false;

    initialize(websocketUrl: string, localVideoId: string, callbacks?: RoomCallbacks) {
        this.callbacks = callbacks || {};

        // Force WSS protocol
        const host = websocketUrl.replace(/^(wss?:\/\/|https?:\/\/)/, '');
        const wsUrl = `ws://${host}/WebRTCAppEE/websocket`;

        console.log('Forcing WS connection to:', wsUrl);

        const connectionOptions = {
            websocket_url: wsUrl,
            mediaConstraints: {
                video: false,
                audio: true,
            },
            peerconnection_config: {
                'iceServers': [
                    { 'urls': 'stun:stun1.l.google.com:19302' },
                    { 'urls': 'stun:stun.l.google.com:19302' }
                ]
            },
            sdp_constraints: {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: false,
            },
            localVideoId,
            bandwidth: 900,
            dataChannelEnabled: true,
            callback: (info, obj) => this.handleCallback(info, obj),
            callbackError: (error, message) => this.handleError(error, message),
            debug: true,
            websocket_connection_timeout: 20000,
            websocket_ping_pong_interval: 5000,
            websocket_ping_pong_timeout: 2000
        };

        try {
            this.webRTCAdaptor = new WebRTCAdaptor(connectionOptions);

            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    if (this.webRTCAdaptor) {
                        this.webRTCAdaptor.closeWebSocket();
                        this.webRTCAdaptor = null;
                    }
                    reject(new Error('WebSocket connection timeout'));
                }, 20000);

                const checkConnection = () => {
                    if (this.webRTCAdaptor && this.isInitialized) {
                        clearTimeout(timeout);
                        resolve(true);
                    } else if (!this.webRTCAdaptor) {
                        clearTimeout(timeout);
                        reject(new Error('WebRTCAdaptor initialization failed'));
                    } else {
                        setTimeout(checkConnection, 100);
                    }
                };

                setTimeout(checkConnection, 100);
            });
        } catch (error) {
            console.error('Failed to initialize WebRTCAdaptor:', error);
            throw new Error(`WebRTCAdaptor initialization failed: ${error.message}`);
        }
    }

    private handleCallback(info: string, obj: any) {
        switch (info) {
            case "initialized":
                console.log("WebRTC adaptor initialized");
                this.isInitialized = true;
                setTimeout(() => {
                    this.callbacks.onSuccess?.("Successfully connected to media server");
                }, 1000);
                break;

            case "publish_started":
                console.log("Stream publishing started");
                this.isPublishing = true;
                this.isPublished = true;
                this.callbacks.onSuccess?.("Your stream has started");
                break;

            case "publish_finished":
                console.log("Stream publishing finished");
                this.isPublishing = false;
                this.isPublished = false;
                this.currentStreamId = null;
                this.callbacks.onSuccess?.("Stream ended");
                break;

            case "streamJoined":
                console.log("Stream joined event:", obj);
                if (obj.streamId) {
                    const participant: Participant = {
                        streamId: obj.streamId,
                        name: obj.streamName || 'Unknown User'
                    };
                    this.handleNewParticipant(participant);
                }
                break;

            case "roomInformation":
                console.log("Room information received:", obj);
                if (obj.streams) {
                    obj.streams.forEach((stream: any) => {
                        if (!this.participants.has(stream.streamId)) {
                            const participant: Participant = {
                                streamId: stream.streamId,
                                name: stream.streamName || 'Unknown User'
                            };
                            this.handleNewParticipant(participant);
                        }
                    });
                }
                break;

            case "newStreamAvailable":
                this.handleNewStream(obj);
                break;

            case "localStream":
                this.localStream = obj;
                this.callbacks.onLocalStream?.(obj);
                this.callbacks.onSuccess?.("Your camera and microphone are connected");
                break;

            case "iceCandidateError":
                console.warn("ICE Candidate Error:", obj);
                if (this.webRTCAdaptor && this.roomId && this.currentStreamId) {
                    this.webRTCAdaptor.reconnect();
                }
                break;
        }
    }

    private handleError(error: any, message: string | Event) {
        console.error("WebRTC Error:", error, message);

        // Handle the already_publishing error silently
        if (error?.definition === 'already_publishing') {
            if (error.streamId === this.currentStreamId) {
                console.log('Stream is already publishing, continuing...');
                this.isPublishing = true;
                this.callbacks.onSuccess?.("You are already streaming");
                return;
            }
        }

        // Handle noStreamNameSpecified error
        if (error?.definition === 'noStreamNameSpecified') {
            console.log('Stream name specification error - attempting to republish');
            if (this.currentStreamId && this.roomId) {
                const streamName = this.currentStreamId.split('_')[1] || 'default_user';
                this.webRTCAdaptor?.publish(
                    this.currentStreamId,
                    null,
                    null,
                    null,
                    streamName,
                    this.roomId
                );
                return;
            }
        }

        if (error instanceof Event && error.type === 'error' && error.target instanceof WebSocket) {
            const ws = error.target;
            console.error(`WebSocket Error - ReadyState: ${ws.readyState}, URL: ${ws.url}`);

            if (ws.url.startsWith('wss://') && location.protocol === 'http:') {
                this.callbacks.onError?.(error, 'Mixed content: Please use HTTPS for secure WebSocket connections');
                return;
            }

            switch (ws.readyState) {
                case WebSocket.CONNECTING:
                    this.callbacks.onError?.(error, 'Connection to media server is still pending');
                    break;
                case WebSocket.CLOSED:
                    this.callbacks.onError?.(error, 'Connection to media server failed. Please check your internet connection');
                    break;
                default:
                    this.callbacks.onError?.(error, 'WebSocket connection error');
            }
            return;
        }

        let userMessage = typeof message === 'string' ? message : 'Connection error';
        if (typeof message === 'string' && message.includes('WebSocketNotConnected')) {
            userMessage = 'Unable to connect to the media server. Please check your connection and try again.';
        }

        this.callbacks.onError?.(error, userMessage);
    }

    private handleNewParticipant(participant: Participant) {
        this.participants.set(participant.streamId, participant);
        this.callbacks.onParticipantJoined?.(participant);
    }

    private handleParticipantLeft(streamId: string) {
        this.participants.delete(streamId);
        this.callbacks.onParticipantLeft?.(streamId);
    }

    private handleNewStream(obj: { stream: MediaStream, streamId: string }) {
        const participant = this.participants.get(obj.streamId);
        if (participant) {
            participant.videoElement = document.createElement('video');
            participant.videoElement.srcObject = obj.stream;
            participant.videoElement.autoplay = true;
            this.participants.set(obj.streamId, participant);
        }
    }

    async createRoom(roomId: string, userName: string) {
        if (!this.webRTCAdaptor) {
            throw new Error('WebRTCAdaptor not initialized. Call initialize() first.');
        }

        this.roomId = roomId;
        const streamId = this.roomId

        try {
            const randomName = Math.random().toString(36).substring(2, 15);
            console.log('Creating room with streamId:', streamId, 'and streamName:', randomName);
            if (!this.isPublishing) {
                await this.webRTCAdaptor.publish(streamId, null, null, null, randomName, roomId);
                console.log('created stream', streamId);
            } else {
                console.log('already publishing', streamId);
            }

            return streamId;
        } catch (error) {
            throw new Error(`Failed to create room: ${error}`);
        }
    }

    async joinRoom(roomId: string, userName: string) {
        if (!this.webRTCAdaptor) {
            throw new Error('WebRTCAdaptor not initialized. Call initialize() first.');
        }

        this.webRTCAdaptor.publish
        // receive sync
        this.webRTCAdaptor.webSocketAdaptor. = (event) => {
            console.log('received sync', event.data);
        }


        this.roomId = roomId;
        const streamId = roomId;
        const streamName = userName;
        this.currentStreamId = streamId;

        try {
            console.log('Joining room with streamId:', streamId, 'and streamName:', streamName);

            await new Promise(resolve => setTimeout(resolve, 2000));
            this.webRTCAdaptor.play(streamId);
            console.log('joined room', streamId);

            await new Promise(resolve => setTimeout(resolve, 2000));

            return streamId;
        } catch (error) {
            this.isPublishing = false;
            this.currentStreamId = null;
            console.error('Error joining room:', error);
            throw error;
        }
    }

    getParticipants(): Participant[] {
        return Array.from(this.participants.values());
    }

    leaveRoom() {
        if (!this.webRTCAdaptor || !this.roomId) {
            return;
        }

        this.webRTCAdaptor.leaveFromRoom(this.roomId);
        this.participants.clear();
        this.roomId = undefined;
        this.isPublishing = false;
        this.isPublished = false;
        this.currentStreamId = null;
    }

    disconnect() {
        if (this.webRTCAdaptor) {
            this.leaveRoom();
            this.webRTCAdaptor.closeWebSocket();
            this.webRTCAdaptor = null;
            this.isPublishing = false;
            this.currentStreamId = null;
        }
    }

    getLocalStream(): MediaStream | null {
        return this.localStream;
    }
}

export const antMediaService = new AntMediaService();