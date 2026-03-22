import { createClientFromRequest } from 'npm:@base44/sdk@0.8.11';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // No authentication required (public link), but we validate the token
        
        const { token, tripId, driverName, driverPhone, driverDocument, vehicleModel, vehiclePlate, vehicleColor, serviceCost } = await req.json();

        if (!token || !tripId) {
            return Response.json({ success: false, error: 'Token and Trip ID are required' }, { status: 400 });
        }

        // 1. Validate Token (get SharedTripList)
        const sharedLists = await base44.asServiceRole.entities.SharedTripList.filter({ token: token });
        
        if (!sharedLists || sharedLists.length === 0) {
             return Response.json({ success: false, error: 'Invalid token' }, { status: 404 });
        }
        
        const sharedList = sharedLists[0];
        
        if (!sharedList.active) {
            return Response.json({ success: false, error: 'Link is inactive' }, { status: 403 });
        }
        
        // Check expiration
        if (new Date(sharedList.expires_at) < new Date()) {
             return Response.json({ success: false, error: 'Link expired' }, { status: 403 });
        }

        // 2. Validate if the Trip belongs to this Shared List context
        // This is a bit complex because the shared list can be dynamic (filters) or static (trip_ids)
        // For security, we should check if the trip matches the list criteria.
        
        const trip = await base44.asServiceRole.entities.EventTrip.get(tripId);
        
        if (!trip) {
            return Response.json({ success: false, error: 'Trip not found' }, { status: 404 });
        }

        // Simple validation: if shared list has specific event_id or subcontractor_id filters, match them
        if (sharedList.filters) {
             if (sharedList.filters.event_id && trip.event_id !== sharedList.filters.event_id) {
                 return Response.json({ success: false, error: 'Trip does not belong to this event context' }, { status: 403 });
             }
             if (sharedList.filters.subcontractor_id && trip.subcontractor_id !== sharedList.filters.subcontractor_id) {
                 // Warning: Sometimes admin might want to edit it? But here it's the partner editing via public link.
                 // So they should only edit their own trips.
                 return Response.json({ success: false, error: 'Trip not assigned to this partner' }, { status: 403 });
             }
        } else if (sharedList.trip_ids && sharedList.trip_ids.length > 0) {
             if (!sharedList.trip_ids.includes(tripId)) {
                  // Wait, EventTrip IDs are in event_trip_ids usually? 
                  // SharedTripList schema says "trip_ids" (array of strings).
                  if (!sharedList.trip_ids.includes(tripId)) {
                       return Response.json({ success: false, error: 'Trip not in this shared list' }, { status: 403 });
                  }
             }
        }
        
        // 3. Update the Trip
        await base44.asServiceRole.entities.EventTrip.update(tripId, {
            subcontractor_driver_name: driverName,
            subcontractor_driver_phone: driverPhone,
            subcontractor_driver_document: driverDocument,
            subcontractor_vehicle_model: vehicleModel,
            subcontractor_vehicle_plate: vehiclePlate,
            subcontractor_vehicle_color: vehicleColor,
            subcontractor_cost: serviceCost,
            subcontractor_info_updated_at: new Date().toISOString(),
            subcontractor_info_status: 'pending_review' // Set status to pending review on update
        });

        return Response.json({ success: true });

    } catch (error) {
        console.error('Error updating subcontractor info:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});