import { error } from '@sveltejs/kit';
import { pb } from '$lib/pocketbase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Check if user is authenticated
  if (!locals.user?.id) {
    throw error(401, 'Authentication required');
  }

  try {
    // Fetch viewroom users for this company (admin's user ID)
    const users = await locals.pb.collection('viewroom_users').getFullList({
      filter: `company = "${locals.user.id}"`,
      sort: '-created'
    });

    return {
      users,
      company: {
        id: locals.user.id,
        name: locals.user.name || locals.user.email,
        email: locals.user.email
      }
    };
  } catch (err) {
    console.error('Failed to load viewroom users:', err);
    return {
      users: [],
      company: {
        id: locals.user.id,
        name: locals.user.name || locals.user.email,
        email: locals.user.email
      }
    };
  }
}; 