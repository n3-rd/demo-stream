<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { Plus, Save } from 'lucide-svelte';
    import Sidenav from '$lib/components/layout/sidenav.svelte';
    import { enhance } from "$app/forms";
    import { toast } from "svelte-sonner";
	import { invalidateAll } from "$app/navigation";

    export let data;
    let locations = data.locations;

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
    }
</script>

<div class="flex h-screen bg-gray-100">
    <Sidenav activePage="locations" />
    
    <div class="flex-1 overflow-auto">
        <div class="container mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Add a Location</CardTitle>
                </CardHeader>
                <CardContent>
                    <form 
                        method="POST" 
                        action="?/create"
                        use:enhance={({ cancel }) => {
                            return async ({ update, result }) => {
                                await update();

                                if (result.type === 'success') {
                                    toast.success('Location created successfully');
                                    resetForm();
                                    invalidateAll();
                                } else if (result.type === 'failure') {
                                    toast.error(result.data?.message ?? 'Failed to create location');
                                } else {
                                    toast.error('Failed to create location');
                                }
                            };
                        }}
                        class="space-y-6"
                    >
                        <div class="grid gap-4">
                            <div class="grid gap-2">
                                <Label for="locationName">Name of Location</Label>
                                <Input 
                                    id="locationName"
                                    name="name"
                                    bind:value={currentLocation.name}
                                    placeholder="e.g. Timmins Branch"
                                    required
                                />
                            </div>

                            <div class="grid gap-2">
                                <Label for="address">Address</Label>
                                <Input 
                                    id="address"
                                    name="address"
                                    bind:value={currentLocation.address}
                                    placeholder="123 Street Name"
                                    required
                                />
                            </div>

                            <div class="grid gap-2">
                                <Label for="city">City</Label>
                                <Input 
                                    id="city"
                                    name="city"
                                    bind:value={currentLocation.city}
                                    placeholder="Timmins"
                                    required
                                />
                            </div>

                            <div class="grid gap-2">
                                <Label for="phone">Phone #</Label>
                                <Input 
                                    id="phone"
                                    name="phone"
                                    bind:value={currentLocation.phone}
                                    placeholder="705-123-1234"
                                    type="tel"
                                    required
                                />
                            </div>

                            <div class="grid gap-4">
                                <Label>Hours of Operation</Label>
                                {#each Object.entries(currentLocation.hours) as [day, hours]}
                                    <div class="space-y-2">
                                        <div class="grid grid-cols-[100px_1fr] gap-4 items-center">
                                            <Label for={day}>{day}:</Label>
                                            <Input 
                                                id={day}
                                                name={day}
                                                bind:value={currentLocation.hours[day]}
                                                placeholder="9:00 am - 5:00 pm"
                                            />
                                        </div>
                                        <div class="flex gap-2 ml-[100px]">
                                            {#each commonHours as timeOption}
                                                <Button 
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    on:click={() => setHours(day, timeOption.value)}
                                                    class="text-xs"
                                                >
                                                    {timeOption.label}
                                                </Button>
                                            {/each}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>

                        <div class="flex justify-between items-center pt-4">
                            <Button 
                                type="submit"
                                variant="default"
                            >
                                <Save class="mr-2 h-4 w-4" />
                                Save
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {#if locations.length > 0}
                <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {#each locations as location}
                        <Card>
                            <CardHeader>
                                <CardTitle>{location.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div class="space-y-2">
                                    <p>{location.address}</p>
                                    <p>{location.city}</p>
                                    <p>{location.phone}</p>
                                    <div class="pt-2">
                                        <h4 class="font-semibold mb-2">Hours:</h4>
                                        {#each Object.entries(location.hours || {}) as [day, hours]}
                                            {#if hours}
                                                <p class="grid grid-cols-[100px_1fr]">
                                                    <span class="font-medium">{day}:</span>
                                                    <span>{hours}</span>
                                                </p>
                                            {/if}
                                        {/each}
                                    </div>
                                    <div class="flex justify-end space-x-2 mt-4">
                                        <form
                                            method="POST"
                                            action="?/delete"
                                            use:enhance={({ cancel }) => {
                                                return async ({ update, result }) => {
                                                    await update();

                                                    if (result.type === 'success') {
                                                        toast.success('Location deleted successfully');
                                                    } else if (result.type === 'failure') {
                                                        toast.error(result.data?.message ?? 'Failed to delete location');
                                                    } else {
                                                        toast.error('Failed to delete location');
                                                    }
                                                };
                                            }}
                                        >
                                            <input type="hidden" name="id" value={location.id} />
                                            <Button
                                                type="submit"
                                                variant="destructive"
                                                size="sm"
                                            >
                                                Delete
                                            </Button>
                                        </form>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    /* Additional custom styles can be added here if needed */
</style> 