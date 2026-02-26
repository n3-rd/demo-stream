<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { MessageSquareDashed, UsersRound } from "lucide-svelte";
    import { createEventDispatcher, onMount, onDestroy } from "svelte";
	import { chatMessages } from "$lib/stores/chatMessages";
    import { browser } from "$app/environment";
    import { isCurrentUserMessage } from "$lib/utils/chat";
    import { anonymousUser } from "$lib/stores/anonymousUser";

    const dispatch = createEventDispatcher();
    export let participants: any[];
    export let isHost: boolean;
    export let name: string;
    export let shareURL: string;
    export let roomId: string = "";
    export let userId: string | null = null;
    export let users: any[] = [];
    export let isChatOpen: boolean = false;
    export let isParticipantsOpen: boolean = false;
    export let participantCount: number = 0;
    
    let unreadCount = 0;
    let lastMessageCount = 0;
    let unsubscribe: () => void;

    onMount(() => {
        if (browser && "Notification" in window) {
            Notification.requestPermission();
        }

        unsubscribe = chatMessages.subscribe(messages => {
            if (messages.length > lastMessageCount) {
                // New message arrived
                const newMessages = messages.slice(lastMessageCount);
                
                // If chat is closed, increment unread count
                if (!isChatOpen) {
                    const incomingMessages = newMessages.filter(msg => {
                        return !isCurrentUserMessage(msg.name, name || $anonymousUser, msg.senderId, userId);
                    });
                    
                    if (incomingMessages.length > 0) {
                        unreadCount += incomingMessages.length;
                        
                        // Browser notification
                        if (browser && Notification.permission === "granted") {
                            incomingMessages.forEach(msg => {
                                new Notification(`New message from ${msg.name}`, {
                                    body: msg.text,
                                    icon: "/favicon.png"
                                });
                            });
                        }
                    }
                }
            }
            lastMessageCount = messages.length;
        });
    });

    $: if (isChatOpen) {
        unreadCount = 0;
    }

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
    });

    function togglePanel(id: string) {
        dispatch("togglePanel", { id });
    }

    console.log("name from right-bar.svelte", name);
</script>

<div class="flex flex-col gap-3 h-full justify-end">
    <!-- Right sidebar (Chat) -->
    <div
        class="w-14 h-auto bg-red flex flex-col gap-4 justify-end items-center"
    >
        <Button
            variant="ghost"
            size="icon"
            class="w-full hover:bg-red-700 relative"
            id="chat-button"
            on:click={() => togglePanel("chatPanel")}
        >
            <img src="/icons/icon-chat.svg" alt="Chat" class="w-9 h-9" />
            {#if unreadCount > 0}
                <span class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            {/if}
        </Button>
      <p class="text-white text-sm">Chat</p>
    </div>

    <!-- Right sidebar (Participants) -->
    <div
        class="w-14 h-auto bg-red flex flex-col gap-4 justify-end items-center"
    >
        <Button
            variant="ghost"
            size="icon"
            class="w-full hover:bg-red-700 relative"
            id="participants-button"
            on:click={() => togglePanel("participantsPanel")}
        >
            <div class="absolute -top-2 left-8 w-6 h-6 flex items-center justify-center bg-[#47484b] text-white rounded-full">
                {participantCount}
            </div>
            <img src="/icons/icon-participants.svg" alt="Participants" class="w-11 h-11" />
        </Button>
      <p class="text-white text-sm">Users</p>
    </div>
</div>

<style>
    .bg-red {
        /* Keep red background if that's what's intended, but usually these are transparent or dark */
    }
</style>