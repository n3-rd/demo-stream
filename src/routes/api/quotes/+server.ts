import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/db/drizzle';
import { quotes } from '$lib/db/schema';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.pb?.authStore.isValid) {
        return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const user = locals.pb.authStore.model as { id: string; email?: string };
    if (!user?.id) {
        return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json() as { first_name?: string; last_name?: string; phone?: string; email?: string; description?: string };
        const [quote] = await db.insert(quotes).values({
            firstName: body.first_name ?? null,
            lastName: body.last_name ?? null,
            phone: body.phone ?? null,
            email: body.email ?? null,
            description: body.description ?? null,
            toCompany: user.id
        }).returning();

        return json({
            success: true,
            quote: quote,
            ownerEmail: user.email ?? null
        });
    } catch (e) {
        console.error('Error creating quote:', e);
        return json({ success: false, message: 'Failed to create quote' }, { status: 500 });
    }
};
