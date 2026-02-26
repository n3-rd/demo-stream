<script lang="ts">
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    import { chatMessages } from '$lib/stores/chatMessages';
    import send from './assets/send.svg';
    import { SendHorizontal, X } from 'lucide-svelte';
    import { sendMessage } from '$lib/helpers/sendMessage';
	import { anonymousUser } from '$lib/stores/anonymousUser';
    import { isCurrentUserMessage, extractAndNormalizeName, getInitials } from '$lib/utils/chat';
    
    export let roomId: string;
    export let name: string | null = null;
    export let variant: 'default' | 'mobile' = 'default';
    export let showClose = false;

    const dispatch = createEventDispatcher();

    let newText = '';
    let chatIsOpen = false;
    let messages = [];

    // Poll chatMessages store every second
    let interval;
    onMount(() => {
        interval = setInterval(() => {
            messages = $chatMessages;
        }, 1000);
    });

    onDestroy(() => {
        clearInterval(interval);
    });


    const sendNewMessage = () => {
        if (!newText.trim()) return;
        
        const local = name || $anonymousUser || 'User';
        const newMessage = {
            name: local,
            text: newText,
            eventType: 'chat_message'
        };

        // Send message using the sendMessage helper
        sendMessage(
            crypto.randomUUID(), // unique message ID
            Date.now(), // current timestamp
            JSON.stringify(newMessage),
            roomId // room ID from the call object
        );

        // Update local messages store
        chatMessages.update(messages => [...messages, newMessage]);
        console.log(newMessage);
        newText = '';
    };

    const toggleChat = () => (chatIsOpen = !chatIsOpen);
    
    function formatDisplayName(nameOrId: string): string {
        if (!nameOrId) return 'Unknown';
        const normalized = extractAndNormalizeName(nameOrId);
        if (!normalized) return nameOrId;
        return normalized.replace(/\b\w/g, char => char.toUpperCase());
    }

    const avatarPalette = [
        '#B43AB6',
        '#1C5DFF',
        '#3B5CCC',
        '#FB923C',
        '#22C55E',
        '#EC4899'
    ];

    function getAvatarColor(nameOrId: string): string {
        if (!nameOrId) return avatarPalette[0];
        let hash = 0;
        for (let i = 0; i < nameOrId.length; i += 1) {
            hash = nameOrId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % avatarPalette.length;
        return avatarPalette[index];
    }

    function handleClose() {
        dispatch('close');
    }
</script>

{#if variant === 'mobile'}
    <div class="flex h-full flex-col bg-white text-[#3b4a56] rounded-t-2xl">
        <div class="flex items-center justify-between px-5 py-4 border-b border-[#d6dce1]">
            <h2 class="text-xl font-semibold text-[#36525e]">Chat</h2>
            {#if showClose}
                <button
                    class="text-[#3b4a56] hover:text-[#1f2933] transition-colors"
                    type="button"
                    on:click={handleClose}
                >
                    <X size={22} strokeWidth={2.5} />
                </button>
            {/if}
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto px-5 py-6 space-y-6 max-h-[40vh]">
            {#if messages.length === 0}
                <div class="flex h-full items-center justify-center text-sm text-[#8a9aa5]">
                    No messages yet
                </div>
            {:else}
                {#each messages as message, index (message.timestamp ?? `${message.name}-${index}`)}
                    <div class="flex gap-4">
                        <div
                            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                            style={`background:${getAvatarColor(message.name)}`}
                        >
                            {getInitials(message.name)}
                        </div>
                        <div class="flex-1 border-b border-[#edf1f3] pb-4 last:border-b-0 last:pb-0 break-all w-full">
                            <div class="text-base font-semibold text-[#36525e]">
                                {formatDisplayName(message.name)}
                            </div>
                            <p class="mt-1 text-sm text-[#798892]">
                                {message.text}
                            </p>
                            {#if message.link}
                                <a href={message.link} class="mt-2 inline-block text-sm font-medium text-[#2c6dfa]">
                                    {message.link}
                                </a>
                            {/if}
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
        <form
            class="border-t border-[#d6dce1] px-5 py-4"
            on:submit|preventDefault={sendNewMessage}
        >
            <div class="flex items-center gap-3 rounded-2xl bg-[#f3f5f7] px-4 py-3">
                <input
                    type="text"
                    placeholder="Type a message"
                    bind:value={newText}
                    class="flex-1 bg-transparent text-sm text-[#3b4a56] placeholder-[#9ba7b0] focus:outline-none"
                />
                <button
                    type="submit"
                    class="flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-[#6d7c86] hover:text-[#3b4a56] disabled:opacity-40"
                    disabled={!newText.trim()}
                >
                    <img src={send} alt="Send message" class="h-4 w-4" />
                </button>
            </div>
        </form>
    </div>
{:else}
    <div class="flex flex-col w-full h-full bg-[#202124] rounded-md text-white ">
        <!-- Chat Header -->
        <div class="w-full h-12 bg-[#202124] rounded-t-md flex items-center px-4 border-b border-[#47484B]">
            <h2 class="font-medium text-base leading-6 text-white">Chat</h2>
        </div>

        <!-- Messages Container -->
        <div class="flex-grow flex flex-col gap-4 p-4 overflow-y-auto">
            <!-- AI Welcome Message -->
            {#if messages.length === 0}
                <div class="h-full flex items-center justify-center">
                    <p class="text-sm text-gray-400">No messages yet</p>
                </div>
            {/if}

            <!-- Message List -->
            {#each messages as message, index (message.timestamp ?? `${message.name}-${index}`)}
                <div 
                    transition:slide={{ easing: quintOut }} 
                    class="flex gap-3 mb-3"
                >
                    <!-- User or participant Avatar -->
                    {#if isCurrentUserMessage(message.name, name || $anonymousUser)}
                        <!-- User Message (right aligned) -->
                        <div class="flex gap-3 w-full justify-end">
                            <div class="max-w-[80%] bg-white text-black rounded-lg p-3 text-sm">
                                <p>{message.text}</p>
                            </div>
                            <div class="w-[40px] h-[40px] rounded-full bg-[#47484B] flex items-center justify-center">
                                <span class="text-white font-medium">{getInitials(message.name)}</span>
                            </div>
                        </div>
                    {:else}
                        <!-- participant Message (left aligned) -->
                        <div class="flex gap-3 w-full">
                            <div class="w-[40px] h-[40px] rounded-full bg-[#47484B] flex items-center justify-center">
                                <span class="text-white font-medium">{getInitials(message.name)}</span>
                            </div>
                            <div class="max-w-[80%] bg-[#7b7b7b] text-white rounded-lg p-3 text-sm">
                                <p>{message.text}</p>
                                {#if message.link}
                                    <a href={message.link} class="text-blue-400 underline mt-2 block">{message.link}</a>
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>

        <!-- Message Input -->
        <div class="p-4 border-t border-[#47484B]">
            <div class="flex items-center gap-2 bg-[#47484B] rounded-full px-4 py-2">
                <input 
                    type="text" 
                    placeholder="Send a message" 
                    bind:value={newText} 
                    on:keydown={(e) => {
                        if (e.key === 'Enter') {
                            sendNewMessage();
                        }
                    }}
                    class="flex-grow bg-transparent border-none outline-none text-white placeholder-gray-400 pr-2 w-[80%]" 
                />
                <button 
                    on:click={sendNewMessage}
                    class="text-white hover:bg-gray-700 rounded-full p-2 transition-colors duration-200 ease-in-out"
                    disabled={!newText.trim()}
                >
                    <SendHorizontal size={20} />
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .shadow-pulse-red {
        box-shadow: 0 0 0 0 rgba(255, 82, 82, 0.7);
    }
    @keyframes pulse-red {
        0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(255, 82, 82, 0.7);
        }
        70% {
            transform: scale(1);
            box-shadow: 0 0 0 10px rgba(255, 82, 82, 0);
        }
        100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(255, 82, 82, 0);
        }
    }
</style>