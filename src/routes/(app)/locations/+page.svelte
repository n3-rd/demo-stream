<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Plus, MoreHorizontal } from 'lucide-svelte';
    import Sidenav from '$lib/components/layout/sidenav.svelte';
    import { enhance } from "$app/forms";
    import { toast } from "svelte-sonner";
	import { invalidateAll } from "$app/navigation";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

    export let data;
    $: locations = data.locations;

    type Location = {
        name: string;
        address: string;
        city: string;
        phone: string;
        hours: {
            [key: string]: string;
        };
    };

    let currentLocation: Location = {
        name: '',
        address: '',
        city: '',
        phone: '',
        hours: {
            Mon: '',
            Tue: '',
            Wed: '',
            Thurs: '',
            Fri: '',
            Sat: '',
            Sun: ''
        }
    };

    let showAddLocationDialog = false;
    let editingLocation: any = null;
    let addAnother = false;

    const commonHours = [
        { label: "9-5", value: "9:00 am - 5:00 pm" },
        { label: "8-4", value: "8:00 am - 4:00 pm" },
        { label: "10-6", value: "10:00 am - 6:00 pm" },
        { label: "11-7", value: "11:00 am - 7:00 pm" },
        { label: "12-8", value: "12:00 pm - 8:00 pm" },
        { label: "Closed", value: "Closed" }
    ];

    function setHours(day: string, hours: string) {
        currentLocation.hours[day] = hours;
        currentLocation = currentLocation; // trigger reactivity
    }

    function resetForm() {
        currentLocation = {
            name: '',
            address: '',
            city: '',
            phone: '',
            hours: {
                Mon: '',
                Tue: '',
                Wed: '',
                Thurs: '',
                Fri: '',
                Sat: '',
                Sun: ''
            }
        };
        editingLocation = null;
    }

    function formatDate(date: string) {
        return new Date(date).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: '2-digit'
        });
    }

    function editLocation(location: any) {
        editingLocation = location;
        currentLocation = {
            name: location.name,
            address: location.address,
            city: location.city,
            phone: location.phone,
            hours: location.hours || {
                Mon: '',
                Tue: '',
                Wed: '',
                Thurs: '',
                Fri: '',
                Sat: '',
                Sun: ''
            }
        };
        showAddLocationDialog = true;
    }

    function handleSubmitAndClose() {
        addAnother = false;
    }

    function handleSubmitAndAddAnother() {
        addAnother = true;
    }

    let formElement: HTMLFormElement;
    
    function submitForm(keepOpen = false) {
        addAnother = keepOpen;
        if (formElement) {
            formElement.requestSubmit();
        }
    }
</script>

