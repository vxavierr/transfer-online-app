import { createClientFromRequest } from 'npm:@base44/sdk@0.8.12';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tripId, includePassengers } = await req.json();

        if (!tripId) {
            return Response.json({ error: 'Trip ID is required' }, { status: 400 });
        }

        // 1. Fetch original trip
        const originalTrip = await base44.entities.EventTrip.get(tripId);
        if (!originalTrip) {
            return Response.json({ error: 'Trip not found' }, { status: 404 });
        }

        // 2. Prepare new trip data (Clean up sensitive/unique fields)
        const newTripData = {
            ...originalTrip,
            trip_code: null, // Will be auto-generated or left null
            status: 'planned',
            driver_id: null,
            driver_name: null,
            driver_phone: null,
            driver_email: null,
            driver_photo_url: null,
            vehicle_id: null,
            driver_trip_status: 'aguardando',
            driver_access_token: null,
            driver_reminder_1h_sent_at: null,
            driver_notification_sent_at: null,
            shared_token: null,
            partner_link_generated_at: null,
            vehicle_plate_photo_url: null,
            started_at: null,
            current_location_lat: null,
            current_location_lon: null,
            current_heading: null,
            current_speed: null,
            location_last_updated_at: null,
            current_eta_minutes: null,
            eta_last_calculated_at: null,
            driver_trip_status_updated_at: null,
            command_history: [],
            driver_reported_additional_expenses: [],
            is_casual_driver: false,
            casual_driver_name: null,
            casual_driver_phone: null,
            casual_driver_vehicle_model: null,
            casual_driver_vehicle_plate: null,
            event_casual_driver_id: null,
            passenger_count: 0, // Will be updated if passengers are cloned
            current_passenger_count: 0,
            
            // Append (Clone) to name to distinguish
            name: `${originalTrip.name} (Cópia)`,
            
            // Keep critical logistics info
            event_id: originalTrip.event_id,
            date: originalTrip.date,
            start_time: originalTrip.start_time,
            end_time: originalTrip.end_time,
            origin: originalTrip.origin,
            destination: originalTrip.destination,
            vehicle_type_category: originalTrip.vehicle_type_category,
            vehicle_capacity: originalTrip.vehicle_capacity,
            notes: originalTrip.notes,
            partner_notes: originalTrip.partner_notes,
            trip_type: originalTrip.trip_type,
            supplier_cost: originalTrip.supplier_cost,
            client_price: originalTrip.client_price,
            additional_items: originalTrip.additional_items || []
        };

        delete newTripData.id;
        delete newTripData.created_date;
        delete newTripData.updated_date;
        delete newTripData.created_by;

        // 3. Create new trip
        const newTrip = await base44.entities.EventTrip.create(newTripData);

        let clonedPassengersCount = 0;

        // 4. Clone passengers if requested
        if (includePassengers) {
            // Fetch original passengers
            // We use filter with a large limit to get all
            const originalPassengers = await base44.entities.EventPassenger.filter({ event_trip_id: tripId }, {}, 500);
            
            if (originalPassengers.length > 0) {
                // Map old IDs to new IDs to handle relationships (companion/main)
                const idMap = {};
                const passengersToCreate = [];

                // First pass: Prepare data
                for (const p of originalPassengers) {
                    const newPassenger = {
                        ...p,
                        event_trip_id: newTrip.id,
                        status: 'assigned', // They are assigned to the new trip immediately
                        boarding_status: 'pending',
                        boarding_time: null,
                        checkin_by: null,
                        whatsApp_last_sent_at: null,
                        whatsApp_last_sent_status: null,
                        email_last_sent_at: null,
                        email_last_sent_status: null,
                        sms_last_sent_at: null,
                        sms_last_sent_status: null,
                        phone_validation_status: 'unchecked',
                        email_validation_status: 'unchecked',
                        
                        // Keep personal info
                        passenger_name: p.passenger_name,
                        passenger_email: p.passenger_email,
                        passenger_phone: p.passenger_phone,
                        document_id: p.document_id,
                        
                        // Keep trip details (assuming same route/time as trip)
                        date: newTrip.date,
                        time: newTrip.start_time,
                        origin_address: newTrip.origin,
                        destination_address: newTrip.destination,
                        trip_type: p.trip_type,
                        flight_number: p.flight_number,
                        flight_date: p.flight_date,
                        flight_time: p.flight_time,
                        airline: p.airline,
                        arrival_point: p.arrival_point,
                        
                        main_passenger_id: null // Reset for now, will link later if needed or keep flattened
                    };

                    delete newPassenger.id;
                    delete newPassenger.created_date;
                    delete newPassenger.updated_date;
                    delete newPassenger.created_by;

                    passengersToCreate.push({ originalId: p.id, data: newPassenger });
                }

                // Create passengers one by one to get IDs (bulkCreate might not return IDs in order or map easily)
                // For simplicity and relationship handling, we create leaders first if we wanted to maintain hierarchy,
                // but usually cloning flattens or just copies. Let's just create them all.
                // Note: Relationships (main_passenger_id) are tricky to clone perfectly in one go without mapping.
                // If we want to maintain relationships, we need to create main pax first, get ID, then create companions with that ID.
                
                // Strategy: Create all, map oldId -> newId. Then update main_passenger_id if needed.
                // Or simpler: Just create them as independent for now to avoid complexity, unless hierarchy is strict.
                // Assuming hierarchy is important for grouping display.
                
                // Let's try to preserve hierarchy if possible.
                // Separate leaders and companions
                const leaders = passengersToCreate.filter(item => !originalPassengers.find(op => op.id === item.originalId).main_passenger_id);
                const companions = passengersToCreate.filter(item => originalPassengers.find(op => op.id === item.originalId).main_passenger_id);

                // Create leaders
                for (const item of leaders) {
                    const created = await base44.entities.EventPassenger.create(item.data);
                    idMap[item.originalId] = created.id;
                    clonedPassengersCount++;
                }

                // Create companions, setting main_passenger_id from map
                for (const item of companions) {
                    const originalPax = originalPassengers.find(op => op.id === item.originalId);
                    const newMainId = idMap[originalPax.main_passenger_id];
                    
                    // If main pax was cloned, link it. If not (maybe filtered out?), leave as null or link to old? (Better null)
                    if (newMainId) {
                        item.data.main_passenger_id = newMainId;
                    }

                    await base44.entities.EventPassenger.create(item.data);
                    clonedPassengersCount++;
                }

                // Update trip passenger count
                await base44.entities.EventTrip.update(newTrip.id, { 
                    passenger_count: clonedPassengersCount,
                    current_passenger_count: clonedPassengersCount
                });
            }
        }

        return Response.json({ 
            success: true, 
            message: 'Trip cloned successfully',
            newTripId: newTrip.id,
            clonedPassengersCount
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});