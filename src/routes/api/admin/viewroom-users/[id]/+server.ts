import { json } from '@sveltejs/kit';
import { pb } from '$lib/pocketbase';
import type { RequestHandler } from './$types';

// PUT - Update viewroom user
export const PUT: RequestHandler = async ({ request, locals, params }) => {
  try {
    // Check if user is authenticated
    if (!locals.user?.id) {
      return json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.first_name?.trim() || !data.last_name?.trim() || !data.email?.trim() || !data.phone?.trim()) {
      return json({
        success: false,
        message: 'First name, last name, email, and phone are required'
      }, { status: 400 });
    }

    // Verify the user belongs to this company
    const existingUser = await pb.collection('viewroom_users').getOne(params.id, {
      filter: `company = "${locals.user.id}"`
    });

    if (!existingUser) {
      return json({
        success: false,
        message: 'User not found or not authorized'
      }, { status: 404 });
    }

    // Update the user
    const updatedUser = await pb.collection('viewroom_users').update(params.id, {
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      is_active: data.is_active !== undefined ? data.is_active : existingUser.is_active
    });

    return json({
      success: true,
      user: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Failed to update viewroom user:', error);
    return json({
      success: false,
      message: error.message || 'Failed to update user'
    }, { status: 500 });
  }
};

// DELETE - Delete viewroom user
export const DELETE: RequestHandler = async ({ locals, params }) => {
  try {
    // Check if user is authenticated
    if (!locals.user?.id) {
      return json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Verify the user belongs to this company
    const existingUser = await pb.collection('viewroom_users').getOne(params.id, {
      filter: `company = "${locals.user.id}"`
    });

    if (!existingUser) {
      return json({
        success: false,
        message: 'User not found or not authorized'
      }, { status: 404 });
    }

    // Delete the user
    await pb.collection('viewroom_users').delete(params.id);

    return json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete viewroom user:', error);
    return json({
      success: false,
      message: error.message || 'Failed to delete user'
    }, { status: 500 });
  }
}; 