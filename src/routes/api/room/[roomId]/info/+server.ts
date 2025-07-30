import { json } from '@sveltejs/kit';

export async function GET({ params, locals }) {
  try {
    const roomId = params.roomId;
    
    if (!roomId) {
      return json({
        success: false,
        message: 'Room ID is required'
      }, { status: 400 });
    }

    // Use the locals.pb instance that's already available
    const room = await locals.pb.collection('rooms').getOne(roomId, {
      expand: 'owner_company'
    });

    if (!room) {
      return json({
        success: false,
        message: 'Room not found'
      }, { status: 404 });
    }

    // Get company information from the expanded owner_company
    const ownerCompany = room.expand?.owner_company;
    
    return json({
      success: true,
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
    });
  } catch (error) {
    console.error('Failed to fetch room info:', error);
    return json({
      success: false,
      message: 'Failed to fetch room information'
    }, { status: 500 });
  }
} 