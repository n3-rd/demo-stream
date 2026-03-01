import { writable } from 'svelte/store';

// Initialize local username.
export const username = writable('');

// Keep track of the calls chat history (array of objects with the name+message)
export let chatMessages = writable([]);

export let pickerOpen = writable(false);