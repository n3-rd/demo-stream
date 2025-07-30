import { json } from '@sveltejs/kit';
import { pb } from '$lib/pocketbase';
import type { RequestHandler } from './$types';

// PATCH - Toggle user active status
export const PATCH: RequestHandler = async ({ locals, params }) => {
  try {
    // Check if user is authenticated
    if (!locals.user?.id) {
      return json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Verify the user belongs to this company and get current status
    const existingUser = await pb.collection('viewroom_users').getOne(params.id, {
      filter: `company = "${locals.user.id}"`
    });

    if (!existingUser) {
      return json({
        success: false,
        message: 'User not found or not authorized'
      }, { status: 404 });
    }

    // Toggle the active status
    const updatedUser = await pb.collection('viewroom_users').update(params.id, {
      is_active: !existingUser.is_active
    });

    return json({
      success: true,
      user: updatedUser,
      message: `User ${updatedUser.is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Failed to toggle user status:', error);
    return json({
      success: false,
      message: error.message || 'Failed to toggle user status'
    }, { status: 500 });
  }
}; 