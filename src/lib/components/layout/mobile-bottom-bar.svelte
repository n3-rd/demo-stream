<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { MessageSquareDashed, Mic, MicOff, Settings, CameraOffIcon, CameraIcon, Monitor, UsersRound, EllipsisVertical, PhoneOff, ShareIcon } from "lucide-svelte";
    import { createEventDispatcher } from "svelte";
    import * as Sheet from "$lib/components/ui/sheet";
    import * as Dialog from "$lib/components/ui/dialog";
	import Share from "../room/share.svelte";
	import InviteRepresentative from "../room/invite-representative.svelte";
	import ScheduleMeeting from "../room/schedule-meeting.svelte";
	import Notes from "../room/notes.svelte";
	import CreateQuote from "../room/create-quote.svelte";



    export let roomIdentityName: string;
    export let isMicMuted: boolean;
    export let isCameraOff: boolean;
    export let isScreenSharing = false;
    export let joinURL: string;
    export let scheduleOpen;
    export let userId: string;
    export let videoRepresentatives: string[];
    const dispatch = createEventDispatcher();

    function togglePanel(id: string) {
        dispatch('togglePanel', { id });
    }
</script>

<div class="px-4 flex justify-center items-center">
    <div class="lg:hidden fixed bottom-4 left-0 right-0 bg-[#666669] py-6 px-4 w-[94%] mx-auto rounded-2xl">
        <div class="flex justify-between items-center">
            <!-- Left side controls -->
            <div class="flex gap-3">
                <button
                    class="flex justify-center items-center rounded-full bg-[#707172] h-10 w-14 hover:bg-white hover:text-black"
                    on:click={() => dispatch("toggleMicrophone")}
                >
                    {#if isMicMuted}
                        <MicOff color="#fff" size={24} class="hover:text-black" />
                    {:else}
                        <Mic color="#fff" size={24} class="hover:text-black" />
                    {/if}
                </button>
    
                <button
                    class="flex justify-center items-center rounded-full bg-[#707172] h-10 w-14 hover:bg-white hover:text-black"
                    on:click={() => dispatch("toggleCamera")}
                >
                    {#if isCameraOff}
                        <CameraOffIcon color="#fff" size={24} class="hover:text-black" />
                    {:else}
                        <CameraIcon color="#fff" size={24} class="hover:text-black" />
                    {/if}
                </button>
          
    
            <!-- Center controls -->
          
                <button
                    class="flex justify-center items-center rounded-full bg-[#707172] h-10 w-14 hover:bg-white hover:text-black"
                    on:click={() => togglePanel("chatPanel")}
                >
                    <MessageSquareDashed color="#fff" size={24} class="hover:text-black" />
                </button>
    
              

                <Sheet.Root>
                    <Sheet.Trigger>
                        <EllipsisVertical color="#fff" size={24} class="hover:text-black" />
                    </Sheet.Trigger>
                    <Sheet.Content side="bottom" class="bg-[#666669] p-6 text-white">
                    <div class="grid grid-cols-3 gap-y-4">
                        <div class="flex flex-col gap-2">
                            <Button
                            variant="ghost"
                            size="icon"
                            class="w-full "
                            on:click={() => togglePanel("chatPanel")}
                        >
                            <MessageSquareDashed scale={1.3} color="#fff" />
                        </Button>
                        <div class="text-center text-xs">Open Chat</div>
                        </div>

                        <div class="flex flex-col gap-2">
                            <Button 
                            variant="ghost"
                            size="icon"
                            class="w-full "
                            on:click={() => togglePanel("participantsPanel")}
                        >
                            <UsersRound scale={1.3} color="#fff" />
                        </Button>
                        <div class="text-center text-xs">Participants</div>
                        </div>

                        <div class="flex flex-col gap-2">
                            <Dialog.Root>
                                <Dialog.Trigger class="flex flex-col gap-2 items-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        class="w-full "
                                    >
                                        <ShareIcon scale={1.3} color="#fff" />
                                    </Button>
                                    <div class="text-center text-xs">Invite People</div>
                                </Dialog.Trigger>
                                <Dialog.Content class="p-4 rounded-lg shadow-lg">
                                    <Share {joinURL} representative={false} />
                                </Dialog.Content>
                            </Dialog.Root>
                        </div>
                        
                        <div class="flex flex-col gap-2">
                            <Dialog.Root>
                                <Dialog.Trigger class="flex flex-col gap-2 items-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        class="w-full "
                                    >
                                        <img
                                            src="/icons/icon-representative.svg"
                                            alt="user"
                                            class="w-5 h-5"
                                        />
                                    </Button>
                                    <div class="text-center text-xs">Speak to Representative</div>
                                </Dialog.Trigger>
                                <Dialog.Content class="p-4 rounded-lg shadow-lg">
                                    <InviteRepresentative
                                        representatives={videoRepresentatives}
                                    />
                                </Dialog.Content>
                            </Dialog.Root>
                        </div>

                        <div class="flex flex-col gap-2">
                        <Dialog.Root bind:open={scheduleOpen}>
                            <Dialog.Trigger class="flex flex-col gap-2 items-center">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    class="w-full "
                                >
                                    <img
                                        src="/icons/icon-calendar.svg"
                                        alt="calendar"
                                        class="w-5 h-5"
                                    />
                                </Button>
                                <div class="text-center text-xs">Book Appointment</div>
                            </Dialog.Trigger>
                            <Dialog.Content
                                class="p-4 rounded-lg w-auto bg-transparent flex flex-col gap-2"
                            >
                                <div class="w-full bg-transparent" >
                                    <ScheduleMeeting
                                        userId={userId || ''}
                                        on:close={() => dispatch("closeSchedule")}
                                    />
                                </div>
                            </Dialog.Content>
                            </Dialog.Root>
                        </div>

                        <div class="flex flex-col gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                class="w-full "
                            >
                                <Notes />
                            </Button>
                            <div class="text-center text-xs">Notes</div>
                        </div>

                        <div class="flex flex-col gap-2">
                            <Dialog.Root>
                                <Dialog.Trigger class="flex flex-col gap-2 items-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        class="w-full "
                                    >
                                        <img
                                            src="/icons/icon-quotes.svg"
                                            alt="quote"
                                            class="w-5 h-5"
                                        />
                                    </Button>
                                    <div class="text-center text-xs">Request a Quote</div>
                                </Dialog.Trigger>
                                <Dialog.Content class="rounded-lg bg-transparent">
                                    <CreateQuote />
                                </Dialog.Content>
                            </Dialog.Root>
                        </div>

                      
                    </div>
                    </Sheet.Content>
                  </Sheet.Root>
            </div>
    
            <!-- Right side controls -->
            <div class="flex gap-3">
               
    
                <Button
                    variant="destructive"
                    size="sm"
                    class="flex justify-center items-center rounded-full h-10 w-16 hover:bg-red-700"
                    on:click={() => dispatch("leaveRoom")}
                >
                 <PhoneOff color="#fff" size={24} class="hover:" />
                </Button>
            </div>
        </div>
    </div> 
</div>
