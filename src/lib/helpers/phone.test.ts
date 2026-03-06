import { describe, it, expect } from 'vitest';
import { sanitizePhoneInput, formatToE164, isE164 } from './phone';

describe('sanitizePhoneInput', () => {
	it('returns empty string for empty input', () => {
		expect(sanitizePhoneInput('')).toBe('');
	});

	it('returns empty string for falsy input', () => {
		expect(sanitizePhoneInput(undefined as any)).toBe('');
	});

	it('keeps leading + and removes non-digit characters', () => {
		expect(sanitizePhoneInput('+1 (555) 123-4567')).toBe('+15551234567');
	});

	it('removes non-digit characters when no leading +', () => {
		expect(sanitizePhoneInput('(555) 123-4567')).toBe('5551234567');
	});

	it('trims whitespace', () => {
		expect(sanitizePhoneInput('  +1234  ')).toBe('+1234');
	});

	it('preserves leading + with only digits after', () => {
		expect(sanitizePhoneInput('+12345')).toBe('+12345');
	});

	it('removes letters and special characters', () => {
		expect(sanitizePhoneInput('abc123def')).toBe('123');
	});
});

describe('formatToE164', () => {
	it('returns empty string for empty input', () => {
		expect(formatToE164('')).toBe('');
	});

	it('converts a 10-digit US number to E.164', () => {
		expect(formatToE164('5551234567')).toBe('+15551234567');
	});

	it('converts a formatted US number to E.164', () => {
		expect(formatToE164('(555) 123-4567')).toBe('+15551234567');
	});

	it('handles 11-digit number starting with 1', () => {
		expect(formatToE164('15551234567')).toBe('+15551234567');
	});

	it('handles number already starting with +', () => {
		expect(formatToE164('+15551234567')).toBe('+15551234567');
	});

	it('converts 00 international prefix to +', () => {
		expect(formatToE164('0044123456789')).toBe('+44123456789');
	});

	it('returns empty string for 00 prefix with no remaining digits', () => {
		expect(formatToE164('00')).toBe('');
	});

	it('handles international numbers with + prefix', () => {
		expect(formatToE164('+44 7911 123456')).toBe('+447911123456');
	});

	it('handles 7-digit numbers', () => {
		expect(formatToE164('1234567')).toBe('+1234567');
	});

	it('handles 15-digit numbers', () => {
		expect(formatToE164('123456789012345')).toBe('+123456789012345');
	});

	it('handles numbers shorter than 7 digits with best-effort', () => {
		expect(formatToE164('123')).toBe('+123');
	});

	it('returns empty string when input has no digits', () => {
		expect(formatToE164('abc')).toBe('');
	});

	it('handles CA default country for 10-digit numbers', () => {
		expect(formatToE164('5551234567', 'CA')).toBe('+15551234567');
	});
});

describe('isE164', () => {
	it('returns false for empty string', () => {
		expect(isE164('')).toBe(false);
	});

	it('returns false for falsy input', () => {
		expect(isE164(undefined as any)).toBe(false);
	});

	it('returns true for a valid US E.164 number', () => {
		expect(isE164('+15551234567')).toBe(true);
	});

	it('returns true for a valid international E.164 number', () => {
		expect(isE164('+447911123456')).toBe(true);
	});

	it('returns true for 10-digit US number (auto-formatted to E.164)', () => {
		expect(isE164('5551234567')).toBe(true);
	});

	it('returns false for a number starting with 0 after +', () => {
		expect(isE164('+0551234567')).toBe(false);
	});

	it('returns false for too-short numbers', () => {
		expect(isE164('123')).toBe(false);
	});
});
