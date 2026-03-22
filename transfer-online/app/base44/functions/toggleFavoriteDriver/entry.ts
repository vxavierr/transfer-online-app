import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { driver_id } = body;

        if (!driver_id) {
            return Response.json({ error: 'Driver ID required' }, { status: 400 });
        }

        // Check if already favorite
        const existing = await base44.entities.FavoriteDriver.filter({
            user_id: user.id,
            driver_id: driver_id
        });

        let is_favorite = false;

        if (existing.length > 0) {
            // Remove
            await base44.entities.FavoriteDriver.delete(existing[0].id);
            is_favorite = false;
        } else {
            // Add
            await base44.entities.FavoriteDriver.create({
                user_id: user.id,
                driver_id: driver_id,
                client_id: user.client_id || null,
                notes: 'Favoritado via app'
            });
            is_favorite = true;
        }

        return Response.json({ success: true, is_favorite });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});