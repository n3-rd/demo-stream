import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.pb.authStore.isValid) {
        redirect(304, '/login')
        return;
    }

    const user = locals.pb.authStore.model;

    try {
        const representatives = await locals.pb.collection('representatives').getFullList({
            filter: `company = "${user.id}"`,
            sort: '-created',
            expand: 'connected_content'
        });

        return {
            user,
            representatives
        };
    } catch (err) {
        console.error('Error fetching representatives:', err);
        return {
            user,
            representatives: []
        };
    }
};

export const actions: Actions = {
    addRepresentative: async ({ request, locals }) => {
        if (!locals.pb.authStore.isValid) {
            throw error(401, 'Unauthorized');
        }

        const user = locals.pb.authStore.model;
        const formData = await request.formData();

        try {
            const schedule = {
                monday: formData.get('monday'),
                tuesday: formData.get('tuesday'),
                friday: formData.get('friday'),
                saturday: formData.get('saturday')
            };

            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                company: user.id,
                is_active: true,
                schedule
            };

            const avatar = formData.get('avatar');
            if (avatar instanceof File && avatar.size > 0) {
                Object.assign(data, { avatar });
            }

            await locals.pb.collection('representatives').create(data);

            return {
                type: 'success'
            };
        } catch (err) {
            console.error('Error adding representative:', err);
            return fail(400, {
                type: 'error',
                message: 'Failed to add representative'
            });
        }
    },

    updateRepresentative: async ({ request, locals }) => {
        if (!locals.pb.authStore.isValid) {
            throw error(401, 'Unauthorized');
        }

        const formData = await request.formData();
        const id = formData.get('id') as string;

        try {
            const schedule = {
                monday: formData.get('monday'),
                tuesday: formData.get('tuesday'),
                friday: formData.get('friday'),
                saturday: formData.get('saturday')
            };

            const data: Record<string, any> = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                schedule
            };

            const avatar = formData.get('avatar');
            if (avatar instanceof File && avatar.size > 0) {
                Object.assign(data, { avatar });
            }

            await locals.pb.collection('representatives').update(id, data);

            return {
                type: 'success'
            };
        } catch (err) {
            console.error('Error updating representative:', err);
            return fail(400, {
                type: 'error',
                message: 'Failed to update representative'
            });
        }
    },

    deleteRepresentative: async ({ request, locals }) => {
        if (!locals.pb.authStore.isValid) {
            throw error(401, 'Unauthorized');
        }

        const formData = await request.formData();
        const id = formData.get('id') as string;

        try {
            await locals.pb.collection('representatives').delete(id);

            return {
                type: 'success'
            };
        } catch (err) {
            console.error('Error deleting representative:', err);
            return fail(400, {
                type: 'error',
                message: 'Failed to delete representative'
            });
        }
    }
};