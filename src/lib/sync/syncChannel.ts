/**
 * syncChannel — unified sync transport for demo-stream.
 *
 * Priority order:
 *   1. PartyKit WebSocket (primary) — reliable, edge-deployed, supports late-joiner state
 *   2. WebRTC data channel (fallback) — registered by +page.svelte when the data channel opens
 *
 * All messages use a flat, single-level JSON structure (Priority 2):
 *   { type: string, sendTimestamp: number, ...payload }
 *
 * Usage:
 *   import { initSync, send, onMessage, closeSync, registerWebRTCSend } from '$lib/sync/syncChannel';
 *
 *   // In +page.svelte onMount:
 *   initSync(roomId);
 *
 *   // When data_channel_opened fires:
 *   registerWebRTCSend(streamId, (sid, data) => webRTCAdaptor.sendData(sid, data));
 *
 *   // Sending:
 *   send({ type: 'video_sync', currentTime: 10.5, isPlaying: true });
 *
 *   // Receiving (called for BOTH PartyKit and WebRTC messages):
 *   const unsub = onMessage((msg) => { ... });
 *   onDestroy(unsub);
 */

import PartySocket from 'partysocket';
import { browser } from '$app/environment';

// PUBLIC_PARTYKIT_HOST is optional — if not set, the WebSocket will fall back to
// the WebRTC data channel.  We import lazily via a function to avoid a build-time
// error when the env var is absent.
function getPartyKitHost(): string {
	try {
		// @ts-ignore — may not be defined at build time
		return import.meta.env.VITE_PARTYKIT_HOST || import.meta.env.PUBLIC_PARTYKIT_HOST || '';
	} catch {
		return '';
	}
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SyncMessage {
	type: string;
	sendTimestamp: number;
	[key: string]: unknown;
}

type MessageHandler = (msg: SyncMessage) => void;
type UnsubscribeFn = () => void;

// ── Module state ──────────────────────────────────────────────────────────────

let _socket: PartySocket | null = null;
let _streamId: string | null = null;
let _sendDataFn: ((streamId: string, data: string) => void) | null = null;
let _handlers: MessageHandler[] = [];
/** Messages queued before the PartyKit socket opens. */
let _queue: string[] = [];

// ── Internal helpers ──────────────────────────────────────────────────────────

function dispatchToHandlers(msg: SyncMessage) {
	for (const h of _handlers) {
		try {
			h(msg);
		} catch (e) {
			console.error('[syncChannel] handler error', e);
		}
	}
}

function flushQueue() {
	const pending = _queue;
	_queue = [];
	for (const json of pending) {
		_socket?.send(json);
	}
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initialise the PartyKit connection for a given room.
 * Safe to call multiple times — will close the previous connection first.
 */
export function initSync(roomId: string): void {
	if (!browser) return;

	// Close any existing socket for a previous room.
	closeSync();

	const host = getPartyKitHost() || 'localhost:1999';

	_socket = new PartySocket({ host, room: roomId });

	_socket.addEventListener('open', () => {
		flushQueue();
	});

	_socket.addEventListener('message', (event: MessageEvent) => {
		try {
			const msg = JSON.parse(event.data) as SyncMessage;
			dispatchToHandlers(msg);
		} catch {
			// Ignore malformed messages.
		}
	});

	_socket.addEventListener('error', (e) => {
		console.warn('[syncChannel] PartyKit socket error', e);
	});
}

/**
 * Register the WebRTC sendData function as a fallback transport.
 * Call this from +page.svelte when the data_channel_opened event fires.
 */
export function registerWebRTCSend(
	streamId: string,
	sendFn: (sid: string, data: string) => void
): void {
	_streamId = streamId;
	_sendDataFn = sendFn;
}

/**
 * Send a sync message to all peers in the room.
 * Adds `sendTimestamp` automatically.
 * Tries PartyKit first; falls back to the WebRTC data channel.
 */
export function send(payload: Omit<SyncMessage, 'sendTimestamp'>): void {
	const msg: SyncMessage = { ...payload, sendTimestamp: Date.now() } as SyncMessage;
	const json = JSON.stringify(msg);

	// Primary: PartyKit WebSocket
	if (_socket) {
		if (_socket.readyState === WebSocket.OPEN) {
			_socket.send(json);
			return;
		} else if (_socket.readyState === WebSocket.CONNECTING) {
			// Socket is still connecting — queue for when it opens.
			_queue.push(json);
			return;
		}
	}

	// Fallback: WebRTC data channel (direct, no HTTP round-trip)
	if (_sendDataFn && _streamId) {
		try {
			_sendDataFn(_streamId, json);
			return;
		} catch (e) {
			console.warn('[syncChannel] WebRTC sendData failed, message dropped', e);
		}
	}

	// Last resort: queue for next open socket
	_queue.push(json);
}

/**
 * Register a handler for incoming sync messages.
 * The handler is called for messages received from BOTH PartyKit and WebRTC.
 * Returns an unsubscribe function — call it in onDestroy.
 */
export function onMessage(handler: MessageHandler): UnsubscribeFn {
	_handlers = [..._handlers, handler];
	return () => {
		_handlers = _handlers.filter((h) => h !== handler);
	};
}

/**
 * Dispatch a message that was received via the WebRTC data channel so it goes
 * through the same handler pipeline as PartyKit messages.
 * Call this from the "data_received" case in +page.svelte.
 */
export function receiveWebRTCMessage(raw: string): void {
	try {
		const msg = JSON.parse(raw) as SyncMessage;
		if (msg.type) {
			dispatchToHandlers(msg);
		}
	} catch {
		// Ignore malformed messages.
	}
}

/**
 * Close the PartyKit connection and reset module state.
 * Call this in onDestroy.
 */
export function closeSync(): void {
	_socket?.close();
	_socket = null;
	_streamId = null;
	_sendDataFn = null;
	_queue = [];
}
