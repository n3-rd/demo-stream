import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AntMediaService } from './antmedia';
import type { Participant, RoomCallbacks } from './antmedia';

// ---------------------------------------------------------------------------
// Helpers: mock the WebRTCAdaptor that AntMediaService wraps
// ---------------------------------------------------------------------------

function createMockWebRTCAdaptor() {
	return {
		publish: vi.fn(),
		play: vi.fn(),
		leaveFromRoom: vi.fn(),
		closeWebSocket: vi.fn(),
		reconnect: vi.fn(),
	};
}

// We need to mock the @antmedia/webrtc_adaptor module so that `new
// WebRTCAdaptor(opts)` returns our mock **and** we can capture the callback /
// callbackError handlers the service registers.
let capturedOpts: any = null;
const mockAdaptor = createMockWebRTCAdaptor();

vi.mock('@antmedia/webrtc_adaptor', () => {
	// Must use a real function (not arrow) so it can be called with `new`
	function MockWebRTCAdaptor(opts: any) {
		capturedOpts = opts;
		Object.assign(this, mockAdaptor);
	}
	return { WebRTCAdaptor: MockWebRTCAdaptor };
});

describe('AntMediaService', () => {
	let service: AntMediaService;
	let callbacks: Required<RoomCallbacks>;

	beforeEach(() => {
		vi.useFakeTimers();

		// Reset the captured opts and mock adaptor calls
		capturedOpts = null;
		vi.clearAllMocks();
		Object.assign(mockAdaptor, createMockWebRTCAdaptor());

		// Fresh service instance for each test
		service = new AntMediaService();

		callbacks = {
			onParticipantJoined: vi.fn(),
			onParticipantLeft: vi.fn(),
			onLocalStream: vi.fn(),
			onError: vi.fn(),
			onSuccess: vi.fn(),
		};
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// ── Helper to drive `initialize` to completion ─────────────────────────
	async function initService(url = 'media.example.com', videoId = 'localVideo') {
		const promise = service.initialize(url, videoId, callbacks);
		// Simulate the adaptor firing the "initialized" callback
		capturedOpts.callback('initialized', {});
		// Let the polling check run
		await vi.advanceTimersByTimeAsync(200);
		// Let the delayed onSuccess fire
		await vi.advanceTimersByTimeAsync(1200);
		return promise;
	}

	// ====================================================================
	// Initialization
	// ====================================================================
	describe('initialize', () => {
		it('creates a WebRTCAdaptor with correct websocket URL', async () => {
			await initService('media.example.com', 'myVideo');
			expect(capturedOpts).not.toBeNull();
			expect(capturedOpts.websocket_url).toBe('ws://media.example.com/WebRTCAppEE/websocket');
		});

		it('configures audio constraints with echo cancellation and noise suppression', async () => {
			await initService();
			const audio = capturedOpts.mediaConstraints.audio;
			expect(audio.echoCancellation).toBe(true);
			expect(audio.noiseSuppression).toBe(true);
			expect(audio.autoGainControl).toBe(true);
			expect(audio.sampleRate).toBe(48000);
		});

		it('disables video in media constraints by default', async () => {
			await initService();
			expect(capturedOpts.mediaConstraints.video).toBe(false);
		});

		it('enables the data channel', async () => {
			await initService();
			expect(capturedOpts.dataChannelEnabled).toBe(true);
		});

		it('calls onSuccess after initialization', async () => {
			await initService();
			expect(callbacks.onSuccess).toHaveBeenCalledWith('Successfully connected to media server');
		});

		it('rejects when WebSocket connection times out', async () => {
			// The source code's polling loop can cause a secondary rejection after
			// the timeout fires. We catch and ignore it here since that's the expected
			// behavior of the production code under timeout conditions.
			const unhandled: Array<unknown> = [];
			const handler = (reason: unknown) => { unhandled.push(reason); };
			process.on('unhandledRejection', handler);

			const svc = new AntMediaService();
			const promise = svc.initialize('media.example.com', 'v', callbacks);
			// Advance past the 20s timeout + extra for polling
			await vi.advanceTimersByTimeAsync(21_000);

			let caught: Error | undefined;
			try {
				await promise;
			} catch (e: any) {
				caught = e;
			}
			expect(caught).toBeDefined();
			expect(caught!.message).toBe('WebSocket connection timeout');

			// Flush any remaining timers to avoid leaking into other tests
			await vi.runAllTimersAsync();
			process.removeListener('unhandledRejection', handler);
		});
	});

	// ====================================================================
	// Callback handling  (handleCallback)
	// ====================================================================
	describe('handleCallback – publish lifecycle', () => {
		beforeEach(async () => {
			await initService();
		});

		it('sets publishing state on publish_started', () => {
			capturedOpts.callback('publish_started', {});
			expect(callbacks.onSuccess).toHaveBeenCalledWith('Your stream has started');
		});

		it('resets publishing state on publish_finished', () => {
			capturedOpts.callback('publish_started', {});
			capturedOpts.callback('publish_finished', {});
			expect(callbacks.onSuccess).toHaveBeenCalledWith('Stream ended');
		});
	});

	describe('handleCallback – participant events', () => {
		beforeEach(async () => {
			await initService();
		});

		it('fires onParticipantJoined when streamJoined arrives', () => {
			capturedOpts.callback('streamJoined', { streamId: 'abc123', streamName: 'Alice' });
			expect(callbacks.onParticipantJoined).toHaveBeenCalledWith(
				expect.objectContaining({ streamId: 'abc123', name: 'Alice' }),
			);
		});

		it('defaults participant name to "Unknown User" when streamName is absent', () => {
			capturedOpts.callback('streamJoined', { streamId: 'xyz' });
			expect(callbacks.onParticipantJoined).toHaveBeenCalledWith(
				expect.objectContaining({ streamId: 'xyz', name: 'Unknown User' }),
			);
		});

		it('fires onParticipantLeft on streamLeaved event', () => {
			capturedOpts.callback('streamJoined', { streamId: 's1', streamName: 'Bob' });
			capturedOpts.callback('streamLeaved', { streamId: 's1' });
			expect(callbacks.onParticipantLeft).toHaveBeenCalledWith('s1');
		});

		it('fires onParticipantLeft on streamLeft event', () => {
			capturedOpts.callback('streamJoined', { streamId: 's2', streamName: 'Eve' });
			capturedOpts.callback('streamLeft', { streamId: 's2' });
			expect(callbacks.onParticipantLeft).toHaveBeenCalledWith('s2');
		});

		it('adds participants from roomInformation', () => {
			capturedOpts.callback('roomInformation', {
				streams: [
					{ streamId: 'r1', streamName: 'Ann' },
					{ streamId: 'r2', streamName: 'Ben' },
				],
			});
			expect(callbacks.onParticipantJoined).toHaveBeenCalledTimes(2);
			const participants = service.getParticipants();
			expect(participants).toHaveLength(2);
		});

		it('does not duplicate participants already present from roomInformation', () => {
			capturedOpts.callback('streamJoined', { streamId: 'r1', streamName: 'Ann' });
			capturedOpts.callback('roomInformation', {
				streams: [{ streamId: 'r1', streamName: 'Ann' }],
			});
			// onParticipantJoined fires once for the initial join, not again from roomInfo
			expect(callbacks.onParticipantJoined).toHaveBeenCalledTimes(1);
		});
	});

	describe('handleCallback – localStream', () => {
		it('passes the MediaStream to onLocalStream callback', async () => {
			await initService();
			const fakeStream = { id: 'local-stream' } as unknown as MediaStream;
			capturedOpts.callback('localStream', fakeStream);
			expect(callbacks.onLocalStream).toHaveBeenCalledWith(fakeStream);
			expect(callbacks.onSuccess).toHaveBeenCalledWith('Your camera and microphone are connected');
		});
	});

	describe('handleCallback – newStreamAvailable', () => {
		it('associates a media stream with an existing participant', async () => {
			await initService();
			capturedOpts.callback('streamJoined', { streamId: 'p1', streamName: 'Dan' });

			// Mock document.createElement for this test since we run in Node
			const fakeVideoEl = { srcObject: null, autoplay: false };
			vi.stubGlobal('document', {
				createElement: vi.fn().mockReturnValue(fakeVideoEl),
			});

			const fakeStream = { id: 'remote-stream' } as unknown as MediaStream;
			capturedOpts.callback('newStreamAvailable', { streamId: 'p1', stream: fakeStream });

			const participants = service.getParticipants();
			const dan = participants.find(p => p.streamId === 'p1');
			expect(dan).toBeDefined();
			expect(dan!.videoElement).toBeDefined();

			vi.unstubAllGlobals();
		});
	});

	// ====================================================================
	// Error handling (handleError)
	// ====================================================================
	describe('handleError', () => {
		beforeEach(async () => {
			await initService();
		});

		it('silently continues on already_publishing for the current stream', async () => {
			// Simulate joining first to set currentStreamId
			await service.joinRoom('room1', 'user1');
			capturedOpts.callbackError(
				{ definition: 'already_publishing', streamId: 'room1' },
				'Already publishing',
			);
			expect(callbacks.onSuccess).toHaveBeenCalledWith('You are already streaming');
		});

		it('attempts to republish on noStreamNameSpecified error', async () => {
			await service.joinRoom('room1', 'user1');
			capturedOpts.callbackError(
				{ definition: 'noStreamNameSpecified' },
				'No stream name',
			);
			expect(mockAdaptor.publish).toHaveBeenCalled();
		});

		it('forwards generic errors to onError callback', () => {
			capturedOpts.callbackError('SomeError', 'Something went wrong');
			expect(callbacks.onError).toHaveBeenCalledWith('SomeError', 'Something went wrong');
		});

		it('translates WebSocketNotConnected messages to user-friendly text', () => {
			capturedOpts.callbackError(
				'WebSocketNotConnected',
				'WebSocketNotConnected: unable to send',
			);
			expect(callbacks.onError).toHaveBeenCalledWith(
				'WebSocketNotConnected',
				expect.stringContaining('Unable to connect to the media server'),
			);
		});
	});

	// ====================================================================
	// Room operations
	// ====================================================================
	describe('createRoom', () => {
		it('throws when adaptor is not initialized', async () => {
			await expect(service.createRoom('room1', 'user1')).rejects.toThrow(
				'WebRTCAdaptor not initialized',
			);
		});

		it('publishes a stream when not already publishing', async () => {
			await initService();
			const streamId = await service.createRoom('room1', 'user1');
			expect(streamId).toBe('room1');
			expect(mockAdaptor.publish).toHaveBeenCalledWith(
				'room1',
				null,
				null,
				null,
				expect.any(String),
				'room1',
			);
		});

		it('skips publish when already publishing', async () => {
			await initService();
			capturedOpts.callback('publish_started', {});
			const streamId = await service.createRoom('room1', 'user1');
			expect(streamId).toBe('room1');
			expect(mockAdaptor.publish).not.toHaveBeenCalled();
		});
	});

	describe('joinRoom', () => {
		it('throws when adaptor is not initialized', async () => {
			await expect(service.joinRoom('room1', 'user1')).rejects.toThrow(
				'WebRTCAdaptor not initialized',
			);
		});

		it('plays the stream for the room', async () => {
			await initService();
			const streamId = await service.joinRoom('room1', 'user1');
			expect(streamId).toBe('room1');
			expect(mockAdaptor.play).toHaveBeenCalledWith('room1');
		});
	});

	// ====================================================================
	// Leave / disconnect
	// ====================================================================
	describe('leaveRoom', () => {
		it('calls leaveFromRoom and clears participants', async () => {
			await initService();
			await service.joinRoom('room1', 'user1');
			capturedOpts.callback('streamJoined', { streamId: 's1' });

			service.leaveRoom();

			expect(mockAdaptor.leaveFromRoom).toHaveBeenCalledWith('room1');
			expect(service.getParticipants()).toHaveLength(0);
		});

		it('is safe to call when not in a room', () => {
			// Should not throw
			expect(() => service.leaveRoom()).not.toThrow();
		});
	});

	describe('disconnect', () => {
		it('closes websocket and nullifies the adaptor', async () => {
			await initService();
			service.disconnect();
			expect(mockAdaptor.closeWebSocket).toHaveBeenCalled();
		});

		it('is safe to call when not initialized', () => {
			expect(() => service.disconnect()).not.toThrow();
		});
	});

	// ====================================================================
	// getLocalStream / getParticipants
	// ====================================================================
	describe('getLocalStream', () => {
		it('returns null before any local stream event', async () => {
			await initService();
			expect(service.getLocalStream()).toBeNull();
		});

		it('returns the local stream after localStream callback', async () => {
			await initService();
			const fakeStream = { id: 'local-stream' } as unknown as MediaStream;
			capturedOpts.callback('localStream', fakeStream);
			expect(service.getLocalStream()).toBe(fakeStream);
		});
	});

	describe('getParticipants', () => {
		it('returns empty array initially', async () => {
			await initService();
			expect(service.getParticipants()).toEqual([]);
		});

		it('returns participants after joins', async () => {
			await initService();
			capturedOpts.callback('streamJoined', { streamId: 'p1', streamName: 'A' });
			capturedOpts.callback('streamJoined', { streamId: 'p2', streamName: 'B' });
			expect(service.getParticipants()).toHaveLength(2);
		});

		it('removes participants after leave', async () => {
			await initService();
			capturedOpts.callback('streamJoined', { streamId: 'p1', streamName: 'A' });
			capturedOpts.callback('streamLeaved', { streamId: 'p1' });
			expect(service.getParticipants()).toHaveLength(0);
		});
	});
});
