import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { passengerId, fromTripId, toTripId, token } = await req.json();

        // Authenticate
        let authorizedUser = null;

        // Token-based auth (coordinator)
        if (token) {
            const sharedLists = await base44.asServiceRole.entities.SharedReceptiveList.filter({ token });
            if (sharedLists.length > 0) {
                const list = sharedLists[0];
                if (list.active && new Date() <= new Date(list.expires_at)) {
                    const allowedTrips = list.event_trip_ids || [];
                    if (allowedTrips.includes(fromTripId) && allowedTrips.includes(toTripId)) {
                        authorizedUser = { id: 'coordinator_token', name: list.coordinator_name || 'Coordenador' };
                    }
                }
            }
        }

        // User-based auth
        if (!authorizedUser) {
            try {
                authorizedUser = await base44.auth.me();
            } catch (e) {
                // Not authenticated
            }
        }

        if (!authorizedUser) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Validate inputs
        if (!passengerId || !fromTripId || !toTripId) {
            return Response.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        if (fromTripId === toTripId) {
            return Response.json({ error: 'Cannot transfer to the same trip' }, { status: 400 });
        }

        // Get passenger
        const passenger = await base44.entities.EventPassenger.get(passengerId);
        if (!passenger) {
            return Response.json({ error: 'Passenger not found' }, { status: 404 });
        }

        // Verify passenger belongs to fromTrip
        if (passenger.event_trip_id !== fromTripId) {
            return Response.json({ error: 'Passenger does not belong to the source trip' }, { status: 400 });
        }

        // Get both trips
        const fromTrip = await base44.entities.EventTrip.get(fromTripId);
        const toTrip = await base44.entities.EventTrip.get(toTripId);

        if (!fromTrip || !toTrip) {
            return Response.json({ error: 'One or both trips not found' }, { status: 404 });
        }

        // Verify both trips belong to same event
        if (fromTrip.event_id !== toTrip.event_id) {
            return Response.json({ error: 'Trips must belong to the same event' }, { status: 400 });
        }

        // Check capacity of destination trip (if defined)
        if (toTrip.vehicle_capacity && toTrip.passenger_count >= toTrip.vehicle_capacity) {
            return Response.json({ error: 'Destination trip is at full capacity' }, { status: 400 });
        }

        // Update passenger
        const updatedPassenger = await base44.entities.EventPassenger.update(passengerId, {
            event_trip_id: toTripId,
            boarding_status: 'pending', // Reset status on transfer
            boarding_time: null
        });

        // Update passenger counts
        const fromTripNewCount = Math.max(0, (fromTrip.passenger_count || 0) - 1);
        const toTripNewCount = (toTrip.passenger_count || 0) + 1;

        await base44.entities.EventTrip.update(fromTripId, {
            passenger_count: fromTripNewCount
        });

        await base44.entities.EventTrip.update(toTripId, {
            passenger_count: toTripNewCount
        });

        // Log the transfer action (optional - could add to a history table if needed)
        console.log(`[Transfer] ${passenger.passenger_name} transferred from trip ${fromTripId} to ${toTripId} by ${authorizedUser.id}`);

        return Response.json({
            success: true,
            passenger: updatedPassenger,
            fromTrip: { ...fromTrip, passenger_count: fromTripNewCount },
            toTrip: { ...toTrip, passenger_count: toTripNewCount },
            message: `${passenger.passenger_name} transferido com sucesso!`
        });

    } catch (error) {
        console.error('Transfer error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});