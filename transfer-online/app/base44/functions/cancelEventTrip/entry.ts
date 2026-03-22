import { createClientFromRequest } from 'npm:@base44/sdk@0.8.12';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch (e) {
      console.warn('Auth check failed:', e);
    }

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId, cancellationReason } = await req.json();

    if (!tripId) {
      return Response.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    // Fetch trip with Service Role to ensure access
    const trips = await base44.asServiceRole.entities.EventTrip.filter({ id: tripId });
    if (!trips || trips.length === 0) {
        return Response.json({ error: 'Trip not found' }, { status: 404 });
    }
    const currentTrip = trips[0];

    // Fetch event to check permissions
    const events = await base44.asServiceRole.entities.Event.filter({ id: currentTrip.event_id });
    const event = events.length > 0 ? events[0] : null;

    const isAdmin = user.role === 'admin';
    const isEventManager = user.event_access_active;
    let isSupplierOwner = false;
    
    if (user.supplier_id && event && event.supplier_id === user.supplier_id) {
        isSupplierOwner = true;
    }

    if (!isAdmin && !isEventManager && !isSupplierOwner) {
        return Response.json({ error: 'Access denied. You do not have permission to cancel this trip.' }, { status: 403 });
    }

    // Update the EventTrip status and cancellation reason
    const updatedTrip = await base44.asServiceRole.entities.EventTrip.update(tripId, {
        status: 'cancelled',
        driver_trip_status: 'cancelada_motorista', // Also update driver-specific status
        cancellation_reason: cancellationReason || 'Cancelado pelo gestor do evento.',
        driver_id: null, // Clear driver assignment
        vehicle_id: null, // Clear vehicle assignment
        subcontractor_id: null, // Clear subcontractor assignment
        casual_driver_name: null, // Clear casual driver info
        casual_driver_phone: null,
        casual_driver_vehicle_model: null,
        casual_driver_vehicle_plate: null,
        is_casual_driver: false,
        event_casual_driver_id: null,
    });

    // Update related EventPassenger entities to 'cancelled' status
    const passengersToUpdate = await base44.asServiceRole.entities.EventPassenger.filter({ event_trip_id: tripId });
    if (passengersToUpdate && passengersToUpdate.length > 0) {
        const passengerUpdates = passengersToUpdate.map(p => ({
            id: p.id,
            status: 'cancelled',
            boarding_status: 'cancelled',
            event_trip_id: null // Unassign from the trip
        }));
        await base44.asServiceRole.entities.EventPassenger.bulkUpdate(passengerUpdates);
    }
    
    // Sync event counts (fire and forget / non-blocking check)
    try {
        await base44.functions.invoke('syncEventCounts', { eventId: currentTrip.event_id });
    } catch (syncError) {
        console.warn('Warning: Failed to sync event counts after cancellation:', syncError);
        // Do not fail the request if sync fails
    }

    return Response.json({ success: true, trip: updatedTrip });

  } catch (error) {
    console.error('Error cancelling trip:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});