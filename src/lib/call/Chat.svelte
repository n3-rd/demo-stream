<script lang="ts">
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    import { tick } from 'svelte';
    import { chatMessages } from '$lib/stores/chatMessages';
    import { aiMessages } from '$lib/stores/aiMessages';
    import send from './assets/send.svg';
    import { SendHorizontal, X } from 'lucide-svelte';
    import { sendMessage } from '$lib/helpers/sendMessage';
	import { anonymousUser } from '$lib/stores/anonymousUser';
    import { isCurrentUserMessage, extractAndNormalizeName, getInitials } from '$lib/utils/chat';
    
    interface Props {
        roomId: string;
        name?: string | null;
        userId?: string | null;
        roomName?: string | null;
        variant?: 'default' | 'mobile';
        showClose?: boolean;
        userRole?: 'host' | 'guest' | 'representative';
        onclose?: () => void;
    }

    let {
        roomId,
        name = null,
        userId = null,
        roomName = null,
        variant = 'default',
        showClose = false,
        userRole = 'guest',
        onclose
    }: Props = $props();

    let newText = $state('');
    let chatIsOpen = false;
    let messages = $derived($chatMessages);
    let activeTab = $state('chat'); // 'chat' or 'ai'
    let aiLoading = $state(false);
    let messagesContainer = $state<HTMLElement | null>(null);
    // Input element refs — used to re-focus after send on iOS to prevent keyboard-dismissal
    // from disrupting the WebRTC data channel (iOS pauses the data channel during viewport resize).
    let mobileChatInputRef = $state<HTMLInputElement | null>(null);
    let mobileAiInputRef = $state<HTMLInputElement | null>(null);

    $effect(() => {
        // Accessing `messages` here registers it as a dependency so this effect
        // re-runs every time the message list changes, keeping the scroll at the bottom.
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        messages;
        if (messagesContainer) {
            // Wait for Svelte to flush DOM updates, then scroll.
            // tick() resolves after pending state changes are applied to the DOM,
            // which is more reliable on mobile Chrome than the double-rAF pattern
            // (rAF callbacks can be throttled or batched on mobile browsers,
            // causing the scroll to be skipped after subsequent messages).
            tick().then(() => {
                if (messagesContainer) {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            });
        }
    });


    const sendNewMessage = () => {
        if (!newText.trim()) return;

        if (activeTab === 'chat') {
            const local = name || $anonymousUser || 'User';
            const newMessage = {
                name: local,
                senderId: userId,
                text: newText,
                eventType: 'chat_message',
                timestamp: Date.now()
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
            // Re-focus the input so the virtual keyboard stays visible on iOS and Android.
            // Without this, tapping Send causes keyboard dismissal → viewport resize,
            // which disrupts the WebRTC data channel on iOS WKWebView and Android WebView.
            mobileChatInputRef?.focus();
        } else {
            const userMessage = {
                role: 'user',
                content: newText
            };

            const currentMessages = [...$aiMessages.map(msg => ({ role: msg.senderId === 'ai-bot' ? 'assistant' : 'user', content: msg.text })), userMessage];

            aiMessages.update(msgs => [...msgs, {
                name: name || $anonymousUser || 'User',
                senderId: userId,
                text: newText,
                eventType: 'chat_message',
                timestamp: Date.now()
            }]);

            newText = '';
            mobileAiInputRef?.focus();
            aiLoading = true;
            fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messages: currentMessages, roomId, roomName })
            })
            .then(response => response.json())
            .then(data => {
                const aiResponse = {
                    name: 'AI Chatbot',
                    senderId: 'ai-bot',
                    text: data.content,
                    eventType: 'chat_message',
                    timestamp: Date.now() + 1
                };
                aiMessages.update(msgs => [...msgs, aiResponse]);
            })
            .finally(() => { aiLoading = false; });
        }
    };

    const toggleChat = () => (chatIsOpen = !chatIsOpen);

    function handleClose() {
        onclose?.();
    }

    function handleEnterKey(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            sendNewMessage();
        }
    }
    
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
</script>

