import { describe, it, expect, vi, afterEach } from 'vitest';
import { getMeetingStatus, isWithinOneHour } from './meetingStatus';

describe('getMeetingStatus', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns canJoin true when data is null', () => {
		const result = getMeetingStatus(null);
		expect(result).toEqual({
			canJoin: true,
			isPast: false,
			joinBeforeMinutes: 0,
			minutesLeft: 0
		});
	});

	it('returns canJoin true when data is undefined', () => {
		const result = getMeetingStatus(undefined);
		expect(result).toEqual({
			canJoin: true,
			isPast: false,
			joinBeforeMinutes: 0,
			minutesLeft: 0
		});
	});

	it('returns canJoin true when no schedule_time is present', () => {
		const result = getMeetingStatus({ scheduledRoom: {} });
		expect(result).toEqual({
			canJoin: true,
			isPast: false,
			joinBeforeMinutes: 0,
			minutesLeft: 0
		});
	});

	it('returns isPast true for a meeting in the past', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));

		const result = getMeetingStatus({
			schedule_time: '2026-03-06T10:00:00Z',
			join_before_minutes: 15
		});

		expect(result.isPast).toBe(true);
		expect(result.minutesLeft).toBeLessThan(0);
	});

	it('returns canJoin true when within join_before_minutes window', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-06T11:50:00Z'));

		const result = getMeetingStatus({
			schedule_time: '2026-03-06T12:00:00Z',
			join_before_minutes: 15
		});

		expect(result.canJoin).toBe(true);
		expect(result.isPast).toBe(false);
		expect(result.minutesLeft).toBe(10);
		expect(result.joinBeforeMinutes).toBe(15);
	});

	it('returns canJoin false when meeting is too far in the future', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-06T10:00:00Z'));

		const result = getMeetingStatus({
			schedule_time: '2026-03-06T12:00:00Z',
			join_before_minutes: 15
		});

		expect(result.canJoin).toBe(false);
		expect(result.minutesLeft).toBe(120);
	});

	it('handles scheduledRoom wrapper object', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-06T11:50:00Z'));

		const result = getMeetingStatus({
			scheduledRoom: {
				schedule_time: '2026-03-06T12:00:00Z',
				join_before_minutes: 15
			}
		});

		expect(result.canJoin).toBe(true);
		expect(result.minutesLeft).toBe(10);
	});

	it('handles scheduledTime property (alternative key)', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-06T11:50:00Z'));

		const result = getMeetingStatus({
			scheduledTime: '2026-03-06T12:00:00Z',
			join_before_minutes: 15
		});

		expect(result.canJoin).toBe(true);
	});

	it('handles Date objects for schedule_time', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-06T11:55:00Z'));

		const result = getMeetingStatus({
			schedule_time: new Date('2026-03-06T12:00:00Z'),
			join_before_minutes: 10
		});

		expect(result.canJoin).toBe(true);
		expect(result.minutesLeft).toBe(5);
	});

	it('defaults join_before_minutes to 0 when not specified', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-06T11:55:00Z'));

		const result = getMeetingStatus({
			schedule_time: '2026-03-06T12:00:00Z'
		});

		expect(result.joinBeforeMinutes).toBe(0);
		expect(result.canJoin).toBe(false);
	});

	it('returns canJoin false when join_before_minutes is 0 and minutesLeft > 0', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-06T11:59:00Z'));

		const result = getMeetingStatus({
			schedule_time: '2026-03-06T12:00:00Z',
			join_before_minutes: 0
		});

		expect(result.canJoin).toBe(false);
	});
});

describe('isWithinOneHour', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns false for null', () => {
		expect(isWithinOneHour(null)).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(isWithinOneHour(undefined)).toBe(false);
	});

	it('returns true when scheduled time is within 60 minutes', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-06T11:30:00Z'));

		expect(isWithinOneHour('2026-03-06T12:00:00Z')).toBe(true);
	});

	it('returns true when scheduled time is exactly 60 minutes away', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-06T11:00:00Z'));

		expect(isWithinOneHour('2026-03-06T12:00:00Z')).toBe(true);
	});

	it('returns false when scheduled time is more than 60 minutes away', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-06T10:00:00Z'));

		expect(isWithinOneHour('2026-03-06T12:00:00Z')).toBe(false);
	});

	it('returns true for a past scheduled time', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-06T13:00:00Z'));

		expect(isWithinOneHour('2026-03-06T12:00:00Z')).toBe(true);
	});

	it('handles Date objects', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-06T11:30:00Z'));

		expect(isWithinOneHour(new Date('2026-03-06T12:00:00Z'))).toBe(true);
	});
});
