<script lang="ts">
    import { goto, invalidateAll } from '$app/navigation';
    import { Button } from '$lib/components/ui/button/index.js';
    import * as Table from "$lib/components/ui/table";
    import * as dayjs from 'dayjs';
    import { EllipsisVertical } from 'lucide-svelte';
    import * as Popover from "$lib/components/ui/popover";
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';

    export let data;
    console.log(data);
    let rooms;
    let user = data.user;
    let quotes; // Assuming quotes data is passed in the same data object
    const currentDate = new Date();
$:{
    rooms = data.scheduled_rooms
    quotes = data.quotes;
}

let imageFile: File | null = null;

function handleImageChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
        imageFile = target.files[0];
    }
}

function extractSecondSegment(meetingString: string): string {
    const segments = meetingString.split('-');
    return segments[2];
}

    // Function to check if a meeting is out of time
    function isOutOfTime(schedule_date: string): boolean {
        const now = new Date();
        const meetingDate = new Date(schedule_date);
        return meetingDate < now;
    }

    // Function to check if a meeting is on time
    function isOnTime(schedule_date: string): boolean {
        const now = new Date();
        const meetingDate = new Date(schedule_date);
        return meetingDate <= now && meetingDate >= now;
    }
</script>

<style>
    .status-out-of-time {
        color: #f87171; /* red-500 */
    }
    .status-scheduled {
        color: #34d399; /* green-500 */
    }
    .status-upcoming {
        color: #fbbf24; /* yellow-500 */
    }
</style>

<div class="container mx-auto p-4 min-h-screen">

    <div class="profile-info flex flex-col items-center p-4 bg-gray-100 rounded-lg shadow-md my-8">
        <img src={user.avatar ? `${data.avatarUrl}` : `https://ui-avatars.com/api/?name=${user.name}?background=random`} alt="User Avatar" class="w-24 h-24 rounded-full mb-4">
        <h2 class="text-xl font-semibold mb-2">{user.name}</h2>
        <p class="text-gray-700 mb-1">Email: {user.email}</p>
        <p class="text-gray-700">Username: {user.username}</p>
        
        <form method="POST" action="?/update-avatar" enctype="multipart/form-data" use:enhance={() => {
            return async ({ result }) => {
                if (result.type === 'success') {
                    toast.success('Profile image updated successfully');
                    invalidateAll();
                } else {
                    toast.error('Failed to update profile image');
                }
            };
        }}>
            <input type="file" name="avatar" accept="image/*" on:change={handleImageChange} class="mt-4">
            <Button type="submit" disabled={!imageFile} class="mt-2">Update Profile Image</Button>
        </form>
    </div>

    <h1 class="text-2xl font-bold mb-4">My Scheduled Meetings</h1>
    {#if rooms}
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
                <thead class="bg-gray-800 text-white">
                    <tr>
                        <th class="py-2 px-4">Meeting Name</th>
                        <th class="py-2 px-4">ID</th>
                        <th class="py-2 px-4">Date</th>
                        <th class="py-2 px-4">Time</th>
                        <th class="py-2 px-4">Status</th>
                        <th class="py-2 px-4 text-right">Actions</th>
                        <th class="py-2 px-4 text-right"></th>
                    </tr>
                </thead>
                <tbody>
                    {#each rooms as room}
                        <tr class="border-b">
                            <td class="py-2 px-4 font-medium">{extractSecondSegment(room.room_name)}</td>
                            <td class="py-2 px-4">{room.id}</td>
                            <td class="py-2 px-4">{new Date(room.schedule_date).toLocaleDateString()}</td>
                            <td class="py-2 px-4">{new Date(room.schedule_date).toLocaleTimeString()}</td>
                            <td class="py-2 px-4">
                                {#if isOutOfTime(room.schedule_date)}
                                    <span class="status-out-of-time">Out of Time</span>
                                {:else if isOnTime(room.schedule_date)}
                                    <span class="status-scheduled">Scheduled</span>
                                {:else}
                                    <span class="status-upcoming">Upcoming</span>
                                {/if}
                            </td>
                            <td class="py-2 px-4 text-right">
                                <Button class="bg-primary text-white py-2 px-4 rounded disabled:opacity-50"
                                disabled={!isOnTime(room.schedule_date)}
                                on:click={() => {
                                    window.open(`/room/${room.room_name}/`, "_blank");
                                }}
                                >View</Button>
                            </td>
                            <td class="py-2 px-4 text-right">
                                <Popover.Root>
                                    <Popover.Trigger>
                                        <EllipsisVertical class="w-6 h-6" />
                                    </Popover.Trigger>
                                    <Popover.Content>
                                        <form method="POST" action="?/delete-meeting" class="w-full"
                                        use:enhance={() => {
                                            return async ({ result }) => {
                                                console.log('login results', result.data.success);
                                                if ((result.data.success)) {
                                                    toast.success('successfully deleted meeting');
                                                    invalidateAll()
                                                } else {
                                                    toast.error('error occoured while deleting meeting');
                                                }
                                            };
                                        }}
                                        >
                                            <input type="hidden" name="meetingId" value={room.id} />
                                            <input type="hidden" name="dailyRoomName" value={room.room_name} />
                                            <Button type="submit" class="bg-red-500 text-white py-2 px-4 rounded w-full">Delete</Button>
                                        </form>
                                    </Popover.Content>
                                </Popover.Root>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {:else}
        <p class="text-gray-500">No scheduled meetings</p>
    {/if}

    {#if quotes}
    <h1 class="text-2xl font-bold mt-8 mb-4">Quotes</h1>
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
                <thead class="bg-gray-800 text-white">
                    <tr>
                        <th class="py-2 px-4">First Name</th>
                        <th class="py-2 px-4">Last Name</th>
                        <th class="py-2 px-4">Email</th>
                        <th class="py-2 px-4">Phone</th>
                        <th class="py-2 px-4">Description</th>
                        <th class="py-2 px-4">Created</th>
                        <th class="py-2 px-4">Updated</th>
                        <th class="py-2 px-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each quotes as quote}
                        <tr class="border-b">
                            <td class="py-2 px-4 font-medium">{quote.first_name}</td>
                            <td class="py-2 px-4">{quote.last_name}</td>
                            <td class="py-2 px-4">{quote.email}</td>
                            <td class="py-2 px-4">{quote.phone}</td>
                            <td class="py-2 px-4">{quote.description}</td>
                            <td class="py-2 px-4">{new Date(quote.created).toLocaleString()}</td>
                            <td class="py-2 px-4">{new Date(quote.updated).toLocaleString()}</td>
                            <td class="py-2 px-4 text-right">
                                <Button class="bg-green-500 text-white py-2 px-4 rounded"
                                on:click={() => {
                                    window.open(`mailto:${quote.email}?subject=Reply to your quote&body=Hello ${quote.first_name},`, "_blank");
                                }}
                                >Reply</Button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {:else if quotes != null}
        <p class="text-gray-500">No quotes available</p>
    {/if}
</div>
