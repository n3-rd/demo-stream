import { describe, it, expect } from 'vitest';
import {
	VIEWER_LIMITS,
	PUBLISHER_BANDWIDTH_KBPS,
	VIEWER_BANDWIDTH_KBPS,
	getStreamBandwidthBreakdown,
	estimateCapacity
} from './streamCapacity';

describe('constants', () => {
	it('exposes viewer limits of 100 per protocol', () => {
		expect(VIEWER_LIMITS.webRTC).toBe(100);
		expect(VIEWER_LIMITS.hls).toBe(100);
		expect(VIEWER_LIMITS.dash).toBe(100);
	});

	it('derives publisher bandwidth from encoder defaults (1000 + 128 kbps)', () => {
		expect(PUBLISHER_BANDWIDTH_KBPS).toBe(1128);
	});

	it('sets viewer bandwidth to 900 kbps matching AntMedia bandwidth option', () => {
		expect(VIEWER_BANDWIDTH_KBPS).toBe(900);
	});
});

describe('getStreamBandwidthBreakdown', () => {
	it('returns correct breakdown for a single stream', () => {
		const breakdown = getStreamBandwidthBreakdown();
		expect(breakdown.publisherKbps).toBe(1128);
		expect(breakdown.perViewerKbps).toBe(900);
		expect(breakdown.maxWebRTCViewers).toBe(100);
		expect(breakdown.fullCapacityDownlinkKbps).toBe(90_000);
	});
});

describe('estimateCapacity', () => {
	it('calculates totals for a single concurrent stream', () => {
		const result = estimateCapacity(1);
		expect(result.concurrentStreams).toBe(1);
		expect(result.totalPublisherKbps).toBe(1128);
		expect(result.totalViewerKbps).toBe(90_000);
		expect(result.totalKbps).toBe(91_128);
		expect(result.totalMbps).toBe(91.13);
		expect(result.maxTotalViewers).toBe(100);
	});

	it('scales linearly for multiple concurrent streams', () => {
		const result = estimateCapacity(5);
		expect(result.concurrentStreams).toBe(5);
		expect(result.totalPublisherKbps).toBe(5 * 1128);
		expect(result.totalViewerKbps).toBe(5 * 100 * 900);
		expect(result.maxTotalViewers).toBe(500);
	});

	it('computes totalMbps as rounded (totalKbps / 1000) to 2 decimal places', () => {
		const result = estimateCapacity(3);
		const expected = Math.round(((3 * 1128 + 3 * 100 * 900) / 1000) * 100) / 100;
		expect(result.totalMbps).toBe(expected);
	});

	it('throws RangeError when concurrentStreams is 0', () => {
		expect(() => estimateCapacity(0)).toThrow(RangeError);
	});

	it('throws RangeError when concurrentStreams is negative', () => {
		expect(() => estimateCapacity(-1)).toThrow(RangeError);
	});
});
