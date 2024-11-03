<script>
    export let roomIdentityName;
    export let isMicMuted;
    export let isCameraOff;
    import { Button } from "$lib/components/ui/button";
    import { Mic, MicOff, Settings, CameraOffIcon, CameraIcon, Monitor } from "lucide-svelte";
    import { createEventDispatcher } from "svelte";
    export let isScreenSharing = false;
    const dispatch = createEventDispatcher();
</script>
 <!-- Bottom controls bar -->
 <div
 class="absolute inset-x-0 bottom-0 h-16 bg-[#666669] w-full flex items-center justify-between px-14"
>
 <div class="room-name text-white">
     {roomIdentityName}
 </div>
 <div class="controls flex items-center gap-3">
     <button
         class="flex justify-center items-center rounded-full bg-[#707172] h-10 w-10 hover:bg-white hover:text-black"
         on:click={() => dispatch("toggleMicrophone")}
     >
         {#if isMicMuted}
             <MicOff
                 color="#fff"
                 size={24}
                 class="hover:text-black"
             />
         {:else}
             <Mic color="#fff" size={24} class="hover:text-black" />
         {/if}
     </button>
     <button
         class="flex justify-center items-center rounded-full bg-[#707172] h-10 w-10 hover:bg-white hover:text-black"
         on:click={() => dispatch("toggleCamera")}
     >
         {#if isCameraOff}
             <CameraOffIcon color="#fff" size={24} class="hover:text-black" />
         {:else}
             <CameraIcon color="#fff" size={24} class="hover:text-black" />
         {/if}
     </button>
     <Button
    variant="ghost"
    size="icon"
    class="h-12 w-12"
    on:click={() => dispatch('toggleScreenShare')}
>
    <Monitor class={isScreenSharing ? "text-red-500" : ""} />
</Button>
     <button
         class="flex justify-center items-center rounded-full bg-[#707172] h-10 w-10 hover:bg-white hover:text-black"
     >
         <Settings color="#fff" size={24} class="hover:text-black" />
     </button>
 </div>
 <div class="leave-room">
     <Button
         variant="destructive"
         class="hover:bg-red-700"
         on:click={() => dispatch("leaveRoom")}
     >
         Leave Room
     </Button>
 </div>
</div>