import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // No auth check required for viewing boarding pass (public link pattern)
        // Security relies on knowing the combination of tripId and passengerId

        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error('[getBoardingPassPublic] Error parsing JSON body:', e);
            return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { tripId, passengerId } = body;
        console.log(`[getBoardingPassPublic] Request for Trip: ${tripId}, Passenger: ${passengerId}`);

        if (!tripId || !passengerId) {
            console.warn('[getBoardingPassPublic] Missing parameters');
            return Response.json({ error: 'Missing parameters' }, { status: 400 });
        }

        let passenger;
        try {
            passenger = await base44.asServiceRole.entities.EventPassenger.get(passengerId);
        } catch (error) {
            console.warn(`[getBoardingPassPublic] Passenger ${passengerId} fetch error:`, error.message);
            // If get() throws on not found, we handle it here
            return Response.json({ error: 'Passenger not found' }, { status: 404 });
        }

        if (!passenger) {
            console.warn(`[getBoardingPassPublic] Passenger ${passengerId} not found (null)`);
            return Response.json({ error: 'Passenger not found' }, { status: 404 });
        }

        // Check for trip mismatch, but allow if passenger has no trip assigned (orphaned/floating)
        // This allows the boarding pass to be viewed even if the linkage is missing in the DB
        if (passenger.event_trip_id && passenger.event_trip_id !== tripId) {
            console.warn(`[getBoardingPassPublic] Mismatch: Passenger Trip ${passenger.event_trip_id} !== Request Trip ${tripId}`);
            if (String(passenger.event_trip_id) !== String(tripId)) {
                 return Response.json({ error: 'Passenger associated with a different trip' }, { status: 404 });
            }
        } else if (!passenger.event_trip_id) {
            console.warn(`[getBoardingPassPublic] Warning: Passenger ${passengerId} has no event_trip_id. Assuming valid context from URL.`);
        }

        let trip;
        try {
            trip = await base44.asServiceRole.entities.EventTrip.get(tripId);
        } catch (error) {
            console.warn(`[getBoardingPassPublic] Trip ${tripId} fetch error:`, error.message);
            return Response.json({ error: 'Trip not found' }, { status: 404 });
        }

        if (!trip) {
            console.warn(`[getBoardingPassPublic] Trip ${tripId} not found (null)`);
            return Response.json({ error: 'Trip not found' }, { status: 404 });
        }

        let event = null;
        if (trip.event_id) {
            try {
                event = await base44.asServiceRole.entities.Event.get(trip.event_id);
            } catch (e) {
                console.warn(`[getBoardingPassPublic] Event ${trip.event_id} not found`, e.message);
            }
        }

        // Fetch driver info if available
        let driver = null;
        let vehicle = null;

        if (trip.driver_id) {
            try {
                driver = await base44.asServiceRole.entities.Driver.get(trip.driver_id);
            } catch (e) {
                console.warn(`[getBoardingPassPublic] Driver ${trip.driver_id} fetch error:`, e.message);
            }
        }

        if (trip.vehicle_id) {
            try {
                vehicle = await base44.asServiceRole.entities.DriverVehicle.get(trip.vehicle_id);
            } catch (e) {
                console.warn(`[getBoardingPassPublic] Vehicle ${trip.vehicle_id} fetch error:`, e.message);
            }
        }

        console.log(`[getBoardingPassPublic] Success for Passenger ${passengerId}`);

        return Response.json({
            success: true,
            data: {
                passenger,
                trip,
                event: event || { event_name: 'Evento' }, // Fallback if event missing
                driver,
                vehicle
            }
        });

    } catch (error) {
        console.error('[getBoardingPassPublic] Unhandled error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});