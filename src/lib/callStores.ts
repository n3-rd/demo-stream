import { writable } from "svelte/store";

export const currentVideoUrl = writable('');
export const activeSpeaker = writable(null);
