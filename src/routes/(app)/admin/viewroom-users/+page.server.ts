import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch }) => {
  // Check if user is authenticated
  if (!locals.user?.id) {
    throw error(401, 'Authentication required');
  }

  try {
    // Fetch viewroom users for this company via API
    const response = await fetch('/api/admin/viewroom-users');
    const result = await response.json();

    return {
      users: result.success ? result.users : [],
      company: {
        id: locals.user.id,
        name: (locals.user as any).company_name || locals.user.email,
        email: locals.user.email
      }
    };
  } catch (err) {
    console.error('Failed to load viewroom users:', err);
    return {
      users: [],
      company: {
        id: locals.user.id,
        name: (locals.user as any).company_name || locals.user.email,
        email: locals.user.email
      }
    };
  }
}; 