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
        
        const local = name || $anonymousUser;
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
    
    function getInitials(name: string): string {
        if (!name) return 'UN';
        const parts = name.split(/[_\s-]+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
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
                {#if message.name === (name || $anonymousUser)}
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
        <form on:submit|preventDefault={sendNewMessage} class="flex items-center gap-2 bg-[#47484B] rounded-full px-4 py-2">
            <input 
                type="text" 
                placeholder="Send a message" 
                bind:value={newText} 
                class="flex-grow bg-transparent border-none outline-none text-white placeholder-gray-400" 
            />
            <button type="submit" class="w-8 h-8 flex items-center justify-center text-white">
                <SendHorizontal size={18} />
            </button>
        </form>
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