{#if variant === 'mobile'}
    <div class="flex flex-col bg-white text-[#3b4a56] rounded-t-2xl h-full max-h-full overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3 border-b border-[#d6dce1] text-xs">
            <div class="flex gap-2">
                <button class="px-2 py-1" onclick={() => activeTab = 'chat'} class:bg-black={activeTab === 'chat'} class:text-white={activeTab === 'chat'} class:text-black={activeTab !== 'chat'}>Chat with others</button>
                {#if userRole !== 'representative'}
                <button class="px-2 py-1" onclick={() => activeTab = 'ai'} class:bg-black={activeTab === 'ai'} class:text-white={activeTab === 'ai'} class:text-black={activeTab !== 'ai'}>AI Chatbot</button>
                {/if}
            </div>
            {#if showClose}
                <button
                    class="text-[#3b4a56] hover:text-[#1f2933] transition-colors"
                    type="button"
                    onclick={handleClose}
                >
                    <X size={22} strokeWidth={2.5} />
                </button>
            {/if}
        </div>
        {#if activeTab === 'chat'}
        <div bind:this={messagesContainer} class="mobile-chat-scroll overflow-y-auto overflow-x-hidden px-5 py-3 space-y-4" style="flex: 1 1 0; min-height: 0;">
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
        <div class="border-t border-[#d6dce1] px-4 py-2">
            <div class="flex items-center gap-2 rounded-2xl bg-[#f3f5f7] px-3 py-2">
                <input
                    bind:this={mobileChatInputRef}
                    type="text"
                    placeholder="Type a message"
                    bind:value={newText}
                    onkeydown={handleEnterKey}
                    class="flex-1 bg-transparent text-[14px] text-[#3b4a56] placeholder-[#9ba7b0] focus:outline-none"
                />
                <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-full text-neutral disabled:opacity-40"
                    disabled={!newText.trim()}
                    onclick={sendNewMessage}
                >
                    <img src={send} alt="Send message" class="h-4 w-4" />
                </button>
            </div>
        </div>
        {:else}
        <!-- AI Chatbot -->
        <div class="mobile-chat-scroll overflow-y-auto overflow-x-hidden px-5 py-3 space-y-4" style="flex: 1 1 0; min-height: 0;">
            {#each $aiMessages as message, index (message.timestamp ?? `${message.name}-${index}`)}
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
            {#if aiLoading}
                <div class="flex gap-4">
                    <div
                        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={`background:${getAvatarColor('AI Chatbot')}`}
                    >
                        {getInitials('AI Chatbot')}
                    </div>
                    <div class="flex-1 flex items-center gap-1 py-2 text-[#798892]">
                        <span class="ai-typing-dot"></span>
                        <span class="ai-typing-dot"></span>
                        <span class="ai-typing-dot"></span>
                    </div>
                </div>
            {/if}
        </div>
        <div class="border-t border-[#d6dce1] px-5 py-4">
            <div class="flex items-center gap-3 rounded-2xl bg-[#f3f5f7] px-4 py-3">
                <input
                    bind:this={mobileAiInputRef}
                    type="text"
                    placeholder="Type a message"
                    bind:value={newText}
                    onkeydown={handleEnterKey}
                    class="flex-1 bg-transparent text-[16px] text-[#3b4a56] placeholder-[#9ba7b0] focus:outline-none"
                />
                <button
                    type="button"
                    class="flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-[#6d7c86] hover:text-[#3b4a56] disabled:opacity-40"
                    disabled={!newText.trim() || aiLoading}
                    onclick={sendNewMessage}
                >
                    <img src={send} alt="Send message" class="h-4 w-4" />
                </button>
            </div>
        </div>
        {/if}
    </div>
{:else}
    <div class="flex flex-col w-full h-full bg-[#202124] rounded-md text-white ">
        <!-- Chat Header -->
        <div class="w-full h-12 bg-[#202124] rounded-t-md flex items-center px-4 border-b border-[#47484B] text-xs">
            <div class="flex gap-2">
                <button class="px-3 py-1" onclick={() => activeTab = 'chat'} class:bg-white={activeTab === 'chat'} class:text-black={activeTab === 'chat'} class:text-white={activeTab !== 'chat'}>Chat with others</button>
                {#if userRole !== 'representative'}
                <button class="px-3 py-1" onclick={() => activeTab = 'ai'} class:bg-white={activeTab === 'ai'} class:text-black={activeTab === 'ai'} class:text-white={activeTab !== 'ai'}>AI Chatbot</button>
                {/if}
            </div>
        </div>

        {#if activeTab === 'chat'}
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
                    {#if isCurrentUserMessage(message.name, name || $anonymousUser, message.senderId, userId)}
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
                    onkeydown={(e) => {
                        if (e.key === 'Enter') {
                            sendNewMessage();
                        }
                    }}
                    class="flex-grow bg-transparent border-none outline-none text-white placeholder-gray-400 pr-2 w-[80%]" 
                />
                <button 
                    onclick={sendNewMessage}
                    class="text-white hover:bg-gray-700 rounded-full p-2 transition-colors duration-200 ease-in-out"
                    disabled={!newText.trim()}
                >
                    <SendHorizontal size={20} />
                </button>
            </div>
        </div>
        {:else}
        <!-- AI Chatbot -->
        <div class="flex-grow flex flex-col gap-4 p-4 overflow-y-auto">
            {#each $aiMessages as message, index (message.timestamp ?? `${message.name}-${index}`)}
                <div 
                    transition:slide={{ easing: quintOut }} 
                    class="flex gap-3 mb-3"
                >
                    <!-- User or participant Avatar -->
                    {#if isCurrentUserMessage(message.name, name || $anonymousUser, message.senderId, userId)}
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
            {#if aiLoading}
                <div class="flex gap-3 mb-3">
                    <div class="w-[40px] h-[40px] rounded-full bg-[#47484B] flex items-center justify-center shrink-0">
                        <span class="text-white font-medium">{getInitials('AI Chatbot')}</span>
                    </div>
                    <div class="max-w-[80%] bg-[#7b7b7b] text-white rounded-lg p-3 text-sm flex items-center gap-1 min-h-[44px]">
                        <span class="ai-typing-dot"></span>
                        <span class="ai-typing-dot"></span>
                        <span class="ai-typing-dot"></span>
                    </div>
                </div>
            {/if}
        </div>
        <div class="p-4 border-t border-[#47484B]">
            <div class="flex items-center gap-2 bg-[#47484B] rounded-full px-4 py-2">
                <input 
                    type="text" 
                    placeholder="Send a message" 
                    bind:value={newText} 
                    onkeydown={(e) => {
                        if (e.key === 'Enter') {
                            sendNewMessage();
                        }
                    }}
                    class="flex-grow bg-transparent border-none outline-none text-white placeholder-gray-400 pr-2 w-[80%]" 
                />
                <button 
                    onclick={sendNewMessage}
                    class="text-white hover:bg-gray-700 rounded-full p-2 transition-colors duration-200 ease-in-out disabled:opacity-40"
                    disabled={!newText.trim() || aiLoading}
                >
                    <SendHorizontal size={20} />
                </button>
            </div>
        </div>
        {/if}
    </div>
{/if}

<style>
    .mobile-chat-scroll {
        -webkit-overflow-scrolling: touch;
        overflow-y: scroll;
        overscroll-behavior-y: contain;
        touch-action: pan-y;
        /* Visible scrollbar on mobile */
        scrollbar-width: thin;
        scrollbar-color: #c4c4c4 transparent;
    }
    .mobile-chat-scroll::-webkit-scrollbar {
        width: 5px;
    }
    .mobile-chat-scroll::-webkit-scrollbar-track {
        background: transparent;
    }
    .mobile-chat-scroll::-webkit-scrollbar-thumb {
        background-color: #c4c4c4;
        border-radius: 10px;
    }
    .ai-typing-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        opacity: 0.6;
        animation: ai-typing-bounce 1.4s ease-in-out infinite both;
    }
    .ai-typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .ai-typing-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes ai-typing-bounce {
        0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
        40% { transform: scale(1.2); opacity: 1; }
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