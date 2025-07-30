import { json } from '@sveltejs/kit';
import { pb } from '$lib/pocketbase';
import type { RequestHandler } from './$types';

// GET - List viewroom users for the company
export const GET: RequestHandler = async ({ locals }) => {
  try {
    // Check if user is authenticated
    if (!locals.user?.id) {
      return json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Get all viewroom users for this company
    const users = await pb.collection('viewroom_users').getFullList({
      filter: `company = "${locals.user.id}"`,
      sort: '-created'
    });

    return json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Failed to fetch viewroom users:', error);
    return json({
      success: false,
      message: 'Failed to fetch users'
    }, { status: 500 });
  }
};

// POST - Create new viewroom user
export const POST: RequestHandler = async ({ request, locals }) => {
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

    // Check if email already exists for this company
    try {
      const existingUser = await pb.collection('viewroom_users').getFirstListItem(
        `email = "${data.email.trim().toLowerCase()}" && company = "${locals.user.id}"`
      );
      if (existingUser) {
        return json({
          success: false,
          message: 'A user with this email already exists in your company'
        }, { status: 400 });
      }
    } catch (error) {
      // No existing user found, which is good
    }

    // Create the viewroom user bound to the admin's company
    const userData = {
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      is_active: data.is_active !== undefined ? data.is_active : true,
      company: locals.user.id // Bind to the admin's user ID as company
    };

    const newUser = await pb.collection('viewroom_users').create(userData);

    return json({
      success: true,
      user: newUser,
      message: 'Viewroom user created successfully'
    });
  } catch (error) {
    console.error('Failed to create viewroom user:', error);
    return json({
      success: false,
      message: error.message || 'Failed to create user'
    }, { status: 500 });
  }
}; 