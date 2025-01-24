<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { Plus, Save } from 'lucide-svelte';
    import Sidenav from '$lib/components/layout/sidenav.svelte';
	import { toast } from "svelte-sonner";

    type Location = {
        name: string;
        address: string;
        city: string;
        phone: string;
        hours: {
            [key: string]: string;
        };
    };

    let locations: Location[] = [];
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

    function isLocationValid(location: Location): boolean {
        return Boolean(
            location.name.trim() &&
            location.address.trim() &&
            location.city.trim() &&
            location.phone.trim() &&
            Object.values(location.hours).some(hour => hour.trim())
        );
    }

    function handleSave() {
        if (!isLocationValid(currentLocation)) {
            toast.error('Please fill in at least the name, address, city, phone, and one business hour before saving.');
            return;
        }
        locations = [...locations, { ...currentLocation }];
        // Reset form
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

    function addAnotherLocation() {
        handleSave();
    }

    function setHours(day: string, hours: string) {
        currentLocation.hours[day] = hours;
        currentLocation = currentLocation; // trigger reactivity
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
                    <form class="space-y-6">
                        <div class="grid gap-4">
                            <div class="grid gap-2">
                                <Label for="locationName">Name of Location</Label>
                                <Input 
                                    id="locationName"
                                    bind:value={currentLocation.name}
                                    placeholder="e.g. Timmins Branch"
                                />
                            </div>

                            <div class="grid gap-2">
                                <Label for="address">Address</Label>
                                <Input 
                                    id="address"
                                    bind:value={currentLocation.address}
                                    placeholder="123 Street Name"
                                />
                            </div>

                            <div class="grid gap-2">
                                <Label for="city">City</Label>
                                <Input 
                                    id="city"
                                    bind:value={currentLocation.city}
                                    placeholder="Timmins"
                                />
                            </div>

                            <div class="grid gap-2">
                                <Label for="phone">Phone #</Label>
                                <Input 
                                    id="phone"
                                    bind:value={currentLocation.phone}
                                    placeholder="705-123-1234"
                                    type="tel"
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
                                type="button" 
                                on:click={handleSave}
                                variant="default"
                            >
                                <Save class="mr-2 h-4 w-4" />
                                Save
                            </Button>

                            <Button 
                                type="button"
                                on:click={addAnotherLocation}
                                variant="outline"
                            >
                                <Plus class="mr-2 h-4 w-4" />
                                Add Another Location
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
                                        {#each Object.entries(location.hours) as [day, hours]}
                                            {#if hours}
                                                <p class="grid grid-cols-[100px_1fr]">
                                                    <span class="font-medium">{day}:</span>
                                                    <span>{hours}</span>
                                                </p>
                                            {/if}
                                        {/each}
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