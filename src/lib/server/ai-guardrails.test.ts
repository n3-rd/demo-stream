import { describe, it, expect } from 'vitest';
import { guardrail } from './ai-guardrails';

describe('ai-guardrails', () => {
	it('exports a non-empty guardrail string', () => {
		expect(guardrail).toBeDefined();
		expect(typeof guardrail).toBe('string');
		expect(guardrail.length).toBeGreaterThan(0);
	});

	it('contains instructions about business-only responses', () => {
		expect(guardrail).toContain('ONLY answer questions related to our business');
	});

	it('contains instructions to decline non-business queries', () => {
		expect(guardrail).toContain('politely decline to answer');
	});

	it('mentions the video conferencing platform context', () => {
		expect(guardrail).toContain('video conferencing and collaboration platform');
	});

	it('contains examples of acceptable queries', () => {
		expect(guardrail).toContain('How do I start a meeting');
		expect(guardrail).toContain('content library feature');
	});

	it('contains examples of unacceptable queries', () => {
		expect(guardrail).toContain('weather');
		expect(guardrail).toContain('joke');
	});
});
