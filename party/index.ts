import type * as Party from 'partykit/server';

/**
 * PartyKit server for demo-stream sync.
 *
 * Responsibilities:
 * - Broadcast all sync messages to every peer in the room (excluding the sender).
 * - Maintain a snapshot of the latest value for each stateful message type so
 *   that late joiners receive the current room state immediately on connect
 *   (eliminating the media_state_request / media_state_response round-trip).
 */
export default class SyncParty implements Party.Server {
	/**
	 * Snapshot of the most-recent value for each stateful message type.
	 * Stored as raw JSON strings so we can forward them without re-serialising.
	 */
	private roomState: Record<string, string> = {};

	/** Message types whose latest value is worth persisting for late joiners. */
	private static readonly STATE_TYPES = new Set([
		'video_sync',
		'video_url_update',
		'pdf_scroll_sync',
		'pdf_zoom_sync',
		'docx_scroll_sync',
		'docx_zoom_sync',
		'image_zoom_sync',
		'sync_source_change',
		'live_mode_change',
		'media_state_response'
	]);

	constructor(readonly room: Party.Room) {}

	/** Called when a new client connects. Send them the current room state. */
	onConnect(conn: Party.Connection) {
		const stateEntries = Object.values(this.roomState);
		if (stateEntries.length === 0) return;

		// Send each persisted state message individually so the client can parse
		// them one by one with the same handler used for live messages.
		for (const json of stateEntries) {
			conn.send(json);
		}
	}

	/** Called when a client sends a message. */
	onMessage(message: string | ArrayBuffer, sender: Party.Connection) {
		if (typeof message !== 'string') return;

		try {
			const msg = JSON.parse(message) as { type?: string };
			if (typeof msg.type === 'string' && SyncParty.STATE_TYPES.has(msg.type)) {
				this.roomState[msg.type] = message;
			}
		} catch {
			// Ignore malformed messages – still broadcast them below.
		}

		// Broadcast to all peers except the sender.
		this.room.broadcast(message, [sender.id]);
	}
}
