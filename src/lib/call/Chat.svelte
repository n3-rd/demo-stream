<script lang="ts">
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    import { chatMessages } from '../../store';
    import chat from './assets/chat.svg';
    import close from './assets/x.svg';
    import send from './assets/send.svg';
    import * as Sheet from "$lib/components/ui/sheet";
    import { MessageSquareDashed } from 'lucide-svelte';
    import { Button } from '$lib/components/ui/button';
    import { SendHorizontal } from 'lucide-svelte';
    import { sendMessage } from '$lib/helpers/sendMessage';
    export let roomId: string;

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
        
        const local = callObject.participants().local.user_name || 'Guest';
        const newMessage = {
            name: local,
            text: newText
        };

        // Send message using the sendMessage helper
        sendMessage(
            crypto.randomUUID(), // unique message ID
            Date.now(), // current timestamp
            JSON.stringify(newMessage),
            callObject.roomId // room ID from the call object
        );

        // Update local messages store
        chatMessages.update(messages => [...messages, newMessage]);
        newText = '';
    };

    const toggleChat = () => (chatIsOpen = !chatIsOpen);
</script>


        <div class="flex flex-col w-full h-full">
            <div class="flex-grow flex flex-col p-4 overflow-y-scroll">
                {#each messages as message}
                    <p transition:slide={{ easing: quintOut }} class="message">
                        <span class="text-gray-700 font-semibold">{message.name}</span>: {message.text}
                    </p>
                {/each}
            </div>
            <form on:submit|preventDefault={sendMessage} class="flex justify-between border-t border-gray-300 lg:p-4 py-4 space-x-3 w-full">
                <input type="text" placeholder="Type a message..." bind:value={newText} class="flex-grow border-none py-2 px-1 lg:px-4" />
                <Button type="submit" class="bg-primary border-none cursor-pointer ">
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