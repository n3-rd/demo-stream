import { writable } from "svelte/store";

export const currentVideoUrl = writable<string>('');
export const activeSpeaker = writable(null);
