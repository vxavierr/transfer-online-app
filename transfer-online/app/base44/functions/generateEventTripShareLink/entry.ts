import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { tripId } = await req.json();

        if (!tripId) {
            return Response.json({ error: 'Trip ID required' }, { status: 400 });
        }

        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get trip
        const trip = await base44.entities.EventTrip.get(tripId);
        if (!trip) {
            return Response.json({ error: 'Trip not found' }, { status: 404 });
        }

        // Check if token already exists
        let token = trip.shared_token;
        if (!token) {
            // Generate new token
            token = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
            
            // Save token
            await base44.entities.EventTrip.update(tripId, {
                shared_token: token,
                partner_link_generated_at: new Date().toISOString()
            });
        }

        // Construct full URL
        const origin = req.headers.get("origin") || ""; // Or construct from base url secret if needed
        // Assuming the app base URL is provided or can be inferred. 
        // For now, returning the token and let frontend construct the URL or construct if possible.
        // We will return the relative path.
        
        return Response.json({ 
            success: true, 
            token,
            path: `/PartnerTripView?token=${token}`
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});