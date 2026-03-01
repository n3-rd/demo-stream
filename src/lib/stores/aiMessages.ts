import { writable } from 'svelte/store';

export interface AiMessage {
    name: string;
    senderId: string;
    text: string;
    eventType: string;
    timestamp: number;
}

export const aiMessages = writable<AiMessage[]>([]);
