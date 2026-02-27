<script lang="ts">
    import { page } from '$app/stores';
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from '$lib/components/ui/button';
    import { useForm, HintGroup, Hint, validators, required, url } from 'svelte-use-form';
    import HintValidate from '$lib/components/layout/hint-validate.svelte';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import { goto } from '$app/navigation';
    import ScheduleMeeting from '../room/schedule-meeting.svelte';
    import InviteRepresentative from '../room/invite-representative.svelte';
	import { onMount } from 'svelte';
	import { currentVideoUrl } from '$lib/callStores';

    export let loggedIn = false;
    export let user;
    export let inRoom;
    let isMenuOpen = false;
    let pageRoute = $page;
    let isInMeeting: boolean;
    let representatives = [];
    let isJoinDialogOpen = false;

    $: {
        console.log('route',pageRoute);
        console.log('currentVideoUrl', $currentVideoUrl);
        // isInMeeting = pageRoute.pathname.includes('room');
    }




    function toggleMenu() {
        isMenuOpen = !isMenuOpen;
    }

    const form = useForm();
</script>

{#if !inRoom}
<div class="navbar flex items-center justify-between bg-white px-4 pl-14 lg:pl-9 py-4 md:py-7 drop-shadow-xl z-[9999] fixed w-full">
    <a class="logo" href="/">
        <img src="/logo/main-logo.svg" alt="clearsky" class="h-9 w-[131px]" />
    </a>

    <div class="flex items-center gap-4">

     
        <form
        method='POST'
        on:submit|preventDefault={async (e) => {
            const formData = new FormData(e.target);
            
            try {
                const response = await fetch('/api/room/create', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success && result.room?.room_id) {
                    toast.success('Room created successfully');
                    goto(`/room/${result.room.room_id}`);
                } else {
                    toast.error(result.message || 'Failed to create room');
                }
            } catch (error) {
                console.error('Error:', error);
                toast.error('Failed to create room');
            }
        }}
    >
    
    <Button class="bg-[#ECEFF3] text-primary hover:text-white" type="submit"
    disabled={$currentVideoUrl == ''}
    >
        Create Room
    </Button>
    </form>
    
    <Button class="bg-red-500 text-white hover:bg-red-700" 
    href="/logout"
    >
        Logout
    </Button>
    
    </div>

 </div>
{/if} 