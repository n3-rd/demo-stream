import { json, type RequestHandler } from '@sveltejs/kit';

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

export const PUT: RequestHandler = async ({ request, locals, params }) => {
    if (!locals.pb?.authStore.isValid) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized'
        }), { status: 401 });
    }

    const formData = await request.formData();
    const roomId = params.roomId;
    
    try {
        const updateData = {
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            is_active: formData.get('is_active') === 'true',
            host_content: formData.get('host_content')?.toString().split(',').filter(Boolean) || [],
            representative_content: formData.get('representative_content')?.toString().split(',').filter(Boolean) || [],
            representative: formData.get('representative')?.toString().split(',').filter(Boolean) || []
        };

        await locals.pb.collection('rooms').update(roomId, updateData);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Room updated successfully'
        }), { status: 200 });
    } catch (error) {
        console.error('Error updating room:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to update room'
        }), { status: 500 });
    }
}; 