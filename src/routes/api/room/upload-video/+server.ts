import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.pb?.authStore.isValid) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Unauthorized'
        }), { status: 401 });
    }

    const userId = locals.pb.authStore.model.id;
    console.log('userId:', userId);

    const formData = new FormData();
    const data = await request.formData();
    let name = data.get('name') as string;
    let video = data.get('video') as File;

    if (!video) {
        return new Response(JSON.stringify({
            success: false,
            message: 'No video was uploaded'
        }), { status: 400 });
    }

    // Append the video file to the form data
    formData.append('video', video);

    // Append the user id to the form data
    formData.append('user', userId);
    if (name) {
        formData.append('name', name);
    }

    // Upload and create new record
    try {
        const result = await locals.pb.collection('videos').create(formData);
        console.log('result:', result);
        return new Response(JSON.stringify({
            success: true,
            message: 'Video uploaded successfully'
        }), { status: 200 });
    } catch (err) {
        console.log('err:', err);
        return new Response(JSON.stringify({
            success: false,
            message: 'Failed to upload video'
        }), { status: 500 });
    }
}; 