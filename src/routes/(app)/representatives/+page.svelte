<script lang="ts">

    import { Button } from "$lib/components/ui/button";
    import { PUBLIC_POCKETBASE_INSTANCE } from "$env/static/public";
    import { Dialog, DialogContent, DialogHeader, DialogTitle } from "$lib/components/ui/dialog";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { toast } from "svelte-sonner";
    import { enhance } from "$app/forms";
    import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-svelte";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import Sidenav from '$lib/components/layout/sidenav.svelte';
	import { goto, invalidateAll } from "$app/navigation";
    import { useForm, HintGroup, Hint, validators, email, required } from 'svelte-use-form';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    import HintValidate from '$lib/components/layout/hint-validate.svelte';
    import * as Select from "$lib/components/ui/select";
    import PocketBase from 'pocketbase';

    interface ErrorData {
        message: string;
    }

    interface SelectEvent {
        value: string;
    }

    const pb = new PocketBase(PUBLIC_POCKETBASE_INSTANCE);

    export let data;
    $: ({ representatives, locations, rooms } = data || {});

    let showAddDialog = false;
    let editingRep: any = null;
    let expandedRep: string | null = null;
    let selectedLocation: string = '';
    const form = useForm();

    function toggleExpand(id: string) {
        expandedRep = expandedRep === id ? null : id;
        if (expandedRep) {
            loadConnectedRooms(expandedRep);
        }
    }

    $: {
        if (editingRep) {
            selectedLocation = editingRep.location || '';
        } else {
            selectedLocation = '';
        }
    }

    let connectedRoomsMap: Record<string, any[]> = {};

    // Function to get rooms connected to a representative
    async function loadConnectedRooms(repId: string) {
        try {
            const records = await pb.collection('rooms').getFullList({
                filter: `representative.id ?= "${repId}"`,
                sort: '-created',
            });
            connectedRoomsMap[repId] = records;
        } catch (error) {
            console.error('Error loading connected rooms:', error);
            connectedRoomsMap[repId] = [];
        }
    }

    function handleLocationChange(e: SelectEvent | null) {
        selectedLocation = e?.value || '';
    }

    function resetForm() {
        // Reset all form inputs
        const form = document.querySelector('form');
        if (form) {
            form.reset();
        }
        // Reset any bound variables
        editingRep = null;
        selectedLocation = '';
    }

    function handleFormResult(result: any) {
        if (result.type === 'success') {
            showAddDialog = false;
            invalidateAll();
            resetForm();
            toast.success(editingRep ? 'Representative updated successfully' : 'Representative added successfully');
        } else if (result.type === 'failure' && result.data) {
            const message = (result.data as ErrorData).message;
            toast.error(message || 'Failed to process representative');
        } else {
            toast.error('Failed to process representative');
        }
    }
</script>

