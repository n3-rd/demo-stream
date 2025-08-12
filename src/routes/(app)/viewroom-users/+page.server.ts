import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user?.id) {
    throw error(401, 'Authentication required');
  }

  try {
    const users = await locals.pb.collection('viewroom_users').getFullList({
      filter: `company = "${locals.user.id}"`,
      sort: '-created',
      fields: 'id,login_name,first_name,last_name,email,phone,is_active,created_at'
    });

    const normalized = users.map((u: any) => {
      let first_name = u.first_name || '';
      let last_name = u.last_name || '';

      if (!first_name && !last_name && u.login_name) {
        const base = String(u.login_name).replace(/\s+/g, '_');
        const parts = base.split(/[._-]/).filter(Boolean);
        if (parts.length === 1) {
          first_name = parts[0];
        } else if (parts.length >= 2) {
          first_name = parts[0];
          last_name = parts.slice(1).join(' ');
        }
        first_name = first_name.charAt(0).toUpperCase() + first_name.slice(1);
        last_name = last_name.charAt(0).toUpperCase() + last_name.slice(1);
      }

      return {
        id: u.id,
        first_name,
        last_name,
        email: u.email || '',
        phone: u.phone || '',
        is_active: !!u.is_active,
        created: (u as any).created ?? (u as any).created_at
      };
    });

    return {
      users: normalized,
      company: {
        id: locals.user.id,
        name: locals.user.company_name || locals.user.email,
        email: locals.user.email
      }
    };
  } catch (err) {
    console.error('Failed to load viewroom users:', err);
    return {
      users: [],
      company: {
        id: locals.user.id,
        name: locals.user.company_name || locals.user.email,
        email: locals.user.email
      }
    };
  }
}; 