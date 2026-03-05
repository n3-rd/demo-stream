import { describe, it, expect } from 'vitest';
import { determineFileType } from './mediaUtils';

describe('determineFileType', () => {
	it('returns "video" when type is "video"', () => {
		expect(determineFileType({ type: 'video' })).toBe('video');
	});

	it('returns "pdf" when type is "pdf"', () => {
		expect(determineFileType({ type: 'pdf' })).toBe('pdf');
	});

	it('returns "docx" when type is "document"', () => {
		expect(determineFileType({ type: 'document' })).toBe('docx');
	});

	it('returns "image" when type is "image"', () => {
		expect(determineFileType({ type: 'image' })).toBe('image');
	});

	it('is case-insensitive for type field', () => {
		expect(determineFileType({ type: 'VIDEO' })).toBe('video');
		expect(determineFileType({ type: 'PDF' })).toBe('pdf');
		expect(determineFileType({ type: 'Image' })).toBe('image');
	});

	it('falls back to fileKind when type does not match', () => {
		expect(determineFileType({ type: 'other', fileKind: 'video' })).toBe('video');
		expect(determineFileType({ type: 'other', fileKind: 'pdf' })).toBe('pdf');
	});

	it('detects pdf from file extension', () => {
		expect(determineFileType({ file: 'doc.pdf' })).toBe('pdf');
	});

	it('detects docx from file extension', () => {
		expect(determineFileType({ file: 'report.docx' })).toBe('docx');
	});

	it('detects doc from file extension', () => {
		expect(determineFileType({ file: 'report.doc' })).toBe('docx');
	});

	it('detects video from file extension', () => {
		expect(determineFileType({ file: 'clip.mp4' })).toBe('video');
		expect(determineFileType({ file: 'clip.avi' })).toBe('video');
		expect(determineFileType({ file: 'clip.mov' })).toBe('video');
	});

	it('detects image from file extension', () => {
		expect(determineFileType({ file: 'photo.jpg' })).toBe('image');
		expect(determineFileType({ file: 'photo.png' })).toBe('image');
		expect(determineFileType({ file: 'photo.jpeg' })).toBe('image');
		expect(determineFileType({ file: 'anim.gif' })).toBe('image');
	});

	it('returns "unknown" when nothing matches', () => {
		expect(determineFileType({ file: 'data.csv' })).toBe('unknown');
	});

	it('returns "unknown" for null input', () => {
		expect(determineFileType(null)).toBe('unknown');
	});

	it('returns "unknown" for undefined input', () => {
		expect(determineFileType(undefined)).toBe('unknown');
	});

	it('returns "unknown" for empty object', () => {
		expect(determineFileType({})).toBe('unknown');
	});
});
