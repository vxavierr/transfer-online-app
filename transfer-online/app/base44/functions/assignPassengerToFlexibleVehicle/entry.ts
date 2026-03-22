import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { passengerId, newTripId, token } = await req.json();

        // Authenticate via token or user session
        let authorizedUser = null;

        if (token) {
            const sharedLists = await base44.asServiceRole.entities.SharedReceptiveList.filter({ token });
            if (sharedLists.length > 0) {
                const list = sharedLists[0];
                if (list.active && new Date() <= new Date(list.expires_at)) {
                    const allowedTrips = list.event_trip_ids || [];
                    if (allowedTrips.includes(newTripId)) {
                        authorizedUser = { id: 'coordinator_token', name: list.coordinator_name || 'Coordenador' };
                    }
                }
            }
        }

        if (!authorizedUser) {
            try {
                authorizedUser = await base44.auth.me();
            } catch (e) {}
        }

        if (!authorizedUser) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!passengerId || !newTripId) {
            return Response.json({ error: 'Missing passengerId or newTripId' }, { status: 400 });
        }

        // Get passenger
        const passenger = await base44.entities.EventPassenger.get(passengerId);
        if (!passenger) {
            return Response.json({ error: 'Passenger not found' }, { status: 404 });
        }

        // Get new trip
        const newTrip = await base44.entities.EventTrip.get(newTripId);
        if (!newTrip) {
            return Response.json({ error: 'Trip not found' }, { status: 404 });
        }

        // Check if flexible
        if (!passenger.is_flexible_allocation && !newTrip.is_flexible_vehicle) {
            return Response.json({ error: 'This passenger or vehicle is not flexible' }, { status: 400 });
        }

        // Check capacity
        if (newTrip.vehicle_capacity && newTrip.current_passenger_count >= newTrip.vehicle_capacity) {
            return Response.json({ error: 'Vehicle is full' }, { status: 400 });
        }

        const oldTripId = passenger.event_trip_id;

        // Update passenger
        await base44.entities.EventPassenger.update(passengerId, {
            event_trip_id: newTripId,
            assigned_at_checkin: true,
            boarding_status: 'boarded',
            boarding_time: new Date().toISOString(),
            checkin_by: authorizedUser.id
        });

        // Decrement old trip count
        if (oldTripId && oldTripId !== newTripId) {
            const oldTrip = await base44.entities.EventTrip.get(oldTripId);
            if (oldTrip.is_flexible_vehicle) {
                await base44.entities.EventTrip.update(oldTripId, {
                    current_passenger_count: Math.max(0, (oldTrip.current_passenger_count || 0) - 1)
                });
            }
        }

        // Increment new trip count
        if (newTrip.is_flexible_vehicle) {
            await base44.entities.EventTrip.update(newTripId, {
                current_passenger_count: (newTrip.current_passenger_count || 0) + 1
            });
        }

        return Response.json({
            success: true,
            message: 'Passageiro atribuído ao veículo com sucesso'
        });

    } catch (error) {
        console.error('Error assigning passenger:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});