import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const requestBody = await req.json();
        const { passengerId, tripId, token } = requestBody;

        if (!passengerId || !tripId) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Auth check
        let authorizedUser = null;
        if (token) {
            const sharedLists = await base44.asServiceRole.entities.SharedReceptiveList.filter({ token }, undefined, 1);
            if (sharedLists.length === 0) {
                return Response.json({ error: 'Invalid or expired token' }, { status: 403 });
            }
        } else {
            try {
                const user = await base44.auth.me();
                if (!user) {
                    return Response.json({ error: 'Unauthorized' }, { status: 401 });
                }
                authorizedUser = user;
            } catch (authError) {
                console.error('Auth error:', authError);
                return Response.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        // Get passenger
        const passenger = await base44.asServiceRole.entities.EventPassenger.get(passengerId);
        if (!passenger) {
            return Response.json({ error: 'Passenger not found' }, { status: 404 });
        }

        // Verify passenger belongs to this trip
        if (passenger.event_trip_id !== tripId) {
            return Response.json({ error: 'Passenger does not belong to this trip' }, { status: 400 });
        }

        // Update passenger to unassigned status and remove from trip
        await base44.asServiceRole.entities.EventPassenger.update(passengerId, {
            event_trip_id: null,
            status: 'pending'
        });

        // Update trip passenger count
        const trip = await base44.asServiceRole.entities.EventTrip.get(tripId);
        if (trip) {
            await base44.asServiceRole.entities.EventTrip.update(tripId, {
                passenger_count: Math.max(0, (trip.passenger_count || 1) - 1)
            });
        }

        return Response.json({
            success: true,
            message: 'Passageiro removido com sucesso'
        });
    } catch (error) {
        console.error('Error removing passenger:', error);
        return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
});