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

    initialize(websocketUrl: string, localVideoId: string, callbacks?: RoomCallbacks) {
        this.callbacks = callbacks || {};

        // Force WSS protocol
        const host = websocketUrl.replace(/^(wss?:\/\/|https?:\/\/)/, '');
        const wsUrl = `wss://${host}/WebRTCAppEE/websocket`;

        console.log('Forcing WSS connection to:', wsUrl);

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
                this.callbacks.onSuccess?.("Successfully connected to media server");
                break;

            case "publish_started":
                console.log("Stream publishing started");
                this.callbacks.onSuccess?.("Your stream has started");
                break;

            case "publish_finished":
                console.log("Stream publishing finished");
                this.callbacks.onSuccess?.("Stream ended");
                break;

            case "streamJoined":
                this.handleNewParticipant(obj);
                this.callbacks.onSuccess?.(`${obj.name || 'A new participant'} joined the room`);
                break;

            case "streamLeaved":
                this.handleParticipantLeft(obj.streamId);
                this.callbacks.onSuccess?.(`${obj.name || 'A participant'} left the room`);
                break;

            case "newStreamAvailable":
                this.handleNewStream(obj);
                break;

            case "localStream":
                this.localStream = obj;
                this.callbacks.onLocalStream?.(obj);
                this.callbacks.onSuccess?.("Your camera and microphone are connected");
                break;
        }
    }

    private handleError(error: any, message: string | Event) {
        console.error("WebRTC Error:", error, message);

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
        const streamId = `${roomId}_${userName}_${Date.now()}`;

        try {
            await this.webRTCAdaptor.publish(streamId);
            return streamId;
        } catch (error) {
            throw new Error(`Failed to create room: ${error}`);
        }
    }

    async joinRoom(roomId: string, userName: string) {
        if (!this.webRTCAdaptor) {
            throw new Error('WebRTCAdaptor not initialized. Call initialize() first.');
        }

        // Clean and format the room ID and stream ID
        this.roomId = roomId.replace(/[^a-zA-Z0-9]/g, '_');
        const streamId = `${this.roomId}_${userName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

        try {
            // Join the room first
            await new Promise<void>((resolve, reject) => {
                this.webRTCAdaptor!.joinRoom(this.roomId!, streamId, resolve);
            });

            // Then publish the stream
            await this.webRTCAdaptor.publish(streamId);

            // Get room info and play other streams
            const roomInfo = await new Promise<{ streams?: string[] }>((resolve) => {
                this.webRTCAdaptor!.getRoomInfo(this.roomId!, resolve);
            });

            if (roomInfo.streams) {
                roomInfo.streams.forEach((otherStreamId: string) => {
                    if (otherStreamId !== streamId) {
                        this.webRTCAdaptor?.play(otherStreamId);
                    }
                });
            }

            return streamId;
        } catch (error) {
            throw new Error(`Failed to join room: ${error}`);
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
    }

    disconnect() {
        if (this.webRTCAdaptor) {
            this.leaveRoom();
            this.webRTCAdaptor.closeWebSocket();
            this.webRTCAdaptor = null;
        }
    }

    getLocalStream(): MediaStream | null {
        return this.localStream;
    }
}

export const antMediaService = new AntMediaService();