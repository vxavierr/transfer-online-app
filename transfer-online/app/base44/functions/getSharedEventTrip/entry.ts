import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { token } = await req.json();

        if (!token) {
            return Response.json({ error: 'Token required' }, { status: 400 });
        }

        // Find trip by token
        // Since we can't filter by a field directly without listing if not indexed (but usually ok for small datasets or if indexed)
        // Ideally we should have filtering. Assuming EventTrip is filterable.
        
        const trips = await base44.asServiceRole.entities.EventTrip.filter({ shared_token: token });
        
        if (!trips || trips.length === 0) {
            return Response.json({ error: 'Trip not found or invalid token' }, { status: 404 });
        }

        const trip = trips[0];

        // Fetch passengers
        const passengers = await base44.asServiceRole.entities.EventPassenger.filter({ event_trip_id: trip.id });

        // Fetch Event details (for name/logo context if needed)
        const event = await base44.asServiceRole.entities.Event.get(trip.event_id);

        return Response.json({
            success: true,
            trip,
            passengers,
            event: {
                name: event.event_name,
                date: event.start_date
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});