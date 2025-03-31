import { writable } from "svelte/store";

export const currentVideoUrl = writable<string>('');
export const currentPdfUrl = writable<string>('');
export const pdfScrollPosition = writable<number>(0);
export const activeSpeaker = writable(null);
export const currentDocxUrl = writable<string>('');
export const docxScrollPosition = writable<number>(0);
export const currentImageUrl = writable<string>('');
export const imageZoomLevel = writable<number>(1);
