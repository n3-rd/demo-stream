import { Writable, writable } from "svelte/store";

export const anonymousUser: Writable<string> = writable('');