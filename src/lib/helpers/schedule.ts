import { toast } from "svelte-sonner";

export async function createOrGetPermanentRoom(userId: string, month?: number, day?: number, year?: number, time?: string, name?: string) {
    function padZero(num: number): string {
        return num < 10 ? `0${num}` : `${num}`;
    }

    const formattedMonth = padZero(month);
    const formattedDay = padZero(day);
    const scheduledDate = `${year}-${formattedMonth}-${formattedDay}T${time}`;

    try {
        const response = await fetch('/api/create-or-get-permanent-room', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId,
                roomName: name,
                month: month,
                day: day,
                year: year,
                time: time,
                scheduled_date: scheduledDate
            })
        });

        if (!response.ok) {
            const error = await response.json();
            if (response.status === 409 ) {
                toast.error('Room with name already exists');
                return { exists: true };
            }
            throw new Error(error.message || 'Failed to create/get room');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'event.ics';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        toast.success('Room scheduled successfully');
        
        // Return the roomId for further use
        return { success: true };
    } catch (error) {
        console.error('Error creating/getting room:', error);
        toast.error(error.message || 'Failed to create/get room');
        return { success: false };
    }
}