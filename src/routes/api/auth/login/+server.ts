import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        return new Response(JSON.stringify({ 
            type: 'failure', 
            data: { message: 'Email and password are required' } 
        }), { status: 400 });
    }

    try {
        const authData = await locals.pb.authWithPassword(email, password);
        
        if (authData?.token) {
            // Persist session token via cookie
            cookies.set('session', authData.token, {
                path: '/',
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30
            });

            return new Response(JSON.stringify({ 
                type: 'success', 
                data: { 
                    user: authData.record,
                    success: true,
                    message: 'Login successful! Welcome back.'
                } 
            }), { status: 200 });
        } else {
            return new Response(JSON.stringify({ 
                type: 'failure', 
                data: { message: 'Invalid credentials' } 
            }), { status: 401 });
        }
    } catch (error) {
        console.error('Login error:', error);
        return new Response(JSON.stringify({ 
            type: 'failure', 
            data: { message: 'Login failed' } 
        }), { status: 500 });
    }
}; 