<script>
    export let roomIdentityName;
    export let isMicMuted;
    export let isCameraOff;
    import { Button } from "$lib/components/ui/button";
    import { Mic, MicOff, Settings, CameraOffIcon, CameraIcon, Monitor, Volume2, VolumeX } from "lucide-svelte";
    import { createEventDispatcher } from "svelte";
    export let isScreenSharing = false;
    export let isVideoMuted = false;
    export let videoVolume = 1.0; // Default to 100%
    const dispatch = createEventDispatcher();
    
    function handleVolumeChange(event) {
        const newVolume = parseFloat(event.target.value);
        dispatch('volumeChange', { volume: newVolume });
    }
</script>
 <!-- Bottom controls bar -->
 <div
 class="absolute inset-x-0 bottom-0 h-16 bg-[#666669] w-full flex items-center justify-between px-14"
>
 <div class="room-name text-white font-extrabold ">
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

     <button
         class="flex justify-center items-center rounded-full bg-[#707172] h-10 w-10 hover:bg-white hover:text-black"
         on:click={() => dispatch("toggleVideoMute")}
     >
         {#if isVideoMuted}
             <VolumeX color="#fff" size={24} class="hover:text-black" />
         {:else}
             <Volume2 color="#fff" size={24} class="hover:text-black" />
         {/if}
     </button>
     
     <!-- Volume Adjustment Slider -->
     <div class="flex items-center bg-[#707172] rounded-full px-2 h-10">
         <Volume2 color="#fff" size={16} />
         <input 
             type="range" 
             min="0" 
             max="1" 
             step="0.01" 
             bind:value={videoVolume}
             class="w-20 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
             on:input={handleVolumeChange}
         />
     </div>

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

<style>
    /* Custom styling for the volume slider */
    input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        height: 4px;
    }
    
    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        background: white;
        border-radius: 50%;
        cursor: pointer;
    }
    
    input[type="range"]::-moz-range-thumb {
        width: 12px;
        height: 12px;
        background: white;
        border-radius: 50%;
        cursor: pointer;
    }
</style>