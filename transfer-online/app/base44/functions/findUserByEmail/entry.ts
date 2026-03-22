import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { email } = await req.json();

        if (!email) {
            return Response.json({ error: 'Email is required' }, { status: 400 });
        }

        const cleanEmail = email.trim();

        // 1. Try exact match with service role
        let users = await base44.asServiceRole.entities.User.filter({ email: cleanEmail });
        
        if (users.length === 0) {
            // 2. Try case-insensitive match by listing all (fallback)
            // Note: In production with millions of users this is bad, but for this app it should be fine.
            // Alternatively, if the DB supports it, use regex. Base44 SDK filter usually supports exact.
            const allUsers = await base44.asServiceRole.entities.User.filter({});
            const found = allUsers.find(u => u.email.toLowerCase() === cleanEmail.toLowerCase());
            if (found) {
                users = [found];
            }
        }

        if (users.length > 0) {
            return Response.json({ user: users[0] });
        } else {
            return Response.json({ user: null });
        }

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});