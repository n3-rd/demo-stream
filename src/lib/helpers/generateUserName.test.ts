import { describe, it, expect } from 'vitest';
import { generateUserName } from './generateUserName';

describe('generateUserName', () => {
	it('removes special characters from the name', () => {
		const result = generateUserName('John Doe!@#');
		expect(result).toMatch(/^JohnDoe\d{4}$/);
	});

	it('removes spaces from the name', () => {
		const result = generateUserName('Jane Smith');
		expect(result).toMatch(/^JaneSmith\d{4}$/);
	});

	it('appends a 4-digit random number', () => {
		const result = generateUserName('User');
		const numPart = parseInt(result.replace('User', ''), 10);
		expect(numPart).toBeGreaterThanOrEqual(1000);
		expect(numPart).toBeLessThanOrEqual(9999);
	});

	it('preserves alphanumeric characters', () => {
		const result = generateUserName('Test123');
		expect(result).toMatch(/^Test123\d{4}$/);
	});

	it('handles empty string', () => {
		const result = generateUserName('');
		expect(result).toMatch(/^\d{4}$/);
	});

	it('handles special characters only', () => {
		const result = generateUserName('!@#$%');
		expect(result).toMatch(/^\d{4}$/);
	});

	it('generates unique usernames on subsequent calls', () => {
		const a = generateUserName('Test');
		const b = generateUserName('Test');
		// Very unlikely to be the same due to random numbers
		// (1 in 9000 chance), so this is a probabilistic test
		// We run it multiple times to be safe
		const results = new Set(Array.from({ length: 20 }, () => generateUserName('Test')));
		expect(results.size).toBeGreaterThan(1);
	});
});
