import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let eventId = null;
        try {
            const body = await req.json();
            eventId = body.eventId;
        } catch (e) {
            // Body might be empty
        }

        let events = [];
        if (eventId) {
            // Use service role to ensure we can read/update regardless of user permissions context
            // assuming this is a system function
            const event = await base44.asServiceRole.entities.Event.get(eventId);
            if (event) events = [event];
        } else {
            // Obter todos os eventos
            events = await base44.asServiceRole.entities.Event.filter({}, '-created_date', 1000);
        }

        let updatedEvents = 0;

        for (const event of events) {
            try {
                // Contar passageiros using Service Role
                const passengers = await base44.asServiceRole.entities.EventPassenger.filter({ event_id: event.id }, '-created_date', 10000);
                const count = passengers.length;
                
                // Also count trips
                const trips = await base44.asServiceRole.entities.EventTrip.filter({ event_id: event.id }, '-created_date', 10000);
                const tripCount = trips.length;
                
                // Check if update is needed
                if (event.passenger_count !== count || event.trip_count !== tripCount) {
                    await base44.asServiceRole.entities.Event.update(event.id, { 
                        passenger_count: count,
                        trip_count: tripCount // Also sync trip count if field exists/useful
                    });
                    updatedEvents++;
                }
            } catch (err) {
                console.error(`Erro ao processar evento ${event.id}:`, err);
            }
        }

        return Response.json({ success: true, totalEvents: events.length, updatedEvents });
    } catch (error) {
        console.error("Erro no syncEventCounts:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});