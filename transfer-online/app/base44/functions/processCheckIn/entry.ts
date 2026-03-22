import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const requestBody = await req.json();
        const { tripId, passengerId, status, token, newTripId } = requestBody;

        let authorizedUser = null;

        // 1. Try Token Authentication (Coordinator via Shared Link)
        if (token) {
            const sharedLists = await base44.asServiceRole.entities.SharedReceptiveList.filter({ token });
            if (sharedLists.length > 0) {
                const list = sharedLists[0];
                if (list.active && new Date() <= new Date(list.expires_at)) {
                    // Valid token. Verify if tripId is allowed in this list.
                    // Support both legacy request_ids (ServiceRequest) and new event_trip_ids (EventTrip)
                    const allowedTrips = list.event_trip_ids || [];
                    // NOTE: If checking in for ServiceRequest (legacy), logic might be different. 
                    // Assuming this function is for EventPassenger check-in mainly based on file context.
                    if (allowedTrips.includes(tripId)) {
                        authorizedUser = { id: 'coordinator_token', name: list.coordinator_name || 'Coordenador (Link)' };
                    }
                }
            }
        }

        // 2. Try User Authentication (Staff/Driver logged in)
        if (!authorizedUser) {
            try {
                authorizedUser = await base44.auth.me();
            } catch (e) {}
        }

        if (!authorizedUser) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!tripId || !passengerId) {
            return Response.json({ error: 'Missing tripId or passengerId' }, { status: 400 });
        }

        const boardingStatus = status || 'boarded'; // Default to 'boarded' for backward compatibility

        // Verify Passenger exists and belongs to trip
        const passenger = await base44.entities.EventPassenger.get(passengerId);
        
        if (!passenger) {
            return Response.json({ error: 'Passenger not found' }, { status: 404 });
        }

        if (passenger.event_trip_id !== tripId) {
            return Response.json({ error: 'Passenger does not belong to this trip' }, { status: 400 });
        }

        if (passenger.boarding_status === boardingStatus) {
             return Response.json({ 
                 success: true, 
                 alreadyUpdated: true,
                 passenger: passenger,
                 message: `Passageiro já está com status: ${boardingStatus}.` 
             });
        }

        // Handle flexible allocation (porta a porta)
        // If newTripId is provided, reassign passenger to a different vehicle
        let targetTripId = tripId;
        if (newTripId && newTripId !== tripId) {
            const newTrip = await base44.entities.EventTrip.get(newTripId);
            if (!newTrip) {
                return Response.json({ error: 'New trip not found' }, { status: 404 });
            }
            
            // Check capacity
            if (newTrip.vehicle_capacity && newTrip.current_passenger_count >= newTrip.vehicle_capacity) {
                return Response.json({ error: 'Vehicle is full' }, { status: 400 });
            }
            
            targetTripId = newTripId;
        }

        // Update status
        const updateData = {
            boarding_status: boardingStatus,
            boarding_time: new Date().toISOString(),
            checkin_by: authorizedUser.id
        };
        
        // If reassigning to new vehicle, update trip assignment
        if (newTripId && newTripId !== tripId) {
            updateData.event_trip_id = newTripId;
            updateData.assigned_at_checkin = true;
            
            // Update old trip passenger count
            const oldTrip = await base44.entities.EventTrip.get(tripId);
            if (oldTrip.is_flexible_vehicle && boardingStatus === 'boarded') {
                await base44.entities.EventTrip.update(tripId, {
                    current_passenger_count: Math.max(0, (oldTrip.current_passenger_count || 0) - 1)
                });
            }
            
            // Update new trip passenger count
            const newTrip = await base44.entities.EventTrip.get(newTripId);
            if (newTrip.is_flexible_vehicle && boardingStatus === 'boarded') {
                await base44.entities.EventTrip.update(newTripId, {
                    current_passenger_count: (newTrip.current_passenger_count || 0) + 1
                });
            }
        } else {
            // Just updating boarding status on same trip
            const currentTrip = await base44.entities.EventTrip.get(tripId);
            if (currentTrip.is_flexible_vehicle) {
                const wasBoarded = passenger.boarding_status === 'boarded';
                const nowBoarded = boardingStatus === 'boarded';
                
                let countChange = 0;
                if (!wasBoarded && nowBoarded) countChange = 1;
                if (wasBoarded && !nowBoarded) countChange = -1;
                
                if (countChange !== 0) {
                    await base44.entities.EventTrip.update(tripId, {
                        current_passenger_count: Math.max(0, (currentTrip.current_passenger_count || 0) + countChange)
                    });
                }
            }
        }
        
        const updated = await base44.entities.EventPassenger.update(passengerId, updateData);

        // Fetch Trip info for display
        const trip = await base44.entities.EventTrip.get(targetTripId);

        return Response.json({
            success: true,
            passenger: updated,
            trip: trip,
            message: boardingStatus === 'boarded' ? 'Check-in realizado com sucesso!' : 'Passageiro marcado como No Show!'
        });

    } catch (error) {
        console.error('Check-in error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});