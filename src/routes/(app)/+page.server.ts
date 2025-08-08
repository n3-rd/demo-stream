import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { pb } from '$lib/pocketbase';

export const load = async ({ locals }) => {
    if (!locals.pb) {
        throw error(500, 'Database connection not available');
    }

    try {
        // Check if user is authenticated
        if (!locals.pb.authStore.isValid) {
            return {
                room: null,
                hostContent: [],
                representativeContent: [],
                contentLibrary: [],
                user: null
            };
        }

        const user = locals.pb.authStore.model;

        let room = null;
        
        // Try to fetch the last room with its content
        try {
            room = await locals.pb.collection('rooms').getFirstListItem('', {
                sort: '-created',
                expand: 'host_content,representative_content',
                fields: 'id,title,is_active,host_content,representative_content,owner_company'
            });
        } catch (roomErr) {
            // If no rooms exist, continue with empty room data
            console.log('No rooms found:', roomErr);
        }

        // Fetch all content owned by this company, similar to content-library approach
        const allContent = await locals.pb.collection('content_library').getFullList({
            filter: `owner_company = "${user.id}"`,
            sort: '-created',
            fields: 'id,title,thumbnail,type,file,library_type'
        });

        // Separate content by type
        const hostContent = allContent.filter(item => 
            item.library_type === 'host' || 
            (Array.isArray(item.library_type) && item.library_type.includes('host'))
        );
        
        const representativeContent = allContent.filter(item => 
            item.library_type === 'representative' || 
            (Array.isArray(item.library_type) && item.library_type.includes('representative'))
        );
        
        // Recent content for the library section
        const contentLibrary = allContent.slice(0, 10);

        return {
            room: room ? structuredClone(room) : null,
            hostContent: structuredClone(hostContent),
            representativeContent: structuredClone(representativeContent),
            contentLibrary: structuredClone(contentLibrary),
            user
        };
    } catch (err) {
        console.error('Error loading dashboard data:', err);
        // Return empty data instead of throwing an error
        return {
            room: null,
            hostContent: [],
            representativeContent: [],
            contentLibrary: [],
            user: locals.pb.authStore.isValid ? locals.pb.authStore.model : null
        };
    }
};