<div class="flex bg-gray-100">
    <Sidenav activePage="locations" />
    
    <div class="flex-1 overflow-auto mt-[6rem]">
        <div class="container mx-auto p-6 space-y-6">
            <!-- Header with Add Location Button -->
            <div class="flex justify-between items-center">
                <h1 class="text-2xl font-bold text-[#737373]">Locations</h1>
                <Button 
                    variant="default" 
                    on:click={() => {
                        resetForm();
                        showAddLocationDialog = true;
                    }}
                >
                    <Plus class="mr-2 h-4 w-4" />
                    Add Location
                </Button>
            </div>

            <!-- Table Header -->
            <div class="bg-[#F0F4FA] rounded-[8px] h-[55px] flex items-center px-6">
                <div class="grid grid-cols-5 w-full gap-4">
                    <div class="text-[16px] font-semibold text-[#737373] flex items-center justify-center">Date Added</div>
                    <div class="text-[16px] font-semibold text-[#737373] flex items-center justify-center">Location Name</div>
                    <div class="text-[16px] font-semibold text-[#737373] flex items-center justify-center">Address</div>
                    <div class="text-[16px] font-semibold text-[#737373] flex items-center justify-center">City</div>
                    <div class="text-[16px] font-semibold text-[#737373] flex items-center justify-center">Delete</div>
                </div>
            </div>

            <!-- Table Rows -->
            {#if locations.length > 0}
                {#each locations as location}
                    <div class="bg-white rounded-[8px] h-[73px] flex items-center px-6 mb-2">
                        <div class="grid grid-cols-5 w-full gap-4">
                            <div class="text-[16px] font-normal text-[#808080] flex items-center justify-center">
                                {formatDate(location.created)}
                            </div>
                            <div class="text-[16px] font-medium text-[#7798D2] flex items-center justify-center">
                                <button 
                                    class="hover:underline"
                                    on:click={() => editLocation(location)}
                                >
                                    {location.name}
                                </button>
                            </div>
                            <div class="text-[16px] font-normal text-[#808080] flex items-center justify-center">
                                {location.address}
                            </div>
                            <div class="text-[16px] font-normal text-[#808080] flex items-center justify-center">
                                {location.city}
                            </div>
                            <div class="flex items-center justify-center">
                                <form
                                    method="POST"
                                    action="?/delete"
                                    use:enhance={() => {
                                        return async ({ result }) => {
                                            if (result.type === 'success') {
                                                await invalidateAll();
                                                toast.success('Location deleted successfully');
                                            } else if (result.type === 'failure') {
                                                const errorMsg = typeof result.data?.message === 'string' ? result.data.message : 'Failed to delete location';
                                                toast.error(errorMsg);
                                            } else {
                                                toast.error('Failed to delete location');
                                            }
                                        };
                                    }}
                                >
                                    <input type="hidden" name="id" value={location.id} />
                                    <Button
                                        type="submit"
                                        variant="ghost"
                                        size="sm"
                                        class="text-red-500 hover:text-red-700"
                                    >
                                        Delete
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </div>
                {/each}
            {:else}
                <div class="bg-white rounded-[8px] p-8 text-center text-gray-500">
                    No locations found. Click "Add Location" to create one.
                </div>
            {/if}
        </div>
    </div>
</div>

<!-- Add/Edit Location Dialog -->
<Dialog.Root bind:open={showAddLocationDialog}>
    <Dialog.Content class="max-w-3xl bg-white rounded-lg p-6 shadow-lg max-h-[75vh] overflow-y-auto">
        <Dialog.Header>
            <Dialog.Title class="font-['Poppins'] font-bold text-2xl text-[#808080]">{editingLocation ? 'Edit Location' : 'Add Location'}</Dialog.Title>
        </Dialog.Header>
        
                    <form 
                        method="POST" 
                        action={editingLocation ? "?/update" : "?/create"}
                        use:enhance={() => {
                            return async ({ result }) => {
                                if (result.type === 'success') {
                                    await invalidateAll();
                                    if (!addAnother) {
                                        resetForm();
                                        showAddLocationDialog = false;
                                    } else {
                                        resetForm();
                                    }
                                    toast.success(`Location ${editingLocation ? 'updated' : 'created'} successfully`);
                                } else if (result.type === 'failure') {
                        const errorMsg = typeof result.data?.message === 'string' 
                            ? result.data.message 
                            : `Failed to ${editingLocation ? 'update' : 'create'} location`;
                        toast.error(errorMsg);
                                } else {
                                    toast.error('An error occurred');
                                }
                            };
                        }}
                        class="space-y-6"
                        bind:this={formElement}
                    >
            {#if editingLocation}
                <input type="hidden" name="id" value={editingLocation.id} />
            {/if}
            
                        <div class="grid gap-4">
                            <div class="flex justify-between items-center gap-8">
                                <div class="grid gap-2 w-full">
                        <Label for="locationName" class="font-['Poppins'] font-medium text-lg text-[#808080]">Name of Location</Label>
                                    <Input 
                                        id="locationName"
                                        name="name"
                                        bind:value={currentLocation.name}
                                        placeholder="e.g. Timmins Branch"
                                        required
                            class="h-10 bg-[#ECEFF3] rounded-lg"
                                    />
                                </div>
    
                                <div class="grid gap-2 w-full">
                        <Label for="address" class="font-['Poppins'] font-medium text-lg text-[#808080]">Address</Label>
                                    <Input 
                                        id="address"
                                        name="address"
                                        bind:value={currentLocation.address}
                                        placeholder="123 Street Name"
                                        required
                            class="h-10 bg-[#ECEFF3] rounded-lg"
                                    />
                                </div>
                            </div>

                            <div class="flex justify-between items-center gap-8">
                                <div class="grid gap-2 w-full">
                        <Label for="city" class="font-['Poppins'] font-medium text-lg text-[#808080]">City</Label>
                                    <Input 
                                        id="city"
                                        name="city"
                                        bind:value={currentLocation.city}
                                        placeholder="Timmins"
                                        required
                            class="h-10 bg-[#ECEFF3] rounded-lg"
                                    />
                                </div>
    
                                <div class="grid gap-2 w-full">
                        <Label for="phone" class="font-['Poppins'] font-medium text-lg text-[#808080]">Phone Number</Label>
                                    <Input 
                                        id="phone"
                                        name="phone"
                                        bind:value={currentLocation.phone}
                                        placeholder="705-123-1234"
                                        type="tel"
                                        required
                            class="h-10 bg-[#ECEFF3] rounded-lg"
                                    />
                                </div>
                                </div>

                            <div class="grid gap-4">
                    <Label class="font-['Poppins'] font-medium text-lg text-[#808080]">Hours of Operation</Label>
                    <div class="flex gap-6">
                        <div class="w-28 space-y-4 pt-1">
                            {#each Object.entries(currentLocation.hours) as [day, hours], i}
                                <div class="font-['Poppins'] font-normal text-sm text-[#808080] h-6 flex items-center">{day}</div>
                            {/each}
                        </div>
                        <div class="flex-1 space-y-2">
                            {#each Object.entries(currentLocation.hours) as [day, hours], i}
                                <div class="space-y-1">
                                            <Input 
                                                id={day}
                                                name={day}
                                                bind:value={currentLocation.hours[day]}
                                                placeholder="9:00 am - 5:00 pm"
                                        class="h-6 py-1 bg-[#E0E8F5] rounded text-sm font-['Poppins'] text-[#777574]"
                                            />
                                    <div class="flex gap-1 flex-wrap">
                                            {#each commonHours as timeOption}
                                            <button 
                                                    type="button"
                                                    on:click={() => setHours(day, timeOption.value)}
                                                class="text-[10px] bg-white border border-gray-200 rounded px-1 py-0.5 hover:bg-gray-50"
                                                >
                                                    {timeOption.label}
                                            </button>
                                            {/each}
                                        </div>
                                    </div>
                                {/each}
                        </div>
                        <div class="w-[320px] flex items-center justify-center bg-[#D9D9D9] text-black  text-xl p-4 rounded">
                            These times are editable
                        </div>
                    </div>
                            </div>
                        </div>

            <Dialog.Footer class="flex justify-between gap-4 pt-4 mt-4 border-t border-gray-200">
                <div>
                    <Button 
                        type="button" 
                        variant="outline" 
                        on:click={() => {
                            resetForm();
                            showAddLocationDialog = false;
                        }}
                        class="text-gray-500 border-gray-300"
                    >
                        Cancel
                    </Button>
                </div>
                <div class="flex gap-2">
                    {#if editingLocation}
                        <form
                            method="POST"
                            action="?/delete"
                            use:enhance={() => {
                                return async ({ result }) => {
                                    if (result.type === 'success') {
                                        await invalidateAll();
                                        showAddLocationDialog = false;
                                        toast.success('Location deleted successfully');
                                    } else if (result.type === 'failure') {
                                        const errorMsg = typeof result.data?.message === 'string' ? result.data.message : 'Failed to delete location';
                                        toast.error(errorMsg);
                                    } else {
                                        toast.error('Failed to delete location');
                                    }
                                };
                            }}
                        >
                            <input type="hidden" name="id" value={editingLocation.id} />
                            <Button type="submit" class="bg-red-500 hover:bg-red-600 text-white font-medium">
                                Delete
                            </Button>
                        </form>
                    {/if}
                    <Button 
                        type="button" 
                        class="bg-primary hover:bg-primary/80 text-white font-medium"
                        on:click={() => submitForm(false)}
                    >
                        {editingLocation ? 'Update' : 'Save'}
                    </Button>
                    {#if !editingLocation}
                        <Button 
                            type="button" 
                            class="bg-primary hover:bg-primary/80 text-white font-medium"
                            on:click={() => submitForm(true)}
                        >
                            Add Another Location
                        </Button>
                    {/if}
                </div>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>

<style>
    /* Additional custom styles can be added here if needed */
</style> 