import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { chatMessages } from './chatMessages';

describe('chatMessages store', () => {
	it('defaults to an empty array', () => {
		expect(get(chatMessages)).toEqual([]);
	});

	it('can add a chat message', () => {
		chatMessages.set([
			{ id: '1', sender: 'Alice', text: 'Hello!', timestamp: Date.now() },
		]);
		const msgs = get(chatMessages);
		expect(msgs).toHaveLength(1);
		expect(msgs[0].sender).toBe('Alice');
		expect(msgs[0].text).toBe('Hello!');
	});

	it('can append multiple messages', () => {
		const initial = [
			{ id: '1', sender: 'Alice', text: 'Hello!', timestamp: 1000 },
		];
		chatMessages.set(initial);

		chatMessages.update(prev => [
			...prev,
			{ id: '2', sender: 'Bob', text: 'Hi there!', timestamp: 2000 },
		]);

		const msgs = get(chatMessages);
		expect(msgs).toHaveLength(2);
		expect(msgs[1].sender).toBe('Bob');
	});

	it('can clear all messages', () => {
		chatMessages.set([
			{ id: '1', sender: 'Alice', text: 'Hello', timestamp: 1000 },
			{ id: '2', sender: 'Bob', text: 'World', timestamp: 2000 },
		]);

		chatMessages.set([]);
		expect(get(chatMessages)).toEqual([]);
	});

	it('notifies subscribers when messages change', () => {
		const updates: any[][] = [];
		const unsubscribe = chatMessages.subscribe(v => updates.push([...v]));

		chatMessages.set([{ id: '1', sender: 'Alice', text: 'msg1', timestamp: 1000 }]);
		chatMessages.set([]);

		unsubscribe();

		// First callback is the initial subscription, then two sets
		expect(updates.length).toBeGreaterThanOrEqual(3);
		expect(updates[updates.length - 1]).toEqual([]);
	});

	it('preserves message ordering', () => {
		chatMessages.set([
			{ id: '1', sender: 'Alice', text: 'First', timestamp: 1000 },
			{ id: '2', sender: 'Bob', text: 'Second', timestamp: 2000 },
			{ id: '3', sender: 'Carol', text: 'Third', timestamp: 3000 },
		]);

		const msgs = get(chatMessages);
		expect(msgs[0].text).toBe('First');
		expect(msgs[1].text).toBe('Second');
		expect(msgs[2].text).toBe('Third');
	});
});
