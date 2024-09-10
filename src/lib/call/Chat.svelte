<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    import { chatMessages } from '../../store';
    import chat from './assets/chat.svg';
    import close from './assets/x.svg';
    import send from './assets/send.svg';
    import * as Sheet from "$lib/components/ui/sheet";
    import { MessageSquareDashed } from 'lucide-svelte';

    const dispatch = createEventDispatcher();

    export let callObject;
    export let hasNewNotification;
    let newText = '';
    let chatIsOpen = false;

    $: {
        if (hasNewNotification && chatIsOpen) {
            dispatch('clear-notification');
        }
    }

    const sendMessage = () => {
        if (!callObject) return;
        const local = callObject.participants().local.user_name || 'Guest';
        const newMessage = {
            name: local,
            text: newText
        };
        callObject.sendAppMessage(newMessage);
        chatMessages.update(messages => [...messages, newMessage]);
        newText = '';
    };

    const toggleChat = () => (chatIsOpen = !chatIsOpen);
</script>

<Sheet.Root>
    <Sheet.Trigger>
        <button on:click={toggleChat} class="p-2">
           <MessageSquareDashed class="w-6 h-6" />
        </button>
    </Sheet.Trigger>
    <Sheet.Content>
        <Sheet.Header>
            <Sheet.Title class="text-xl font-bold">Chat</Sheet.Title>
            <Sheet.Description>
                {#if hasNewNotification}
                    <span class="absolute top-0 right-0 bg-red-500 shadow-pulse-red rounded-full m-1 h-4 w-4 animate-pulse" />
                {/if}
            </Sheet.Description>
        </Sheet.Header>
        <div class="flex flex-col w-full h-full">
            <div class="flex-grow flex flex-col p-4 overflow-y-scroll">
                {#each $chatMessages as message}
                    <p transition:slide={{ easing: quintOut }} class="message">
                        <span class="text-gray-700 font-semibold">{message.name}</span>: {message.text}
                    </p>
                {/each}
            </div>
            <form on:submit|preventDefault={sendMessage} class="flex justify-between border-t border-gray-300 p-4">
                <input type="text" placeholder="Type a message..." bind:value={newText} class="flex-grow border-none" />
                <button type="submit" class="bg-transparent border-none cursor-pointer">
                    <img src={send} alt="send message" class="w-6 h-6" />
                </button>
            </form>
        </div>
    </Sheet.Content>
</Sheet.Root>

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