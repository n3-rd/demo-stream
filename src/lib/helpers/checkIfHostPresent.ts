import { error } from '@sveltejs/kit';

async function checkIfHostIsPresent(hostId: string, locals: App.Locals): Promise<boolean> {
    try {
        // Fetch the scheduled room by hostId
        const room = await locals.pb.collection('scheduled_rooms').getFirstListItem(`host_id="${hostId}"`);
        
        // Check if the host_present field is true
        return room.host_present === true;
    } catch (err) {
        console.error('Error checking host presence:', err);
        throw error(500, 'Failed to check host presence');
    }
}

export default checkIfHostIsPresent;