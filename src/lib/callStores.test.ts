import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import {
	currentVideoUrl,
	currentPdfUrl,
	currentDocxUrl,
	currentImageUrl,
	pdfScrollPosition,
	pdfZoomLevel,
	docxScrollPosition,
	docxZoomLevel,
	imageZoomLevel,
	imagePanX,
	imagePanY,
	activeSpeaker,
} from './callStores';

describe('callStores', () => {
	// ── Default values ──────────────────────────────────────────────────

	describe('default values', () => {
		it('currentVideoUrl defaults to empty string', () => {
			expect(get(currentVideoUrl)).toBe('');
		});

		it('currentPdfUrl defaults to empty string', () => {
			expect(get(currentPdfUrl)).toBe('');
		});

		it('currentDocxUrl defaults to empty string', () => {
			expect(get(currentDocxUrl)).toBe('');
		});

		it('currentImageUrl defaults to empty string', () => {
			expect(get(currentImageUrl)).toBe('');
		});

		it('pdfScrollPosition defaults to 0', () => {
			expect(get(pdfScrollPosition)).toBe(0);
		});

		it('pdfZoomLevel defaults to 1', () => {
			expect(get(pdfZoomLevel)).toBe(1);
		});

		it('docxScrollPosition defaults to 0', () => {
			expect(get(docxScrollPosition)).toBe(0);
		});

		it('docxZoomLevel defaults to 1', () => {
			expect(get(docxZoomLevel)).toBe(1);
		});

		it('imageZoomLevel defaults to 1', () => {
			expect(get(imageZoomLevel)).toBe(1);
		});

		it('imagePanX defaults to 0', () => {
			expect(get(imagePanX)).toBe(0);
		});

		it('imagePanY defaults to 0', () => {
			expect(get(imagePanY)).toBe(0);
		});

		it('activeSpeaker defaults to null', () => {
			expect(get(activeSpeaker)).toBeNull();
		});
	});

	// ── Video URL updates (simulates video media change) ────────────────

	describe('video media changes', () => {
		it('updates currentVideoUrl when a video is shared', () => {
			currentVideoUrl.set('https://cdn.example.com/meeting-recording.mp4');
			expect(get(currentVideoUrl)).toBe('https://cdn.example.com/meeting-recording.mp4');
		});

		it('clears currentVideoUrl when video sharing stops', () => {
			currentVideoUrl.set('https://cdn.example.com/video.mp4');
			currentVideoUrl.set('');
			expect(get(currentVideoUrl)).toBe('');
		});
	});

	// ── PDF sharing ─────────────────────────────────────────────────────

	describe('PDF content sharing', () => {
		it('updates PDF URL and scroll/zoom state', () => {
			currentPdfUrl.set('https://cdn.example.com/document.pdf');
			pdfScrollPosition.set(250);
			pdfZoomLevel.set(1.5);
			expect(get(currentPdfUrl)).toBe('https://cdn.example.com/document.pdf');
			expect(get(pdfScrollPosition)).toBe(250);
			expect(get(pdfZoomLevel)).toBe(1.5);
		});
	});

	// ── Docx sharing ────────────────────────────────────────────────────

	describe('DOCX content sharing', () => {
		it('updates DOCX URL and scroll/zoom state', () => {
			currentDocxUrl.set('https://cdn.example.com/report.docx');
			docxScrollPosition.set(100);
			docxZoomLevel.set(2);
			expect(get(currentDocxUrl)).toBe('https://cdn.example.com/report.docx');
			expect(get(docxScrollPosition)).toBe(100);
			expect(get(docxZoomLevel)).toBe(2);
		});
	});

	// ── Image sharing ───────────────────────────────────────────────────

	describe('image content sharing', () => {
		it('updates image URL with zoom and pan', () => {
			currentImageUrl.set('https://cdn.example.com/diagram.png');
			imageZoomLevel.set(3);
			imagePanX.set(150);
			imagePanY.set(-50);
			expect(get(currentImageUrl)).toBe('https://cdn.example.com/diagram.png');
			expect(get(imageZoomLevel)).toBe(3);
			expect(get(imagePanX)).toBe(150);
			expect(get(imagePanY)).toBe(-50);
		});
	});

	// ── Active speaker ──────────────────────────────────────────────────

	describe('activeSpeaker store', () => {
		it('updates active speaker when someone is talking', () => {
			activeSpeaker.set('user-stream-123');
			expect(get(activeSpeaker)).toBe('user-stream-123');
		});

		it('resets to null when room is silent', () => {
			activeSpeaker.set('user-stream-123');
			activeSpeaker.set(null);
			expect(get(activeSpeaker)).toBeNull();
		});

		it('changes when a different speaker becomes loudest', () => {
			activeSpeaker.set('user-A');
			activeSpeaker.set('user-B');
			expect(get(activeSpeaker)).toBe('user-B');
		});
	});

	// ── Store subscriptions ─────────────────────────────────────────────

	describe('store subscriptions', () => {
		it('notifies subscribers of video URL changes', () => {
			const values: string[] = [];
			const unsubscribe = currentVideoUrl.subscribe(v => values.push(v));

			currentVideoUrl.set('video1.mp4');
			currentVideoUrl.set('video2.mp4');

			unsubscribe();

			// First value is the current value at subscription time, plus two updates
			expect(values).toContain('video1.mp4');
			expect(values).toContain('video2.mp4');
		});

		it('notifies subscribers of active speaker changes', () => {
			const speakers: Array<string | null> = [];
			const unsubscribe = activeSpeaker.subscribe(s => speakers.push(s));

			activeSpeaker.set('speaker-1');
			activeSpeaker.set(null);
			activeSpeaker.set('speaker-2');

			unsubscribe();

			expect(speakers).toContain('speaker-1');
			expect(speakers).toContain(null);
			expect(speakers).toContain('speaker-2');
		});
	});
});