<div class="flex bg-[#eceef3]">
    <Sidenav activePage="representatives" />

    <div class="flex-1 overflow-auto mt-[6rem]">
        <div class="p-6">
            <div class="flex justify-between items-center mb-6 bg-white rounded-lg p-4">
                <h1 class="text-2xl  font-medium text-[#737373]">Representatives</h1>
                <Button 
                    class="bg-[#4B77BE] hover:bg-[#4B77BE]/90 text-white "
                    href="/representatives/new"
                >
                    Add Representative
                </Button>
            </div>

            <div class="rounded-lg ">
                <!-- Table Header -->
                <div class="grid grid-cols-[80px_1fr_1fr_1fr_1fr_100px] gap-4 p-4 border-b text-sm  text-[#737373] bg-white rounded-lg mb-5 font-bold">
                    <div>Icon</div>
                    <div>Name</div>
                    <div>Phone</div>
                    <div>Email</div>
                    <div>Location</div>
                    <div></div>
                </div>

                <!-- Table Body -->
                {#each representatives as rep}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div class="bg-white rounded-lg mb-4"
                 
                    
                    >
                        <!-- Main Row -->
                        <div class="grid grid-cols-[80px_1fr_1fr_1fr_1fr_100px] gap-y-4 p-4 items-center">
                            <div>
                                {#if rep.avatar}
                                    <img
                                        src={`${PUBLIC_POCKETBASE_INSTANCE}api/files/representatives/${rep.id}/${rep.avatar}`}
                                        alt={rep.name}
                                        class="w-10 h-10 rounded-full object-cover"
                                    />
                                {:else}
                                    <div class="w-10 h-10 rounded-full bg-[#E0E8F5] flex items-center justify-center">
                                        <span class="text-lg  text-[#737373]">
                                            {rep.name[0].toUpperCase()}
                                        </span>
                                    </div>
                                {/if}
                            </div>
                            <div class="text-[#737373]  text-[14px]">{rep.name}</div>
                            <div class="text-[#737373]  text-[14px]">{rep.phone}</div>
                            <div class="text-[#737373]  text-[14px]">{rep.email}</div>
                            <div class="text-[#737373]  text-[14px]">
                                {#if rep.expand?.location}
                                    {rep.expand.location.name}
                                {:else if rep.location}
                                    {locations.find(loc => loc.id === rep.location)?.name || rep.location}
                                {:else}
                                    -
                                {/if}
                            </div>
                            <div class="flex items-center justify-end gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    class=" p-0 bg-[#EFEFEF] text-[#726F6F] py-1 px-3"
                                    on:click={(e) => {
                                        e.stopPropagation();
                                        goto(`/representatives/edit/${rep.id}`)
                                    }}
                                >
                                   Edit
                                </Button>
                        
                                        <Button 
                                            variant="ghost"
                                            size="sm"
                                            class="h-8 w-8 p-0"
                                            on:click={() => toggleExpand(rep.id)}
                                        >
                                            <MoreHorizontal class="h-4 w-4" />
                                        </Button>
                                   
                            </div>
                        </div>

                        <!-- Expanded Content -->
                        {#if expandedRep === rep.id}
                            <div class="px-4 pb-4"
                            transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}
                            >
                                <div class="grid grid-cols-2 gap-6">
                                    <!-- Schedule -->
                                    <div class="bg-white rounded-lg p-6">
                                        <h3 class=" font-semibold text-[18px] text-[#737373] mb-4">Schedule</h3>
                                        <div class="bg-[#E0E8F5] rounded-[3px] p-4">
                                            <div class="grid grid-cols-[auto_1fr] gap-x-4 text-[14px] ">
                                                <div class="space-y-[10px] text-[#808080]">
                                                    <div>Monday</div>
                                                    <div>Tuesday</div>
                                                    <div>Wednesday</div>
                                                    <div>Thursday</div>
                                                    <div>Friday</div>
                                                    <div>Saturday</div>
                                                    <div>Sunday</div>
                                                </div>
                                                <div class="space-y-[10px] text-[#808080]">
                                                    <div>{rep.schedule?.monday || '8:00AM - 5:00PM'}</div>
                                                    <div>{rep.schedule?.tuesday || '8:00AM - 5:00PM'}</div>
                                                    <div>{rep.schedule?.wednesday || '8:00AM - 5:00PM'}</div>
                                                    <div>{rep.schedule?.thursday || '8:00AM - 5:00PM'}</div>
                                                    <div>{rep.schedule?.friday || '8:00AM - 5:00PM'}</div>
                                                    <div>{rep.schedule?.saturday || '9:00AM - 3:00PM'}</div>
                                                    <div>{rep.schedule?.sunday || 'Closed'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Connected Rooms -->
                                    <div class="bg-white rounded-lg p-6">
                                        <h3 class=" font-semibold text-[18px] text-[#737373] mb-4">Room Connected to:</h3>
                                        <div class="bg-[#E0E8F5] rounded-[3px] p-4">
                                            {#if connectedRoomsMap[rep.id]?.length > 0}
                                                <div class="space-y-[10px]">
                                                    {#each connectedRoomsMap[rep.id] as room}
                                                        <div class="flex items-center justify-between">
                                                            <span class="text-[14px] text-[#808080] ">{room.title || `ViewRoom ${room.id.substring(0, 1)}`}</span>
                                                            <div class="w-[38.71px] h-[19.5px] bg-[#DDDDDD] rounded-full relative flex items-center px-[3px]">
                                                                <div class="w-[13.4px] h-[13.5px] rounded-full {room.is_active ? 'bg-[#55D976]' : 'bg-[#7C7C7C]'} {room.is_active ? 'ml-auto' : ''} transition-all duration-200"></div>
                                                            </div>
                                                        </div>
                                                    {/each}
                                                </div>
                                            {:else}
                                                <div class="text-[14px] text-[#808080] ">No rooms connected</div>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>

<Dialog bind:open={showAddDialog}>
    <DialogContent class="bg-white rounded-lg p-6 max-w-[1106.74px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle class=" text-[18px] font-semibold text-[#737373]">{editingRep ? 'Edit' : 'Add'} Representative</DialogTitle>
        </DialogHeader>
        <form
            method="POST"
            action={editingRep ? "?/updateRepresentative" : "?/addRepresentative"}
            use:form
            use:enhance={() => {
                return async ({ result }) => {
                    handleFormResult(result);
                };
            }}
            enctype="multipart/form-data"
            class="space-y-6"
        >
            {#if editingRep}
                <input type="hidden" name="id" value={editingRep.id} />
            {/if}

            <div class="space-y-2">
                <Label for="name" class=" text-[14px] text-[#737373]">Name</Label>
                <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2 "
                    value={editingRep?.name || ''} 
                    required 
                    use:validators={[required]}
                />
                <HintGroup for="name">
                    <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                        <Hint on="required"><HintValidate>Name is required</HintValidate></Hint>
                    </div>
                </HintGroup>
            </div>

            <div class="space-y-2">
                <Label for="email" class=" text-[14px] text-[#737373]">Email</Label>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2 "
                    value={editingRep?.email || ''} 
                    required 
                    use:validators={[required, email]}
                />
                <HintGroup for="email">
                    <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                        <Hint on="required"><HintValidate>Email is required</HintValidate></Hint>
                        <Hint on="email" hideWhenRequired><HintValidate>Email is not valid</HintValidate></Hint>
                    </div>
                </HintGroup>
            </div>

            <div class="space-y-2">
                <Label for="phone" class=" text-[14px] text-[#737373]">Phone Number</Label>
                <input 
                    type="tel" 
                    id="phone" 
                    name="phone" 
                    class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2 "
                    value={editingRep?.phone || ''} 
                />
            </div>

            <div class="space-y-2">
                <Label for="location" class=" text-[14px] text-[#737373]">Location</Label>
                <Select.Root
                    onSelectedChange={handleLocationChange}
                >
                    <Select.Trigger class="w-full h-full border border-[#9E9E9E] bg-white rounded-[5px] h-[38px]">
                        <Select.Value placeholder="Select a location" />
                    </Select.Trigger>
                    <Select.Content>
                        {#each locations as location}
                            <Select.Item value={location.id}>{location.name}</Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>
                <input type="hidden" name="location" value={selectedLocation} required />
                <HintGroup for="location">
                    <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                        <Hint on="required"><HintValidate>Location is required</HintValidate></Hint>
                    </div>
                </HintGroup>
            </div>

            <div class="space-y-2">
                <Label for="avatar" class=" text-[18px] font-semibold text-[#737373]">Add Image</Label>
                <input 
                    type="file" 
                    id="avatar" 
                    name="avatar" 
                    class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2 "
                    accept="image/*" 
                />
            </div>

            <div class="space-y-2">
                <Label class=" text-[18px] font-semibold text-[#737373]">Schedule</Label>
                <div class="grid grid-cols-2 gap-4 gap-y-6">
                    <div>
                        <Label for="monday" class=" text-[14px] text-[#808080]">Monday</Label>
                        <input 
                            type="text" 
                            id="monday" 
                            name="monday" 
                            class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2 "
                            value={editingRep?.schedule?.monday || '8:00AM - 5:00PM'} 
                        />
                    </div>
                    <div>
                        <Label for="tuesday" class=" text-[14px] text-[#808080]">Tuesday</Label>
                        <input 
                            type="text" 
                            id="tuesday" 
                            name="tuesday" 
                            class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2 "
                            value={editingRep?.schedule?.tuesday || '8:00AM - 5:00PM'} 
                        />
                    </div>
                    <div>
                        <Label for="wednesday" class=" text-[14px] text-[#808080]">Wednesday</Label>
                        <input 
                            type="text" 
                            id="wednesday" 
                            name="wednesday" 
                            class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2 "
                            value={editingRep?.schedule?.wednesday || '8:00AM - 5:00PM'} 
                        />
                    </div>
                    <div>
                        <Label for="thursday" class=" text-[14px] text-[#808080]">Thursday</Label>
                        <input 
                            type="text" 
                            id="thursday" 
                            name="thursday" 
                            class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2 "
                            value={editingRep?.schedule?.thursday || '8:00AM - 5:00PM'} 
                        />
                    </div>
                    <div>
                        <Label for="friday" class=" text-[14px] text-[#808080]">Friday</Label>
                        <input 
                            type="text" 
                            id="friday" 
                            name="friday" 
                            class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2 "
                            value={editingRep?.schedule?.friday || '8:00AM - 5:00PM'} 
                        />
                    </div>
                    <div>
                        <Label for="saturday" class=" text-[14px] text-[#808080]">Saturday</Label>
                        <input 
                            type="text" 
                            id="saturday" 
                            name="saturday" 
                            class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2 "
                            value={editingRep?.schedule?.saturday || '9:00AM - 3:00PM'} 
                        />
                    </div>
                    <div>
                        <Label for="sunday" class=" text-[14px] text-[#808080]">Sunday</Label>
                        <input 
                            type="text" 
                            id="sunday" 
                            name="sunday" 
                            class="w-full border border-[#9E9E9E] bg-white rounded-[5px] px-3 py-2 h-[38px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B77BE] focus-visible:ring-offset-2 "
                            value={editingRep?.schedule?.sunday || 'Closed'} 
                        />
                    </div>
                </div>
            </div>

            <div class="flex justify-end space-x-2 !mt-8">
                <Button type="button" variant="outline" class="" on:click={() => showAddDialog = false}>
                    Cancel
                </Button>
                <Button type="submit" class="bg-[#4B77BE] hover:bg-[#4B77BE]/90 " disabled={!$form.valid}>
                    {editingRep ? 'Update' : 'Add'} Representative
                </Button>
            </div>
        </form>
    </DialogContent>
</Dialog>
