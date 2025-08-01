import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const website = formData.get('website') as string;

    if (!name || !email || !phone) {
        return new Response(JSON.stringify({ 
            type: 'failure', 
            data: { message: 'Name, email, and phone are required' } 
        }), { status: 400 });
    }

    try {
        // Create the user record
        const userData = {
            name,
            email,
            phone,
            website: website || '',
            emailVisibility: true,
            password: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15), // Generate random password
            passwordConfirm: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        };

        const record = await locals.pb.collection('users').create(userData);

        // Send verification email/SMS
        // This would typically trigger a verification process
        
        return new Response(JSON.stringify({ 
            type: 'success', 
            data: { 
                success: true,
                verification_required: true,
                email: record.email,
                phone: record.phone,
                company_name: record.name
            } 
        }), { status: 200 });
    } catch (error) {
        console.error('Registration error:', error);
        return new Response(JSON.stringify({ 
            type: 'failure', 
            data: { message: 'Registration failed' } 
        }), { status: 500 });
    }
}; 