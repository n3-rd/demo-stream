import { describe, it, expect } from 'vitest';
import { normalizeContent } from './content';

describe('normalizeContent', () => {
	it('returns empty array for empty input', () => {
		expect(normalizeContent([])).toEqual([]);
	});

	it('returns empty array for null/undefined input', () => {
		expect(normalizeContent(null as any)).toEqual([]);
		expect(normalizeContent(undefined as any)).toEqual([]);
	});

	it('maps library_type to roles', () => {
		const items = [{ library_type: ['admin', 'rep'] }];
		const result = normalizeContent(items);
		expect(result[0].roles).toEqual(['admin', 'rep']);
	});

	it('maps type to fileKind', () => {
		const items = [{ type: 'video' }];
		const result = normalizeContent(items);
		expect(result[0].fileKind).toBe('video');
	});

	it('defaults fileKind to "unknown" when type is missing', () => {
		const items = [{ name: 'test' }];
		const result = normalizeContent(items);
		expect(result[0].fileKind).toBe('unknown');
	});

	it('defaults collectionId to "content_library"', () => {
		const items = [{ name: 'test' }];
		const result = normalizeContent(items);
		expect(result[0].collectionId).toBe('content_library');
	});

	it('preserves existing collectionId', () => {
		const items = [{ collectionId: 'custom' }];
		const result = normalizeContent(items);
		expect(result[0].collectionId).toBe('custom');
	});

	it('preserves all original properties', () => {
		const items = [{ id: '1', name: 'Test', extra: true }];
		const result = normalizeContent(items);
		expect(result[0].id).toBe('1');
		expect(result[0].name).toBe('Test');
		expect(result[0].extra).toBe(true);
	});

	it('handles multiple items', () => {
		const items = [
			{ type: 'video', library_type: ['admin'] },
			{ type: 'pdf', library_type: ['rep'] }
		];
		const result = normalizeContent(items);
		expect(result).toHaveLength(2);
		expect(result[0].fileKind).toBe('video');
		expect(result[1].fileKind).toBe('pdf');
	});
});
