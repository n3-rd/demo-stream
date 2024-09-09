import { browser } from "$app/environment";

export async function addRoomParticipant(roomId: string, participantId: string) {
    try {
        const response = await fetch('/api/add-room-participant', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                roomId,
                participantId
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log(`Participant added successfully: ${participantId}`);
            return data;
        } else {
            console.error(`Failed to add participant: ${data.error}`);
            return null;
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return null;
    }
}

export function removeUrlParam(param:string) {
    if(browser){
        const url = new URL(window.location.href);
        url.searchParams.delete(param);
        history.replaceState(null, '', url.toString());
    }

}
