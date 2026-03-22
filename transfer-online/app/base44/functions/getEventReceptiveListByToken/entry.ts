import { createClientFromRequest } from 'npm:@base44/sdk@0.8.11';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        
        const { token } = body;

        if (!token) {
            return Response.json({ error: 'Token required' }, { status: 400 });
        }

        // 1. Fetch Shared List
        const sharedLists = await base44.asServiceRole.entities.SharedReceptiveList.filter({ token });
        if (sharedLists.length === 0) {
            return Response.json({ error: 'Invalid token' }, { status: 404 });
        }
        const sharedList = sharedLists[0];

        if (!sharedList.active) {
            return Response.json({ error: 'Link inactive' }, { status: 403 });
        }

        if (new Date() > new Date(sharedList.expires_at)) {
            return Response.json({ error: 'Link expired' }, { status: 410 });
        }

        if (!sharedList.event_id || !sharedList.event_trip_ids) {
             return Response.json({ error: 'Not an event receptive list' }, { status: 400 });
        }

        // 2. Fetch Event
        const event = await base44.asServiceRole.entities.Event.get(sharedList.event_id).catch(() => null);
        if (!event) {
             return Response.json({ error: 'Event not found' }, { status: 404 });
        }

        // Helper for chunking
        const chunkArray = (arr, size) => {
            const chunks = [];
            for (let i = 0; i < arr.length; i += size) {
                chunks.push(arr.slice(i, i + size));
            }
            return chunks;
        };

        // 3. Fetch Trips (using parallel fetches to fix 422 error from $in queries)
        let validTrips = [];
        const tripIdsToFetch = sharedList.event_trip_ids || [];
        
        if (tripIdsToFetch.length > 0) {
            // Process in chunks to avoid overwhelming the database
            const tripChunks = chunkArray(tripIdsToFetch, 20);
            
            for (const chunk of tripChunks) {
                try {
                    // Fetch trips in parallel
                    const chunkTrips = await Promise.all(
                        chunk.map(id => base44.asServiceRole.entities.EventTrip.get(id).catch(() => null))
                    );
                    validTrips.push(...chunkTrips.filter(Boolean));
                } catch (err) {
                    console.error("Error fetching trip chunk:", err);
                }
            }
        }

        // Sort trips
        validTrips.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.start_time || '00:00'}`);
            const dateB = new Date(`${b.date}T${b.start_time || '00:00'}`);
            return dateA.getTime() - dateB.getTime();
        });

        const tripIds = validTrips.map(t => t.id);
        
        // 4. Fetch All Related Data (STRICTLY SEQUENTIAL)
        
        // Passengers
        // Fetch passengers for each trip in parallel
        let allPassengers = [];
        if (tripIds.length > 0) {
            const tripIdChunks = chunkArray(tripIds, 10);
            
            for (const chunk of tripIdChunks) {
                try {
                    const chunkResults = await Promise.all(
                        chunk.map(tripId => 
                            base44.asServiceRole.entities.EventPassenger.filter({ event_trip_id: tripId }, {}, 1000)
                                .catch(e => { console.error(`Failed passengers for trip ${tripId}`, e); return []; })
                        )
                    );
                    allPassengers.push(...chunkResults.flat());
                } catch (err) {
                    console.error("Error fetching passengers chunk:", err);
                }
            }
        }

        // Drivers
        const driverIds = [...new Set(validTrips.map(t => t.driver_id).filter(Boolean))];
        let allDrivers = [];
        if (driverIds.length > 0) {
            const driverChunks = chunkArray(driverIds, 20);
            for (const chunk of driverChunks) {
                try {
                    const chunkDrivers = await Promise.all(
                        chunk.map(id => base44.asServiceRole.entities.Driver.get(id).catch(() => null))
                    );
                    allDrivers.push(...chunkDrivers.filter(Boolean));
                } catch (err) {
                    console.error("Error fetching drivers chunk:", err);
                }
            }
        }

        // Vehicles
        const vehicleIds = [...new Set(validTrips.map(t => t.vehicle_id).filter(Boolean))];
        let allVehicles = [];
        if (vehicleIds.length > 0) {
            const vehicleChunks = chunkArray(vehicleIds, 20);
            for (const chunk of vehicleChunks) {
                try {
                    const chunkVehicles = await Promise.all(
                        chunk.map(id => base44.asServiceRole.entities.DriverVehicle.get(id).catch(() => null))
                    );
                    allVehicles.push(...chunkVehicles.filter(Boolean));
                } catch (err) {
                    console.error("Error fetching vehicles chunk:", err);
                }
            }
        }

        // Build lookup maps
        const passengersByTrip = {};
        allPassengers.forEach(p => {
            if (!passengersByTrip[p.event_trip_id]) passengersByTrip[p.event_trip_id] = [];
            passengersByTrip[p.event_trip_id].push(p);
        });

        const driversMap = {};
        allDrivers.forEach(d => { driversMap[d.id] = d; });

        const vehiclesMap = {};
        allVehicles.forEach(v => { vehiclesMap[v.id] = v; });

        // Fetch Coordinators
        const allCoordinatorIds = new Set();
        validTrips.forEach(t => {
            if (t.coordinator_ids && Array.isArray(t.coordinator_ids)) {
                t.coordinator_ids.forEach(id => allCoordinatorIds.add(id));
            }
            if (t.coordinator_id) {
                allCoordinatorIds.add(t.coordinator_id);
            }
        });

        const coordinatorsMap = {};
        if (allCoordinatorIds.size > 0) {
            const coordIds = Array.from(allCoordinatorIds);
            const coordinators = await Promise.all(
                coordIds.map(id => base44.asServiceRole.entities.Coordinator.get(id).catch(() => null))
            );
            
            coordinators.filter(Boolean).forEach(c => {
                coordinatorsMap[c.id] = c;
            });
        }

        // 5. Construct Response
        const tripsWithPassengers = validTrips.map(trip => {
            const passengers = passengersByTrip[trip.id] || [];
            
            let driverInfo = null;
            
            // 1. Casual Driver
            if (trip.is_casual_driver) {
                driverInfo = {
                    name: trip.casual_driver_name,
                    phone: trip.casual_driver_phone,
                    vehicle_model: trip.casual_driver_vehicle_model,
                    vehicle_plate: trip.casual_driver_vehicle_plate,
                    type: 'Casual'
                };
            } 
            // 2. Internal Driver
            else if (trip.driver_id) {
                const d = driversMap[trip.driver_id];
                if (d) {
                    let vehicleModel = null;
                    let vehiclePlate = null;

                    if (trip.vehicle_id) {
                        const v = vehiclesMap[trip.vehicle_id];
                        if (v) {
                            vehicleModel = v.vehicle_model;
                            vehiclePlate = v.vehicle_plate;
                        }
                    }

                    driverInfo = {
                        name: d.name,
                        phone: d.phone_number,
                        vehicle_model: vehicleModel,
                        vehicle_plate: vehiclePlate,
                        photo_url: d.photo_url,
                        type: 'Interno'
                    };
                }
            }
            // 3. Subcontractor Driver
            else if (trip.subcontractor_driver_name) {
                driverInfo = {
                    name: trip.subcontractor_driver_name,
                    phone: trip.subcontractor_driver_phone,
                    vehicle_model: trip.subcontractor_vehicle_model,
                    vehicle_plate: trip.subcontractor_vehicle_plate,
                    type: 'Parceiro'
                };
            }

            // Resolve coordinators
            let tripCoordinatorIds = [];
            if (trip.coordinator_ids && Array.isArray(trip.coordinator_ids)) {
                tripCoordinatorIds = [...trip.coordinator_ids];
            }
            if (trip.coordinator_id && !tripCoordinatorIds.includes(trip.coordinator_id)) {
                tripCoordinatorIds.push(trip.coordinator_id);
            }

            const tripCoordinators = tripCoordinatorIds.map(id => {
                const c = coordinatorsMap[id];
                return c ? { name: c.name, phone: c.phone_number } : null;
            }).filter(Boolean);

            return {
                ...trip,
                passengers: passengers,
                driver_info: driverInfo,
                coordinators: tripCoordinators
            };
        });

        return Response.json({
            success: true,
            event: event,
            trips: tripsWithPassengers,
            coordinator: {
                name: sharedList.coordinator_name,
                contact: sharedList.coordinator_contact
            }
        });

    } catch (error) {
        console.error('Error getting event list:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});