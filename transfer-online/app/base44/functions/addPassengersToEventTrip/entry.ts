import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Add detailed logging
        console.log('[addPassengers] Starting execution');
        
        const user = await base44.auth.me();

        if (!user) {
            console.warn('[addPassengers] Unauthorized access attempt');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { tripId, passengerIds, newPassengers, replicateExisting } = body;
        
        console.log(`[addPassengers] Processing for tripId: ${tripId}`, { 
            hasPassengerIds: !!passengerIds, 
            passengersCount: passengerIds?.length,
            hasNewPassengers: !!newPassengers,
            newPassengersCount: newPassengers?.length,
            replicateExisting
        });

        if (!tripId) {
            return Response.json({ error: 'Trip ID is required' }, { status: 400 });
        }

        // Validar que pelo menos um dos dois foi fornecido
        const hasExistingPassengers = passengerIds && Array.isArray(passengerIds) && passengerIds.length > 0;
        const hasNewPassengers = newPassengers && Array.isArray(newPassengers) && newPassengers.length > 0;

        if (!hasExistingPassengers && !hasNewPassengers) {
            return Response.json({ error: 'Provide either passengerIds or newPassengers' }, { status: 400 });
        }

        // 1. Get Trip
        const trip = await base44.entities.EventTrip.get(tripId);
        if (!trip) {
            return Response.json({ error: 'Trip not found' }, { status: 404 });
        }

        // 2. Create New Passengers (if provided)
        let createdCount = 0;
        if (hasNewPassengers) {
            for (const newPax of newPassengers) {
                try {
                    const passengerData = {
                        event_id: trip.event_id,
                        event_trip_id: tripId,
                        status: 'assigned',
                        passenger_name: newPax.passenger_name,
                        document_id: newPax.document_id || '',
                        passenger_email: newPax.passenger_email || '',
                        passenger_phone: newPax.passenger_phone || '',
                        trip_type: newPax.trip_type || 'airport_transfer',
                        date: newPax.date || trip.date,
                        time: newPax.time || trip.start_time,
                        origin_address: newPax.origin_address || trip.origin,
                        destination_address: newPax.destination_address || trip.destination,
                        arrival_point: newPax.arrival_point || '',
                        flight_number: newPax.flight_number || '',
                        airline: newPax.airline || ''
                    };

                    await base44.entities.EventPassenger.create(passengerData);
                    createdCount++;
                } catch (e) {
                    console.error('Error creating new passenger:', e);
                }
            }
        }

        // 3. Transfer or Replicate Existing Passengers (if provided)
        let transferredCount = 0;
        let replicatedCount = 0;
        const previousTrips = new Set(); // Track trips that lost passengers
        
        if (hasExistingPassengers) {
            for (const pid of passengerIds) {
                try {
                    const p = await base44.entities.EventPassenger.get(pid);
                    if (p && p.event_id === trip.event_id) {
                        if (replicateExisting) {
                            // Replicate logic
                            const newPassengerData = {
                                ...p,
                                id: undefined,
                                created_date: undefined,
                                updated_date: undefined,
                                event_trip_id: tripId,
                                status: 'assigned',
                                whatsApp_last_sent_at: null,
                                whatsApp_last_sent_status: null,
                                email_last_sent_at: null,
                                email_last_sent_status: null,
                                boarding_status: 'pending',
                                boarding_time: null,
                                checkin_by: null,
                                // Update date/time to match the new trip
                                date: trip.date,
                                time: trip.start_time,
                                origin_address: trip.origin,
                                destination_address: trip.destination
                            };
                            await base44.entities.EventPassenger.create(newPassengerData);
                            replicatedCount++;
                        } else {
                            // Transfer logic
                            if (p.event_trip_id && p.event_trip_id !== tripId) {
                                previousTrips.add(p.event_trip_id);
                            }

                            await base44.entities.EventPassenger.update(pid, {
                                event_trip_id: tripId,
                                status: 'assigned'
                            });
                            transferredCount++;
                        }
                    }
                } catch (e) {
                    console.error(`Error processing passenger ${pid}:`, e);
                }
            }

            // Update passenger counts for all affected trips (only if transferred)
            if (!replicateExisting) {
                for (const oldTripId of previousTrips) {
                    if (!oldTripId) continue;
                    try {
                        console.log(`[addPassengers] Updating count for previous trip: ${oldTripId}`);
                        const oldTripPassengers = await base44.entities.EventPassenger.filter({ 
                            event_trip_id: oldTripId 
                        }, null, 1000);
                        
                        if (Array.isArray(oldTripPassengers)) {
                            await base44.entities.EventTrip.update(oldTripId, {
                                passenger_count: oldTripPassengers.length
                            });
                        }
                    } catch (e) {
                        console.error(`Error updating previous trip ${oldTripId}:`, e);
                    }
                }
            }
        }

        // 4. Update Trip Count
        console.log(`[addPassengers] Updating count for current trip: ${tripId}`);
        const allPassengers = await base44.entities.EventPassenger.filter({ event_trip_id: tripId }, null, 1000);
        
        if (Array.isArray(allPassengers)) {
            await base44.entities.EventTrip.update(tripId, {
                passenger_count: allPassengers.length
            });
        }

        const totalAdded = createdCount + transferredCount + replicatedCount;
        return Response.json({ 
            success: true, 
            message: `${totalAdded} passageiro(s) adicionado(s) à viagem (${createdCount} novos, ${transferredCount} transferidos, ${replicatedCount} replicados)`,
            createdCount,
            transferredCount,
            replicatedCount,
            totalAdded
        });

    } catch (error) {
        console.error('Error adding passengers:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});