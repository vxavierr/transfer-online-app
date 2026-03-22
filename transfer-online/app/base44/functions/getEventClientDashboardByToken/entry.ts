import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { token } = await req.json();

        if (!token) {
            return Response.json({ 
                success: false, 
                error: 'Token não fornecido' 
            }, { status: 400 });
        }

        // Find the shared link
        const sharedLists = await base44.asServiceRole.entities.SharedReceptiveList.filter({ 
            token,
            active: true 
        });

        if (!sharedLists || sharedLists.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'Link inválido ou expirado' 
            }, { status: 404 });
        }

        const sharedList = sharedLists[0];

        // Check if expired
        const now = new Date();
        const expiresAt = new Date(sharedList.expires_at);
        if (now > expiresAt) {
            return Response.json({ 
                success: false, 
                error: 'Link expirado' 
            }, { status: 403 });
        }

        // --- MODO EVENTO (se tiver event_id) ---
        if (sharedList.event_id) {
            // Fetch event
            const event = await base44.asServiceRole.entities.Event.get(sharedList.event_id).catch(() => null);
            
            if (!event) {
                 return Response.json({ success: false, error: 'Evento não encontrado' }, { status: 404 });
            }

            // Fetch all trips for this event (increased limit and aligned sort with EventDetails)
            const allTrips = await base44.asServiceRole.entities.EventTrip.filter({ 
                event_id: sharedList.event_id 
            }, 'date', 1000);

            // Fetch all passengers for this event
            const allPassengers = await base44.asServiceRole.entities.EventPassenger.filter({ 
                event_id: sharedList.event_id 
            }, '-date', 1000);

            // Fetch driver info for trips with drivers (Optimized)
            const driverIds = [...new Set(allTrips.filter(t => t.driver_id).map(t => t.driver_id))];
            const driversMap = {};
            
            if (driverIds.length > 0) {
                try {
                    // Fetch drivers in parallel using list and manual filter if get() fails or just use parallel get()
                    // Parallel get() is the correct way
                    const drivers = await Promise.all(
                        driverIds.map(id => base44.asServiceRole.entities.Driver.get(id).catch(() => null))
                    );
                    
                    drivers.forEach(driver => {
                        if (driver) {
                            driversMap[driver.id] = {
                                name: driver.name,
                                phone: driver.phone_number,
                                email: driver.email
                            };
                        }
                    });
                } catch (err) {
                    console.error("Error fetching event drivers:", err);
                }
            }

            // Fetch vehicle info for trips with vehicles (Optimized)
            const vehicleIds = [...new Set(allTrips.filter(t => t.vehicle_id).map(t => t.vehicle_id))];
            const vehiclesMap = {};

            if (vehicleIds.length > 0) {
                try {
                    // Fetch vehicles in parallel
                    const vehicles = await Promise.all(
                        vehicleIds.map(id => base44.asServiceRole.entities.DriverVehicle.get(id).catch(() => null))
                    );
                    
                    vehicles.forEach(vehicle => {
                        if (vehicle) {
                            vehiclesMap[vehicle.id] = vehicle;
                        }
                    });
                } catch (err) {
                    console.error("Error fetching event vehicles:", err);
                }
            }

            // Fetch Coordinators
            // 1. From trips (assigned to specific trips)
            const allCoordinatorIds = new Set();
            allTrips.forEach(t => {
                if (t.coordinator_ids && Array.isArray(t.coordinator_ids)) {
                    t.coordinator_ids.forEach(id => allCoordinatorIds.add(id));
                }
                if (t.coordinator_id) {
                    allCoordinatorIds.add(t.coordinator_id);
                }
            });

            // 2. Also fetch active coordinators from the event supplier (if no trips assigned yet or to show all available)
            // Strategy: If trips have coordinators, show them. If not, show all active coordinators from supplier.
            // This ensures the dashboard always shows contact points.
            let fetchFromSupplier = false;
            if (allCoordinatorIds.size === 0 && event.supplier_id) {
                fetchFromSupplier = true;
            }

            let coordinatorsList = [];
            
            try {
                if (allCoordinatorIds.size > 0) {
                    const coords = await Promise.all(
                        Array.from(allCoordinatorIds).map(id => base44.asServiceRole.entities.Coordinator.get(id).catch(() => null))
                    );
                    coordinatorsList = coords.filter(Boolean).map(c => ({
                        name: c.name,
                        phone: c.phone_number,
                        email: c.email
                    }));
                } else if (fetchFromSupplier) {
                    // Fallback: Show all active coordinators from supplier
                    const coords = await base44.asServiceRole.entities.Coordinator.filter({
                        supplier_id: event.supplier_id,
                        active: true
                    });
                    coordinatorsList = coords.map(c => ({
                        name: c.name,
                        phone: c.phone_number,
                        email: c.email
                    }));
                }
            } catch (err) {
                console.error("Error fetching event coordinators:", err);
            }

            // Group passengers by trip and add driver info
            const tripsWithPassengers = allTrips.map(trip => {
                const tripPassengers = allPassengers.filter(p => p.event_trip_id === trip.id);
                
                let driver_info = null;
                
                if (trip.is_casual_driver) {
                    driver_info = {
                        name: trip.casual_driver_name || "Motorista Avulso",
                        phone: trip.casual_driver_phone || "",
                        vehicle_model: trip.casual_driver_vehicle_model || "",
                        vehicle_plate: trip.casual_driver_vehicle_plate || "",
                        email: null
                    };
                } else if (trip.subcontractor_driver_name) {
                    driver_info = {
                        name: trip.subcontractor_driver_name,
                        phone: trip.subcontractor_driver_phone || "",
                        vehicle_model: trip.subcontractor_vehicle_model || "",
                        vehicle_plate: trip.subcontractor_vehicle_plate || "",
                        vehicle_color: trip.subcontractor_vehicle_color || "",
                        email: null
                    };
                } else if (trip.driver_id) { 
                    const driver = driversMap[trip.driver_id] || {};
                    const vehicle = trip.vehicle_id ? vehiclesMap[trip.vehicle_id] : null;

                    driver_info = {
                        name: driver.name || "Motorista não informado",
                        phone: driver.phone || "",
                        email: driver.email || "",
                        vehicle_model: vehicle ? (vehicle.model || vehicle.vehicle_model) : (trip.vehicle_model || null),
                        vehicle_plate: vehicle ? (vehicle.plate || vehicle.vehicle_plate) : (trip.vehicle_plate || null),
                        vehicle_color: vehicle ? (vehicle.color || vehicle.vehicle_color) : (trip.vehicle_color || null)
                    };
                }
                
                // Ensure trip_type is set (default to arrival if missing, consistent with schema)
                const final_trip_type = trip.trip_type || 'arrival';

                return {
                    ...trip,
                    trip_type: final_trip_type,
                    passengers: tripPassengers,
                    driver_info,
                    current_eta_minutes: trip.current_eta_minutes || null,
                    receptivity_trip_status: trip.receptivity_trip_status || 'aguardando',
                    departure_trip_status: trip.departure_trip_status || 'aguardando'
                };
            });

            // Get coordinator info (legacy + new list)
            const coordinator = {
                name: sharedList.coordinator_name || "Coordenador",
                contact: sharedList.coordinator_contact || ""
            };

            return Response.json({
                success: true,
                event,
                trips: tripsWithPassengers,
                coordinator,
                coordinators: coordinatorsList, // Return full list of assigned coordinators
                shared_at: sharedList.shared_at,
                expires_at: sharedList.expires_at
            });
        }
        
        // --- MODO LISTA COMPARTILHADA (ServiceRequest/SupplierOwnBooking) ---
        else if (sharedList.request_ids && sharedList.request_ids.length > 0) {
            
            // Chunking strategy to avoid "expected AsyncWrap" / overload
            console.log(`[getEventClientDashboardByToken] Processing ${sharedList.request_ids.length} request IDs`);

            const chunkArray = (arr, size) => {
                const chunks = [];
                for (let i = 0; i < arr.length; i += size) {
                    chunks.push(arr.slice(i, i + size));
                }
                return chunks;
            };

            // Process in chunks of 50 to be safe
            const chunks = chunkArray(sharedList.request_ids, 50);
            let flatRequests = [];

            for (const chunk of chunks) {
                try {
                    // Fetch items in this chunk in parallel
                    // Try to get from ServiceRequest first, if not found try SupplierOwnBooking
                    const fetchPromises = chunk.map(async (id) => {
                        // First attempt: ServiceRequest
                        let item = await base44.asServiceRole.entities.ServiceRequest.get(id).catch(() => null);
                        let type = 'service_request';
                        
                        // Second attempt: SupplierOwnBooking
                        if (!item) {
                            item = await base44.asServiceRole.entities.SupplierOwnBooking.get(id).catch(() => null);
                            type = 'supplier_own_booking';
                        }
                        
                        if (item) {
                            // Normalize passenger name if missing (common in SupplierOwnBooking)
                            if (type === 'supplier_own_booking') {
                                item.passenger_name = item.passenger_name || (item.passengers_details?.[0]?.name) || 'Passageiro';
                            }
                            return { ...item, _source_type: type };
                        }
                        return null;
                    });
                    
                    const results = await Promise.all(fetchPromises);
                    flatRequests.push(...results.filter(Boolean));

                } catch (err) {
                    console.error("Error processing chunk:", err);
                }
            }
            
            // Buscar dados de motoristas para essas requisições
            const driverIds = [...new Set(flatRequests.filter(r => r.driver_id).map(r => r.driver_id))];
            const driversMap = {};
            
            if (driverIds.length > 0) {
                try {
                    const drivers = await Promise.all(
                        driverIds.map(id => base44.asServiceRole.entities.Driver.get(id).catch(() => null))
                    );
                    drivers.forEach(d => { if(d) driversMap[d.id] = d; });
                } catch (err) {
                    console.error("Error fetching drivers batch:", err);
                }
            }

            // Mapear para o formato que o EventDashboard espera (similar ao EventTrip)
            const mappedTrips = flatRequests.map(req => {
                let driver_info = null;
                if (req.driver_id) {
                    const driver = driversMap[req.driver_id] || {};
                    driver_info = {
                        name: driver.name || req.driver_name || "Motorista",
                        phone: driver.phone_number || req.driver_phone || "",
                        email: driver.email || req.driver_email || "",
                        vehicle_model: req.vehicle_model || null,
                        vehicle_plate: req.vehicle_plate || null,
                        vehicle_color: req.vehicle_color || null
                    };
                }

                // Construir lista de passageiros no formato EventPassenger
                // Se tiver 'passengers_details', usa. Senão cria um único baseado no nome principal.
                let passengers = [];
                if (req.passengers_details && req.passengers_details.length > 0) {
                     passengers = req.passengers_details.map(p => ({
                         name: p.name,
                         status: req.receptivity_status === 'efetuada' ? 'arrived' : (req.receptivity_status === 'nao_efetuada' ? 'no_show' : 'pending'),
                         tags: p.tags || [],
                         // Mapear outros campos se necessário
                     }));
                } else {
                     passengers = [{
                         name: req.passenger_name || req.customer_name || 'Passageiro',
                         status: req.receptivity_status === 'efetuada' ? 'arrived' : (req.receptivity_status === 'nao_efetuada' ? 'no_show' : 'pending')
                     }];
                }

                // Infer trip_type for dashboard filtering
                let trip_type = 'transfer';
                if (req.transfer_type) {
                    trip_type = req.transfer_type;
                } else if (req.origin_flight_number) {
                    trip_type = 'arrival';
                } else if (req.destination_flight_number || req.return_destination_flight_number) {
                    trip_type = 'departure';
                }

                return {
                    id: req.id,
                    trip_type,
                    date: req.date,
                    time: req.time,
                    return_date: req.return_date,
                    return_time: req.return_time,
                    origin: req.origin,
                    destination: req.destination,
                    origin_flight_number: req.origin_flight_number,
                    return_destination_flight_number: req.destination_flight_number, // Na volta o destination flight é o de partida
                    passenger_name: req.passenger_name || req.customer_name || 'Passageiro',
                    driver_id: req.driver_id,
                    driver_name: req.driver_name,
                    driver_phone: req.driver_phone,
                    vehicle_model: req.vehicle_model,
                    vehicle_plate: req.vehicle_plate,
                    vehicle_color: req.vehicle_color,
                    
                    receptivity_trip_status: req.receptivity_trip_status || 'aguardando',
                    departure_trip_status: req.departure_trip_status || 'aguardando',
                    departure_status: req.departure_status || 'pending',
                    receptivity_status: req.receptivity_status || 'pendente',
                    
                    current_eta_minutes: req.current_eta_minutes,
                    eta_last_calculated_at: req.eta_last_calculated_at,
                    service_type: req.service_type,
                    passengers: passengers,
                    driver_info: driver_info,
                    
                    // Campos extras
                    passenger_receptivity_statuses: req.passenger_receptivity_statuses,
                    passengers_details: req.passengers_details,
                    additional_items: req.selected_additional_items || req.additional_items || []
                };
            });
            
            // Ordenar
             mappedTrips.sort((a, b) => {
                const dateTimeA = new Date(`${a.date}T${a.time}`);
                const dateTimeB = new Date(`${b.date}T${b.time}`);
                return dateTimeA - dateTimeB;
            });

            // Fake Event Object
            const event = {
                name: sharedList.name || "Lista de Transfer",
                description: "Lista de viagens compartilhada"
            };

             // Get coordinator info
            const coordinator = {
                name: sharedList.coordinator_name || "Coordenador",
                contact: sharedList.coordinator_contact || ""
            };

            return Response.json({
                success: true,
                event,
                trips: mappedTrips,
                coordinator,
                shared_at: sharedList.shared_at,
                expires_at: sharedList.expires_at,
                is_standard_list: true
            });
        }

        return Response.json({ 
            success: false, 
            error: 'Link inválido: sem dados associados' 
        }, { status: 404 });

    } catch (error) {
        console.error('Error fetching event dashboard:', error);
        return Response.json({ 
            success: false, 
            error: 'Erro ao buscar dados do evento: ' + error.message 
        }, { status: 500 });
    }
});