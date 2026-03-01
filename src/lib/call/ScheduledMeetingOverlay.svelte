<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    interface Props {
        scheduledMeetingTime: Date;
        meetingStatus: {
        canJoin: boolean;
        isPast: boolean;
        joinBeforeMinutes: number;
        minutesLeft: number;
    };
        meetingTitle?: string;
        meetingDuration?: number;
    }

    let {
        scheduledMeetingTime,
        meetingStatus,
        meetingTitle = 'Scheduled Meeting',
        meetingDuration = 60
    }: Props = $props();

    const dispatch = createEventDispatcher();

    function calculateTimeRemaining(scheduledTime: Date): string {
        const now = new Date();
        const diff = scheduledTime.getTime() - now.getTime();

        if (diff <= 0) return 'Now';

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} ${hours % 24} hr${hours % 24 !== 1 ? 's' : ''}`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ${minutes % 60} min${minutes % 60 !== 1 ? 's' : ''}`;
        } else {
            return `${minutes} minute${minutes > 1 ? 's' : ''}`;
        }
    }

    function formatDateForICS(date: Date): string {
        return date.toISOString().replace(/-|:|\.\d+/g, '');
    }

    function downloadICS(content: string, filename: string): void {
        const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function handleAddToCalendar(): void {
        const startTime = new Date(scheduledMeetingTime);
        const endTime = new Date(startTime.getTime() + meetingDuration * 60 * 1000);

        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ViewRoom//Calendar//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
DTSTART:${formatDateForICS(startTime)}
DTEND:${formatDateForICS(endTime)}
SUMMARY:${meetingTitle}
DESCRIPTION:Join this meeting at ${window.location.href}
LOCATION:Online
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;

        downloadICS(icsContent, 'meeting-invite.ics');
    }
</script>

<!-- Full-screen modal overlay -->
<div class="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-2xl max-w-md w-full p-8 text-center">
        <h2 class="text-2xl font-bold mb-6 text-red-600">Meeting Not Available</h2>

        <div class="mb-6">
            <p class="text-lg mb-4">This meeting is scheduled for:</p>
            <p class="text-xl font-semibold text-gray-800">
                {scheduledMeetingTime.toLocaleString()}
            </p>
        </div>

        {#if meetingStatus.isPast}
            <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <p class="text-red-800">
                    This meeting has already taken place and is no longer available.
                </p>
            </div>
        {:else}
            <div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p class="text-yellow-800">
                    {#if meetingStatus.joinBeforeMinutes === 0}
                        You can only join this meeting at the exact scheduled time.
                    {:else}
                        You can join this meeting {meetingStatus.joinBeforeMinutes} minute{meetingStatus.joinBeforeMinutes !== 1 ? 's' : ''} before the scheduled start time.
                    {/if}
                </p>
            </div>

            <div class="mb-6">
                <p class="text-sm text-gray-500">Time remaining:</p>
                <p class="text-2xl font-bold text-gray-800">
                    {calculateTimeRemaining(scheduledMeetingTime)}
                </p>
            </div>
        {/if}

        <button
            class="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            onclick={() => { window.location.href = '/'; }}
        >
            Return to Home
        </button>
    </div>
</div>

<!-- Background content screen -->
<div class="flex flex-col items-center justify-center h-screen bg-[#eceef3] p-6 text-center">
    <div class="bg-white p-8 rounded-lg shadow-lg max-w-md">
        <h2
            class="text-xl font-semibold mb-4"
            class:text-red-600={meetingStatus.isPast}
            class:text-yellow-600={!meetingStatus.canJoin && !meetingStatus.isPast}
            class:text-green-600={meetingStatus.canJoin && !meetingStatus.isPast}
        >
            {meetingStatus.isPast ? 'Meeting Has Ended' : (meetingStatus.canJoin ? 'Waiting Room Open' : 'Meeting Not Available Yet')}
        </h2>
        <p class="mb-4">This meeting is scheduled and {meetingStatus.isPast ? 'has already taken place' : 'is not yet available'}.</p>

        <div class="mb-6">
            <p class="text-sm font-medium">Scheduled For:</p>
            <p class="text-lg">{scheduledMeetingTime.toLocaleString()}</p>
        </div>

        {#if meetingStatus.isPast}
            <div class="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
                <p class="text-red-800">
                    This meeting has already taken place and is no longer available.
                </p>
            </div>
        {:else if !meetingStatus.canJoin}
            <div class="mb-6">
                <p class="text-sm text-gray-500">Time remaining:</p>
                <p class="text-2xl font-bold">
                    {calculateTimeRemaining(scheduledMeetingTime)}
                </p>
            </div>

            <div class="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p class="text-yellow-800">
                    {#if meetingStatus.joinBeforeMinutes === 0}
                        You'll be able to join this meeting when it starts.
                    {:else}
                        You'll be able to join the waiting room {meetingStatus.joinBeforeMinutes} minute{meetingStatus.joinBeforeMinutes !== 1 ? 's' : ''} before the scheduled start time.
                    {/if}
                </p>
            </div>

            <button
                class="w-full py-2 mb-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                onclick={handleAddToCalendar}
            >
                Add to Calendar
            </button>
        {/if}

        <button
            class="w-full py-2 bg-primary text-white rounded-md hover:bg-primary/80"
            onclick={() => window.location.href = '/'}
        >
            Return to Home
        </button>
    </div>
</div>
