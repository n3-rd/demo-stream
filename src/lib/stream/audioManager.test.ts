import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioManager } from './audioManager';

// ---------------------------------------------------------------------------
// Minimal DOM / Web Audio API stubs for Node environment
// ---------------------------------------------------------------------------

function createMockAnalyser() {
	return {
		fftSize: 0,
		smoothingTimeConstant: 0,
		getByteTimeDomainData: vi.fn((arr: Uint8Array) => {
			// Fill with silence (128 = center line)
			arr.fill(128);
		}),
	};
}

function createMockAudioContext(state = 'running') {
	const analyser = createMockAnalyser();
	const source = { connect: vi.fn() };

	const ctx = {
		state,
		resume: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		createMediaElementSource: vi.fn().mockReturnValue(source),
		createAnalyser: vi.fn().mockReturnValue(analyser),
		destination: {},
	};

	return ctx;
}

describe('AudioManager', () => {
	let manager: AudioManager;
	let mockCtx: ReturnType<typeof createMockAudioContext>;

	beforeEach(() => {
		vi.useFakeTimers();
		manager = new AudioManager();
		mockCtx = createMockAudioContext();

		// window.AudioContext must be a constructor (called with `new`)
		function FakeAudioContext() {
			return mockCtx;
		}
		vi.stubGlobal('window', {
			AudioContext: FakeAudioContext,
		});

		// Shared mock containers for DOM calls
		const containers = new Map<string, any>();

		vi.stubGlobal('document', {
			getElementById: vi.fn().mockImplementation((id: string) => containers.get(id) || null),
			createElement: vi.fn().mockImplementation((tag: string) => {
				const el: any = {
					id: '',
					className: '',
					autoplay: false,
					controls: false,
					appendChild: vi.fn((child: any) => {
						// Track child elements
					}),
					remove: vi.fn(),
					setAttribute: vi.fn(),
				};
				// Make setSinkId available to match the source code check
				if (tag === 'audio') {
					el.setSinkId = vi.fn().mockResolvedValue(undefined);
				}
				return el;
			}),
			body: {
				appendChild: vi.fn().mockImplementation((el: any) => {
					if (el.id) containers.set(el.id, el);
				}),
			},
			_containers: containers,
		});
	});

	afterEach(() => {
		manager.stopSpeakerDetection();
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	// Helper: register an audio element so getElementById can find it
	function registerAudioElement(trackLabel: string) {
		const audioEl = { id: `remoteAudio${trackLabel}` } as any;
		(document.getElementById as any).mockImplementation((id: string) => {
			if (id === `remoteAudio${trackLabel}`) return audioEl;
			if (id === 'players') return { appendChild: vi.fn() };
			return null;
		});
		return audioEl;
	}

	// ── AudioContext lifecycle ────────────────────────────────────────────

	describe('resumeAudioContext', () => {
		it('resumes a suspended AudioContext', () => {
			mockCtx.state = 'suspended';
			manager.resumeAudioContext();
			expect(mockCtx.resume).toHaveBeenCalled();
		});

		it('does nothing when AudioContext is already running', () => {
			mockCtx.state = 'running';
			manager.resumeAudioContext();
			expect(mockCtx.resume).not.toHaveBeenCalled();
		});
	});

	// ── Remote audio element management ──────────────────────────────────

	describe('createRemoteAudio', () => {
		it('creates a players container if one does not exist', () => {
			manager.createRemoteAudio('track1');
			expect(document.createElement).toHaveBeenCalledWith('div');
			expect(document.createElement).toHaveBeenCalledWith('audio');
		});

		it('reuses existing players container', () => {
			const existing = { id: 'players', appendChild: vi.fn() };
			(document.getElementById as any).mockImplementation((id: string) => {
				if (id === 'players') return existing;
				return null;
			});

			manager.createRemoteAudio('track1');
			// body.appendChild should NOT be called since container exists
			expect(document.body.appendChild).not.toHaveBeenCalled();
		});

		it('schedules monitorAudioLevel after 200ms delay', () => {
			registerAudioElement('track1');
			manager.createRemoteAudio('track1');

			// Before 200ms, no analyser should be created
			expect(mockCtx.createMediaElementSource).not.toHaveBeenCalled();

			// After 200ms, monitorAudioLevel should run
			vi.advanceTimersByTime(250);
			expect(mockCtx.createMediaElementSource).toHaveBeenCalled();
		});
	});

	describe('removeRemoteAudio', () => {
		it('removes the player element from DOM', () => {
			const player = { remove: vi.fn() };
			(document.getElementById as any).mockReturnValue(player);
			manager.removeRemoteAudio('track1');
			expect(player.remove).toHaveBeenCalled();
		});

		it('does nothing if element does not exist', () => {
			(document.getElementById as any).mockReturnValue(null);
			expect(() => manager.removeRemoteAudio('track1')).not.toThrow();
		});
	});

	// ── Audio level monitoring ───────────────────────────────────────────

	describe('monitorAudioLevel', () => {
		it('sets up analyser for an existing audio element', () => {
			const audioEl = registerAudioElement('track1');
			manager.monitorAudioLevel('track1');
			expect(mockCtx.createMediaElementSource).toHaveBeenCalledWith(audioEl);
			expect(mockCtx.createAnalyser).toHaveBeenCalled();
		});

		it('skips if audio element does not exist', () => {
			(document.getElementById as any).mockReturnValue(null);
			manager.monitorAudioLevel('missing');
			expect(mockCtx.createMediaElementSource).not.toHaveBeenCalled();
		});

		it('skips duplicate monitors for the same track', () => {
			registerAudioElement('track1');
			manager.monitorAudioLevel('track1');
			manager.monitorAudioLevel('track1');
			expect(mockCtx.createMediaElementSource).toHaveBeenCalledTimes(1);
		});
	});

	describe('cleanupAudioMonitor', () => {
		it('removes the analyser for the given track', () => {
			registerAudioElement('track1');
			manager.monitorAudioLevel('track1');

			manager.cleanupAudioMonitor('track1');

			// After cleanup, monitoring same track should create a new source
			manager.monitorAudioLevel('track1');
			expect(mockCtx.createMediaElementSource).toHaveBeenCalledTimes(2);
		});
	});

	// ── Speaker detection ────────────────────────────────────────────────

	describe('startSpeakerDetection', () => {
		it('calls onSpeakerChange with null when room is silent', () => {
			registerAudioElement('track1');
			manager.monitorAudioLevel('track1');

			const onSpeakerChange = vi.fn();
			manager.startSpeakerDetection(onSpeakerChange);

			// Advance past one poll interval (200ms)
			vi.advanceTimersByTime(250);
			expect(onSpeakerChange).toHaveBeenCalledWith(null);
		});

		it('does not start a second poll if already running', () => {
			registerAudioElement('track1');
			manager.monitorAudioLevel('track1');

			const cb1 = vi.fn();
			const cb2 = vi.fn();
			manager.startSpeakerDetection(cb1);
			manager.startSpeakerDetection(cb2);

			vi.advanceTimersByTime(250);
			// Only the first callback should receive events
			expect(cb1).toHaveBeenCalled();
			expect(cb2).not.toHaveBeenCalled();
		});
	});

	describe('stopSpeakerDetection', () => {
		it('stops polling and closes AudioContext', () => {
			registerAudioElement('track1');
			manager.monitorAudioLevel('track1');

			const onSpeakerChange = vi.fn();
			manager.startSpeakerDetection(onSpeakerChange);
			vi.advanceTimersByTime(250); // one tick

			manager.stopSpeakerDetection();

			// Reset and advance - should not fire after stop
			onSpeakerChange.mockClear();
			vi.advanceTimersByTime(500);
			expect(onSpeakerChange).not.toHaveBeenCalled();
			expect(mockCtx.close).toHaveBeenCalled();
		});

		it('is safe to call multiple times', () => {
			expect(() => {
				manager.stopSpeakerDetection();
				manager.stopSpeakerDetection();
			}).not.toThrow();
		});
	});
});
