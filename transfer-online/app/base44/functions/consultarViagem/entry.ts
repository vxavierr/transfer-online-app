import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        if (req.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, Client-Token',
                }
            });
        }

        const base44 = createClientFromRequest(req);
        const { name, identifier } = await req.json();

        if (!name || !identifier) {
            return Response.json({ error: 'Nome e identificador (telefone ou documento) são obrigatórios' }, { status: 400 });
        }

        // Clean identifier (remove non-digits if it looks like a phone/cpf)
        const cleanIdentifier = identifier.replace(/\D/g, '');
        
        // Function to escape special characters for regex
        const escapeRegex = (string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };
        
        const escapedName = escapeRegex(name.trim());

        // 1. Find all passengers matching the name (anchored at start to optimize)
        const passengers = await base44.entities.EventPassenger.filter({
            passenger_name: { $regex: `^${escapedName}`, $options: 'i' } 
        });

        if (!passengers || passengers.length === 0) {
             return Response.json({ found: false, message: 'Passageiro não encontrado com esse nome.' }, {
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Filter all matching passengers by identifier AND exact name match
        const matchedPassengers = passengers.filter(p => {
            const passengerFullName = (p.passenger_name || p.name || '').trim();
            const phone = (p.passenger_phone || p.phone_number || '').replace(/\D/g, '');
            const doc = (p.document_number || '').replace(/\D/g, '');
            
            // Check if identifier matches phone (end of string to handle variable country codes) or full document
            // Added check for cleanIdentifier.length > 6 to ensure reasonable phone number length before trying endsWith
            const isPhoneMatch = phone.endsWith(cleanIdentifier) || (cleanIdentifier.length > 6 && cleanIdentifier.endsWith(phone));
            const isDocMatch = doc === cleanIdentifier;

            // Ensure exact match for the name against the input nameQuery, case-insensitive
            const isNameExactMatch = passengerFullName.localeCompare(name.trim(), undefined, { sensitivity: 'base' }) === 0;

            return (isPhoneMatch || isDocMatch) && isNameExactMatch;
        });

        if (matchedPassengers.length === 0) {
            return Response.json({ found: false, message: 'Dados de identificação não conferem.' }, {
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }
        
        const results = [];

        for (const mp of matchedPassengers) {
            // Ensure passenger is linked to an event trip
            if (!mp.event_trip_id) {
                continue;
            }

            const trip = await base44.entities.EventTrip.get(mp.event_trip_id);
            if (!trip) {
                continue;
            }

            const event = await base44.entities.Event.get(trip.event_id);

            let driverName = "A definir";
            let driverPhone = "";
            let vehicleInfo = trip.vehicle_type_category || "A definir";
            let coordinatorContact = null;

            if (trip.is_casual_driver && trip.casual_driver_name) {
                driverName = trip.casual_driver_name;
                driverPhone = trip.casual_driver_phone || "";
                vehicleInfo = `${trip.casual_driver_vehicle_model || 'Veículo'} ${trip.casual_driver_vehicle_plate || ''}`;
            } else if (trip.subcontractor_driver_name) {
                driverName = trip.subcontractor_driver_name;
                driverPhone = trip.subcontractor_driver_phone || "";
                vehicleInfo = `${trip.subcontractor_vehicle_model || 'Veículo'} ${trip.subcontractor_vehicle_plate || ''}`;
            } else if (trip.driver_id) {
                try {
                    const driver = await base44.entities.Driver.get(trip.driver_id);
                    if (driver) {
                        driverName = driver.full_name || driver.name;
                        driverPhone = driver.phone_number || driver.phone;
                    }
                } catch(e) {} // Suppress errors if driver not found
            }

            if (trip.vehicle_id) {
                try {
                    const vehicle = await base44.entities.DriverVehicle.get(trip.vehicle_id);
                    if (vehicle) {
                         vehicleInfo = `${vehicle.vehicle_model || vehicle.model} ${vehicle.vehicle_plate || vehicle.plate}`;
                    }
                } catch(e) {} // Suppress errors if vehicle not found
            }

            // Coordinator
            if (trip.coordinator_ids && trip.coordinator_ids.length > 0) {
                try {
                    const coordinator = await base44.entities.Coordinator.get(trip.coordinator_ids[0]);
                    if (coordinator) {
                        coordinatorContact = { name: coordinator.name, phone: coordinator.phone_number };
                    }
                } catch(e) {} // Suppress errors if coordinator not found
            }

            let groupFlights = [];
            let groupDepartureText = null;
            
            // Only fetch if grouped logic is relevant
            const allTripPassengers = await base44.entities.EventPassenger.filter({ event_trip_id: trip.id }, {}, 100);
            const validFlights = allTripPassengers
                .map(p => p.flight_number ? p.flight_number.trim() : null)
                .filter(f => f);
            
            const uniqueFlights = [...new Set(validFlights)];
            if (uniqueFlights.length > 1) {
                groupFlights = uniqueFlights;
                groupDepartureText = "Após chegada de todos";
            }

            results.push({
                passengerId: mp.id, // Added passengerId for QR code
                passengerName: mp.passenger_name || mp.name,
                eventName: event ? event.event_name : 'Evento',
                trip: {
                    id: trip.id,
                    date: trip.date,
                    time: trip.start_time,
                    origin: trip.origin,
                    destination: trip.destination,
                    status: trip.status,
                    vehicleInfo: mp.is_flexible_allocation ? (trip.name || "Porta a Porta") : vehicleInfo,
                    driverName: mp.is_flexible_allocation ? null : driverName,
                    driverPhone: mp.is_flexible_allocation ? null : driverPhone,
                    coordinatorContact,
                    groupFlights,
                    groupDepartureText,
                    stops: trip.additional_stops,
                    isGrouped: uniqueFlights.length > 1,
                    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${Deno.env.get('BASE_URL')}/checkin?tripId=${trip.id}&passengerId=${mp.id}`)}`
                }
            });
        }

        if (results.length === 0) {
            return Response.json({ found: false, message: 'Nenhuma viagem encontrada para este passageiro com os dados fornecidos.' }, {
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        return Response.json({ found: true, results: results }, {
            headers: { 'Access-Control-Allow-Origin': '*' }
        });

    } catch (error) {
        console.error('Error consulting trip:', error);
        return Response.json({ error: error.message }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
});