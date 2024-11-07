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
</script>


        <div class="flex flex-col w-full h-full">
            <div class="flex-grow flex flex-col gap-4 p-4 overflow-y-auto">
                {#each messages as message}
                    <div 
                        transition:slide={{ easing: quintOut }} 
                        class="flex gap-2 {message.name === (name || $anonymousUser) ? 'flex-row-reverse' : 'flex-row'}"
                    >
                        <img 
                            class="h-12 w-12 rounded-full" 
                            src={`https://ui-avatars.com/api/?name=${message.name}`} 
                            alt="avatar"
                        />
                        <div class="flex flex-col flex-1 gap-1">
                            <div 
                                class="flex flex-col rounded-xl text-sm {
                                    message.name === (name || $anonymousUser) 
                                        ? 'bg-[#d8e1ed] text-black' 
                                        : 'bg-[#9d9d9f] text-white'
                                } flex-1 px-2 py-2"
                            >
                                <div class="text-lg font-medium py-3">{message.name}</div>
                                <div>
                                    <p>{message.text}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
            <form on:submit|preventDefault={sendNewMessage} class="flex justify-between border-t border-gray-300 py-4 w-full">
                <input 
                    type="text" 
                    placeholder="Type a message..." 
                    bind:value={newText} 
                    class="flex-grow border-none py-2 px-1 lg:px-4 w-full" 
                />
                <Button type="submit" class="bg-primary border-none cursor-pointer">
                    <SendHorizontal class="w-6 h-6" />
                </Button>
            </form>
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