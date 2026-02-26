import { json, type RequestHandler } from '@sveltejs/kit';

function generateShortId(length = 10): string {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.pb?.authStore.isValid) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized'
        }), { status: 401 });
    }

    const formData = await request.formData();
    const title = formData.get('title')?.toString();
    const isActive = formData.has('is_active');

    // Get the arrays from the form data
    const hostContent = formData.get('host_content[]')?.toString().split(',').filter(Boolean) || [];
    const repContent = formData.get('representative_content[]')?.toString().split(',').filter(Boolean) || [];
    const representatives = formData.get('representative[]')?.toString().split(',').filter(Boolean) || [];

    console.log('Host content:', hostContent);
    console.log('Representative content:', repContent);
    console.log('Representatives:', representatives);

    if (!title) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Title is required'
        }), { status: 400 });
    }

    try {
        const shortId = generateShortId(10);
        const data = {
            room_id: shortId,
            title,
            is_active: isActive,
            host_content: hostContent,
            representative_content: repContent,
            representative: representatives,
            owner_company: locals.pb.authStore.model.id
        };

        console.log('Creating room with data:', data);

        const record = await locals.pb.collection('rooms').create(data);
        console.log('Created room:', record);

        return new Response(JSON.stringify({
            success: true,
            room: record
        }), { status: 200 });
    } catch (err) {
        console.error('Error creating room:', err);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to create room'
        }), { status: 500 });
    }
}; 