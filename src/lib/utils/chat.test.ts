import { describe, it, expect } from 'vitest';
import { extractAndNormalizeName, isCurrentUserMessage, getInitials } from './chat';

describe('extractAndNormalizeName', () => {
	it('returns empty string for empty input', () => {
		expect(extractAndNormalizeName('')).toBe('');
	});

	it('returns empty string for falsy input', () => {
		expect(extractAndNormalizeName(undefined as any)).toBe('');
	});

	it('extracts last part from a stream ID with dashes', () => {
		expect(extractAndNormalizeName('room-123-alice')).toBe('alice');
	});

	it('removes _representative suffix', () => {
		expect(extractAndNormalizeName('bob_representative')).toBe('bob');
	});

	it('replaces underscores with spaces', () => {
		expect(extractAndNormalizeName('john_doe')).toBe('john doe');
	});

	it('returns lowercase name', () => {
		expect(extractAndNormalizeName('Alice')).toBe('alice');
	});

	it('handles combined stream ID with representative suffix', () => {
		expect(extractAndNormalizeName('room-123-bob_representative')).toBe('bob');
	});
});

describe('isCurrentUserMessage', () => {
	it('returns true when sender IDs match', () => {
		expect(isCurrentUserMessage('any', 'any', 'user1', 'user1')).toBe(true);
	});

	it('returns false when sender IDs differ', () => {
		expect(isCurrentUserMessage('any', 'any', 'user1', 'user2')).toBe(false);
	});

	it('returns true for direct name match', () => {
		expect(isCurrentUserMessage('Alice', 'Alice')).toBe(true);
	});

	it('returns false for different names', () => {
		expect(isCurrentUserMessage('Alice', 'Bob')).toBe(false);
	});

	it('returns false for empty message name', () => {
		expect(isCurrentUserMessage('', 'Alice')).toBe(false);
	});

	it('returns false for empty current user name', () => {
		expect(isCurrentUserMessage('Alice', '')).toBe(false);
	});

	it('matches normalized names from stream IDs', () => {
		expect(isCurrentUserMessage('room-123-alice', 'room-456-alice')).toBe(true);
	});

	it('matches names with representative suffix', () => {
		expect(isCurrentUserMessage('alice_representative', 'alice')).toBe(true);
	});
});

describe('getInitials', () => {
	it('returns "UN" for empty string', () => {
		expect(getInitials('')).toBe('UN');
	});

	it('returns "UN" for whitespace-only string', () => {
		expect(getInitials('   ')).toBe('UN');
	});

	it('returns "UN" for falsy input', () => {
		expect(getInitials(undefined as any)).toBe('UN');
	});

	it('returns first two letters of a single name', () => {
		expect(getInitials('Alice')).toBe('AL');
	});

	it('returns initials of first and last name', () => {
		expect(getInitials('John Doe')).toBe('JD');
	});

	it('handles stream IDs by extracting last part', () => {
		expect(getInitials('room-alice')).toBe('AL');
	});

	it('handles names with representative suffix', () => {
		expect(getInitials('bob_representative')).toBe('BO');
	});

	it('handles hyphenated names by extracting last segment (stream ID style)', () => {
		// extractAndNormalizeName treats dashes as stream ID separators,
		// so 'anna-smith' → 'smith' → initials 'SM'
		expect(getInitials('anna-smith')).toBe('SM');
	});

	it('handles single character name', () => {
		const result = getInitials('a');
		expect(result).toBe('AA');
	});

	it('returns uppercase initials', () => {
		expect(getInitials('john doe')).toBe('JD');
	});
});
