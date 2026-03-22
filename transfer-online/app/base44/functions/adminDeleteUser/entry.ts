import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { userId } = await req.json();

        if (!userId) {
            return Response.json({ error: 'userId is required' }, { status: 400 });
        }

        await base44.asServiceRole.entities.User.delete(userId);

        return Response.json({ success: true, userId });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});