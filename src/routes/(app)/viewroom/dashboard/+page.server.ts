import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // hooks ensure viewroom session on /viewroom/* (except login)
  const companyId = locals.viewroomUser?.company || locals.pb?.authStore?.model?.id || null;

  try {
    const content = companyId
      ? await locals.pb.collection('content_library').getFullList({
          filter: `owner_company = "${companyId}"`,
          sort: '-created',
          fields: 'id,title,thumbnail,type,file,library_type'
        })
      : [];

    return { content };
  } catch (err) {
    console.error('Failed to load viewroom content:', err);
    return { content: [] };
  }
}; 