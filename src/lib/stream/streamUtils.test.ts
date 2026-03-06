import { describe, it, expect } from 'vitest';
import {
	parseStreamId,
	sanitizeStreamName,
	formatDisplayName,
	getCleanDisplayName,
	generateRandomString
} from './streamUtils';

describe('parseStreamId', () => {
	it('parses a front camera stream ID', () => {
		const result = parseStreamId('abc123-rep456_front');
		expect(result).toEqual({
			uniqueId: 'abc123',
			odooRepId: 'rep456',
			cameraType: 'front',
			isBackCamera: false,
			isFrontCamera: true
		});
	});

	it('parses a back camera stream ID', () => {
		const result = parseStreamId('abc123-rep456_back');
		expect(result).toEqual({
			uniqueId: 'abc123',
			odooRepId: 'rep456',
			cameraType: 'back',
			isBackCamera: true,
			isFrontCamera: false
		});
	});

	it('handles stream IDs with multiple dashes in uniqueId', () => {
		const result = parseStreamId('abc-def-ghi-rep456_front');
		expect(result).toEqual({
			uniqueId: 'abc-def-ghi',
			odooRepId: 'rep456',
			cameraType: 'front',
			isBackCamera: false,
			isFrontCamera: true
		});
	});

	it('returns defaults for a plain stream ID without camera suffix', () => {
		const result = parseStreamId('simpleStreamId');
		expect(result).toEqual({
			uniqueId: 'simpleStreamId',
			odooRepId: null,
			cameraType: 'unknown',
			isBackCamera: false,
			isFrontCamera: false
		});
	});

	it('returns defaults for a stream ID with dash but no camera suffix', () => {
		const result = parseStreamId('abc-def');
		expect(result).toEqual({
			uniqueId: 'abc-def',
			odooRepId: null,
			cameraType: 'unknown',
			isBackCamera: false,
			isFrontCamera: false
		});
	});

	it('returns defaults for an empty string', () => {
		const result = parseStreamId('');
		expect(result).toEqual({
			uniqueId: '',
			odooRepId: null,
			cameraType: 'unknown',
			isBackCamera: false,
			isFrontCamera: false
		});
	});
});

describe('sanitizeStreamName', () => {
	it('replaces spaces with underscores', () => {
		expect(sanitizeStreamName('John Doe')).toBe('John_Doe');
	});

	it('replaces special characters with underscores', () => {
		expect(sanitizeStreamName('user@name!')).toBe('user_name_');
	});

	it('preserves alphanumeric characters and hyphens', () => {
		expect(sanitizeStreamName('my-stream-123')).toBe('my-stream-123');
	});

	it('returns empty string for empty input', () => {
		expect(sanitizeStreamName('')).toBe('');
	});

	it('decodes URI-encoded strings before sanitizing', () => {
		expect(sanitizeStreamName('John%20Doe')).toBe('John_Doe');
	});
});

describe('formatDisplayName', () => {
	it('returns the trimmed name for non-representatives', () => {
		expect(formatDisplayName('  Alice  ')).toBe('Alice');
	});

	it('appends _representative suffix for representatives', () => {
		expect(formatDisplayName('Bob', true)).toBe('Bob_representative');
	});

	it('returns "Unknown User" for empty input', () => {
		expect(formatDisplayName('')).toBe('Unknown User');
	});

	it('returns "Unknown User" for falsy input', () => {
		expect(formatDisplayName(undefined as any)).toBe('Unknown User');
	});
});

describe('getCleanDisplayName', () => {
	it('removes _representative suffix', () => {
		expect(getCleanDisplayName('Bob_representative')).toBe('Bob');
	});

	it('removes multiple underscore representative suffix', () => {
		expect(getCleanDisplayName('Bob__representative')).toBe('Bob');
	});

	it('is case-insensitive for suffix removal', () => {
		expect(getCleanDisplayName('Bob_Representative')).toBe('Bob');
	});

	it('returns name unchanged when no suffix', () => {
		expect(getCleanDisplayName('Alice')).toBe('Alice');
	});

	it('returns "Unknown User" for empty input', () => {
		expect(getCleanDisplayName('')).toBe('Unknown User');
	});

	it('returns "Unknown User" for falsy input', () => {
		expect(getCleanDisplayName(undefined as any)).toBe('Unknown User');
	});
});

describe('generateRandomString', () => {
	it('generates a string of the requested length', () => {
		expect(generateRandomString(10)).toHaveLength(10);
		expect(generateRandomString(0)).toHaveLength(0);
		expect(generateRandomString(1)).toHaveLength(1);
	});

	it('only contains lowercase alphanumeric characters', () => {
		const result = generateRandomString(100);
		expect(result).toMatch(/^[a-z0-9]*$/);
	});

	it('generates different strings on subsequent calls', () => {
		const a = generateRandomString(20);
		const b = generateRandomString(20);
		// Extremely unlikely to collide with 36^20 possibilities
		expect(a).not.toBe(b);
	});
});
