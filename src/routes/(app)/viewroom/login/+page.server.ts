import { error } from '@sveltejs/kit';
import { pb } from '$lib/pocketbase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
  const roomId = url.searchParams.get('room');
  
  if (!roomId) {
    throw error(400, 'Room ID is required for viewroom access');
  }

  try {
    // Fetch the room to get the owner company
    const room = await pb.collection('rooms').getOne(roomId, {
      expand: 'owner_company'
    });

    if (!room) {
      throw error(404, 'Room not found');
    }

    // Get company information
    const ownerCompany = room.expand?.owner_company || null;
    
    return {
      room: {
        id: room.id,
        title: room.title,
        owner_company: room.owner_company
      },
      company: ownerCompany ? {
        id: ownerCompany.id,
        name: ownerCompany.name || ownerCompany.email,
        email: ownerCompany.email
      } : null
    };
  } catch (err) {
    console.error('Failed to load room information:', err);
    throw error(404, 'Room not found or inaccessible');
  }
}; 