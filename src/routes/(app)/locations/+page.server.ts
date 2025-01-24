import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    try {
        const locations = await locals.pb.collection('locations').getFullList({
            filter: `owner_company = "${locals.user?.id}"`,
            sort: '-created'
        });

        return {
            locations
        };
    } catch (err) {
        console.error('Error loading locations:', err);
        throw error(500, 'Failed to load locations');
    }
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        try {
            const formData = await request.formData();
            const data = {
                name: formData.get('name'),
                address: formData.get('address'),
                city: formData.get('city'),
                phone: formData.get('phone'),
                hours: {
                    Mon: formData.get('Mon'),
                    Tue: formData.get('Tue'),
                    Wed: formData.get('Wed'),
                    Thurs: formData.get('Thurs'),
                    Fri: formData.get('Fri'),
                    Sat: formData.get('Sat'),
                    Sun: formData.get('Sun')
                },
                owner_company: locals.user?.id
            };

            const record = await locals.pb.collection('locations').create(data);
            
            if (!record) {
                return fail(400, {
                    success: false,
                    message: 'Failed to create location'
                });
            }

            return {
                success: true,
                message: 'Location created successfully'
            };
        } catch (err) {
            console.error('Error creating location:', err);
            return fail(400, {
                success: false,
                message: 'Failed to create location'
            });
        }
    },

    update: async ({ request, locals }) => {
        try {
            const formData = await request.formData();
            const id = formData.get('id');
            const data = {
                name: formData.get('name'),
                address: formData.get('address'),
                city: formData.get('city'),
                phone: formData.get('phone'),
                hours: {
                    Mon: formData.get('Mon'),
                    Tue: formData.get('Tue'),
                    Wed: formData.get('Wed'),
                    Thurs: formData.get('Thurs'),
                    Fri: formData.get('Fri'),
                    Sat: formData.get('Sat'),
                    Sun: formData.get('Sun')
                }
            };

            const record = await locals.pb.collection('locations').update(id as string, data);
            
            if (!record) {
                return fail(400, {
                    success: false,
                    message: 'Failed to update location'
                });
            }

            return {
                success: true,
                message: 'Location updated successfully'
            };
        } catch (err) {
            console.error('Error updating location:', err);
            return fail(400, {
                success: false,
                message: 'Failed to update location'
            });
        }
    },

    delete: async ({ request, locals }) => {
        try {
            const formData = await request.formData();
            const id = formData.get('id');

            await locals.pb.collection('locations').delete(id as string);
            
            return {
                success: true,
                message: 'Location deleted successfully'
            };
        } catch (err) {
            console.error('Error deleting location:', err);
            return fail(400, {
                success: false,
                message: 'Failed to delete location'
            });
        }
    }
}; 