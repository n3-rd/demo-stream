import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getWebSocketURL } from './websocket';

describe('getWebSocketURL', () => {
	beforeEach(() => {
		// Mock window.location for tests
		vi.stubGlobal('location', { protocol: 'https:', host: 'localhost' });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('builds wss URL from an https URL', () => {
		const result = getWebSocketURL('https://media.example.com/WebRTCAppEE');
		expect(result).toBe('wss://media.example.com/WebRTCAppEE/websocket');
	});

	it('builds ws URL from an http URL when location is http', () => {
		vi.stubGlobal('location', { protocol: 'http:' });
		const result = getWebSocketURL('http://media.example.com/WebRTCAppEE');
		expect(result).toBe('ws://media.example.com/WebRTCAppEE/websocket');
	});

	it('adds default /WebRTCAppEE path when no path is provided', () => {
		const result = getWebSocketURL('https://media.example.com');
		expect(result).toBe('wss://media.example.com/WebRTCAppEE/websocket');
	});

	it('adds default /WebRTCAppEE path when path is just slash', () => {
		const result = getWebSocketURL('https://media.example.com/');
		expect(result).toBe('wss://media.example.com/WebRTCAppEE/websocket');
	});

	it('strips trailing /websocket from the path to avoid duplication', () => {
		const result = getWebSocketURL('https://media.example.com/WebRTCAppEE/websocket');
		expect(result).toBe('wss://media.example.com/WebRTCAppEE/websocket');
	});

	it('handles bare hostname without protocol', () => {
		const result = getWebSocketURL('media.example.com');
		expect(result).toBe('wss://media.example.com/WebRTCAppEE/websocket');
	});

	it('detects secure from port 5443', () => {
		vi.stubGlobal('location', { protocol: 'http:' });
		const result = getWebSocketURL('media.example.com:5443/WebRTCAppEE');
		expect(result).toBe('wss://media.example.com:5443/WebRTCAppEE/websocket');
	});

	it('handles wss:// protocol prefix', () => {
		const result = getWebSocketURL('wss://media.example.com/WebRTCAppEE');
		expect(result).toBe('wss://media.example.com/WebRTCAppEE/websocket');
	});

	it('handles empty string input', () => {
		const result = getWebSocketURL('');
		// Falls through to catch since URL('') will throw
		expect(result).toContain('websocket');
	});

	it('handles whitespace input', () => {
		const result = getWebSocketURL('   ');
		expect(result).toContain('websocket');
	});

	it('preserves custom app path', () => {
		const result = getWebSocketURL('https://media.example.com/LiveApp');
		expect(result).toBe('wss://media.example.com/LiveApp/websocket');
	});
});
