import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	checkPermissions,
	requestMicPermission,
	requestCameraPermission,
} from './permissions';

describe('checkPermissions', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns null when navigator is undefined', async () => {
		vi.stubGlobal('navigator', undefined);
		const cleanup = await checkPermissions(vi.fn(), vi.fn());
		expect(cleanup).toBeNull();
	});

	it('returns null when navigator.permissions is unavailable', async () => {
		vi.stubGlobal('navigator', {});
		const cleanup = await checkPermissions(vi.fn(), vi.fn());
		expect(cleanup).toBeNull();
	});

	it('calls change callbacks with initial permission states', async () => {
		const micResult = { state: 'granted', addEventListener: vi.fn(), removeEventListener: vi.fn() };
		const camResult = { state: 'denied', addEventListener: vi.fn(), removeEventListener: vi.fn() };

		vi.stubGlobal('navigator', {
			permissions: {
				query: vi.fn().mockImplementation(({ name }: { name: string }) => {
					if (name === 'microphone') return Promise.resolve(micResult);
					if (name === 'camera') return Promise.resolve(camResult);
					return Promise.reject(new Error('unknown permission'));
				}),
			},
		});

		const onMic = vi.fn();
		const onCam = vi.fn();
		const cleanup = await checkPermissions(onMic, onCam);

		expect(onMic).toHaveBeenCalledWith('granted');
		expect(onCam).toHaveBeenCalledWith('denied');
		expect(cleanup).toBeTypeOf('function');
	});

	it('attaches change listeners and cleanup removes them', async () => {
		const micResult = { state: 'prompt', addEventListener: vi.fn(), removeEventListener: vi.fn() };
		const camResult = { state: 'prompt', addEventListener: vi.fn(), removeEventListener: vi.fn() };

		vi.stubGlobal('navigator', {
			permissions: {
				query: vi.fn().mockImplementation(({ name }: { name: string }) => {
					if (name === 'microphone') return Promise.resolve(micResult);
					if (name === 'camera') return Promise.resolve(camResult);
					return Promise.reject(new Error('unknown'));
				}),
			},
		});

		const cleanup = await checkPermissions(vi.fn(), vi.fn());

		expect(micResult.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
		expect(camResult.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

		cleanup!();

		expect(micResult.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
		expect(camResult.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
	});

	it('returns null when Permissions API throws', async () => {
		vi.stubGlobal('navigator', {
			permissions: {
				query: vi.fn().mockRejectedValue(new Error('not supported')),
			},
		});

		const cleanup = await checkPermissions(vi.fn(), vi.fn());
		expect(cleanup).toBeNull();
	});
});

describe('requestMicPermission', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns "granted" when getUserMedia succeeds', async () => {
		const track = { stop: vi.fn() };
		vi.stubGlobal('navigator', {
			mediaDevices: {
				getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [track] }),
			},
		});

		const result = await requestMicPermission();
		expect(result).toBe('granted');
		expect(track.stop).toHaveBeenCalled();
	});

	it('requests audio only (no video)', async () => {
		const mockGetUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [] });
		vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: mockGetUserMedia } });

		await requestMicPermission();
		expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
	});

	it('returns "denied" when getUserMedia fails', async () => {
		vi.stubGlobal('navigator', {
			mediaDevices: {
				getUserMedia: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
			},
		});

		const result = await requestMicPermission();
		expect(result).toBe('denied');
	});
});

describe('requestCameraPermission', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns "granted" when getUserMedia succeeds', async () => {
		const track = { stop: vi.fn() };
		vi.stubGlobal('navigator', {
			mediaDevices: {
				getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [track] }),
			},
		});

		const result = await requestCameraPermission();
		expect(result).toBe('granted');
		expect(track.stop).toHaveBeenCalled();
	});

	it('requests video only (no audio)', async () => {
		const mockGetUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [] });
		vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: mockGetUserMedia } });

		await requestCameraPermission();
		expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: false, video: true });
	});

	it('returns "denied" when getUserMedia fails', async () => {
		vi.stubGlobal('navigator', {
			mediaDevices: {
				getUserMedia: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
			},
		});

		const result = await requestCameraPermission();
		expect(result).toBe('denied');
	});
});
