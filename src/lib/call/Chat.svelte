<script lang="ts">
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    import { chatMessages } from '$lib/stores/chatMessages';
    import chat from './assets/chat.svg';
    import close from './assets/x.svg';
    import send from './assets/send.svg';
    import * as Sheet from "$lib/components/ui/sheet";
    import { MessageSquareDashed } from 'lucide-svelte';
    import { Button } from '$lib/components/ui/button';
    import { SendHorizontal } from 'lucide-svelte';
    import { sendMessage } from '$lib/helpers/sendMessage';
	import { anonymousUser } from '$lib/stores/anonymousUser';
    export let roomId: string;
    export let name: string | null = null;

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
    
    // Helper function to check if a message is from the current user
    // Uses the same logic as representative-indicator.svelte for consistency
    function isCurrentUserMessage(messageName: string, currentUserName: string): boolean {
        if (!messageName || !currentUserName) return false;
        
        // Direct match
        if (messageName === currentUserName) return true;
        
        // Extract and normalize names using representative indicator logic
        const normalizedMessageName = extractAndNormalizeName(messageName);
        const normalizedCurrentName = extractAndNormalizeName(currentUserName);
        
        // Compare normalized names
        return normalizedMessageName === normalizedCurrentName;
    }
    
    // Extract name from various formats (streamId, displayName, etc.) like representative-indicator
    function extractAndNormalizeName(nameOrId: string): string {
        if (!nameOrId) return '';
        
        let cleanName = nameOrId;
        
        // If it looks like a stream ID (contains dash), extract the last part
        if (nameOrId.includes('-')) {
            cleanName = nameOrId.split('-').pop() || '';
        }
        
        // Remove "_representative" suffix and normalize underscores to spaces
        cleanName = cleanName.replace(/_+representative$/i, '').replace(/_/g, ' ').trim();
        
        return cleanName.toLowerCase();
    }
    
    function getInitials(name: string): string {
        if (!name || name.trim() === '') return 'UN';
        
        // Use the same extraction logic as representative indicator
        const cleanName = extractAndNormalizeName(name);
        if (!cleanName) return 'UN';
        
        // Split by spaces and hyphens (underscores already converted to spaces)
        const parts = cleanName.split(/[\s-]+/).filter(part => part.length > 0);
        
        if (parts.length >= 2) {
            // Take first letter of first two parts
            return (parts[0][0] + parts[1][0]).toUpperCase();
        } else if (parts.length === 1 && parts[0].length >= 2) {
            // Take first two letters of single part
            return parts[0].substring(0, 2).toUpperCase();
        } else if (parts.length === 1 && parts[0].length === 1) {
            // Single character, duplicate it
            return (parts[0][0] + parts[0][0]).toUpperCase();
        }
        
        return 'UN';
    }
</script>

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
        {#each messages as message}
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