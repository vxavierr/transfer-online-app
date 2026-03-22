import { createClientFromRequest } from 'npm:@base44/sdk@0.8.12';

// Backend Function: getSharedTripList
// Last updated: 2026-02-09 (Force redeploy and SDK update)

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Handle potential empty body or text body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('[getSharedTripList] Error parsing JSON body:', e);
      return Response.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }
    
    const { token } = body;

    console.log(`[getSharedTripList] Processing request for token: ${token ? '***' : 'missing'}`);

    if (!token) {
      return Response.json({ success: false, error: 'Token não fornecido' }, { status: 400 });
    }

    // 1. Buscar lista
    const lists = await base44.asServiceRole.entities.SharedTripList.filter({ token });
    
    if (lists.length === 0) {
      return Response.json({ success: false, error: 'Lista não encontrada. Verifique o link.' }, { status: 404 });
    }

    const list = lists[0];

    if (!list.active) {
      return Response.json({ success: false, error: 'Esta lista foi desativada pelo fornecedor.' }, { status: 403 });
    }

    if (new Date() > new Date(list.expires_at)) {
      return Response.json({ success: false, error: 'Link expirado.' }, { status: 410 });
    }

    // 2. Buscar Viagens
    let trips = [];
    let formattedTrips = [];

    // CASO 1: Filtros de Evento (Link Dinâmico de Parceiro)
    if (list.filters && list.filters.event_id && list.filters.subcontractor_id) {
      try {
        const eventTrips = await base44.asServiceRole.entities.EventTrip.filter({
          event_id: list.filters.event_id,
          subcontractor_id: list.filters.subcontractor_id
        });

        // Buscar passageiros para enriquecer (contagem)
        const passengerPromises = eventTrips.map(t => base44.asServiceRole.entities.EventPassenger.filter({ event_trip_id: t.id }));
        const passengersLists = await Promise.all(passengerPromises);

        // Buscar Coordenadores (Incluindo campo legado coordinator_id)
        const allCoordinatorIds = new Set();
        eventTrips.forEach(t => {
            if (t.coordinator_ids && Array.isArray(t.coordinator_ids)) {
                t.coordinator_ids.forEach(id => allCoordinatorIds.add(id));
            }
            if (t.coordinator_id) {
                allCoordinatorIds.add(t.coordinator_id);
            }
        });

        let coordinatorsMap = {};
        if (allCoordinatorIds.size > 0) {
            const coordinators = await base44.asServiceRole.entities.Coordinator.filter({
                id: { $in: Array.from(allCoordinatorIds) }
            });
            coordinators.forEach(c => {
                coordinatorsMap[c.id] = c;
            });
        }

        // Buscar dados de Motoristas do Sistema (Driver Entity) para preencher telefone
        const driverIds = new Set(eventTrips.map(t => t.driver_id).filter(Boolean));
        let driversMap = {};
        
        if (driverIds.size > 0) {
            const drivers = await base44.asServiceRole.entities.Driver.filter({
                id: { $in: Array.from(driverIds) }
            });
            drivers.forEach(d => {
                driversMap[d.id] = d;
            });
        }

        formattedTrips = eventTrips.map((t, idx) => {
          // Resolve coordinators for this trip (Merge array and legacy field)
          let tripCoordinatorIds = [];
          if (t.coordinator_ids && Array.isArray(t.coordinator_ids)) {
              tripCoordinatorIds = [...t.coordinator_ids];
          }
          if (t.coordinator_id && !tripCoordinatorIds.includes(t.coordinator_id)) {
              tripCoordinatorIds.push(t.coordinator_id);
          }

          const tripCoordinators = tripCoordinatorIds.map(id => {
              const c = coordinatorsMap[id];
              return c ? { name: c.name, phone: c.phone_number } : null;
          }).filter(Boolean);
          const tripPassengers = passengersLists[idx] || [];
          
          // LÓGICA ATUALIZADA: Exibir APENAS a quantidade total de passageiros.
          // Ignora nomes individuais.
          const totalPassengers = t.passenger_count > 0 ? t.passenger_count : tripPassengers.length;
          
          // Formata estritamente como "X Passageiros"
          const passengerName = `${totalPassengers} Passageiros`;

          // Obter voos
          const flights = [...new Set(tripPassengers.map(p => p.flight_number).filter(Boolean))].join(', ');

          // Obter motorista se disponível
          let vehicleModel = t.vehicle_type_category;

          // Resolver dados do motorista do sistema
          let systemDriverName = t.driver_name;
          let systemDriverPhone = null;
          
          if (t.driver_id && driversMap[t.driver_id]) {
              const driver = driversMap[t.driver_id];
              systemDriverPhone = driver.phone_number;
              if (!systemDriverName) systemDriverName = driver.name;
          }

          return {
            id: t.id,
            displayId: t.trip_code || `TRIP-${idx+1}`,
            passengerName: passengerName, // Campo usado pelo frontend para exibir o título principal
            date: t.date,
            time: t.start_time,
            origin: t.origin,
            destination: t.destination,
            flightNumber: flights,
            status: t.status === 'planned' ? 'pendente' : (t.status === 'confirmed' ? 'confirmada' : t.status),
            driverName: systemDriverName, 
            driverPhone: systemDriverPhone,
            vehicleModel: vehicleModel,
            vehicle_type_category: t.vehicle_type_category, 
            vehiclePlate: t.vehicle_plate || null, 
            receptivityStatus: null, 
            receptivityNote: null,
            driverTripStatus: t.driver_trip_status,
            eta: null, 
            estimated_arrival_time: t.estimated_arrival_time,
            stops: [], 
            vehicle_plate_photo_url: t.vehicle_plate_photo_url,
            partner_notes: t.partner_notes,
            // Subcontractor Info
            subcontractorDriverName: t.subcontractor_driver_name,
            subcontractorDriverPhone: t.subcontractor_driver_phone,
            subcontractorDriverDocument: t.subcontractor_driver_document,
            subcontractorVehicleModel: t.subcontractor_vehicle_model,
            subcontractorVehiclePlate: t.subcontractor_vehicle_plate,
            subcontractorVehicleColor: t.subcontractor_vehicle_color,
            subcontractor_cost: t.subcontractor_cost,
            subcontractorInfoStatus: t.subcontractor_info_status,
            subcontractorInfoRejectedReason: t.subcontractor_info_rejected_reason,
            passengers: tripPassengers,
            coordinators: tripCoordinators
          };
        });

      } catch (err) {
        console.error('[getSharedTripList] Erro ao buscar EventTrips:', err);
        return Response.json({ success: false, error: 'Erro ao buscar viagens do evento.' }, { status: 500 });
      }
    } 
    // CASO 2: Lista Estática de IDs (Legado/Manual)
    else if (list.trip_ids && list.trip_ids.length > 0) {
      // Fetch trips in batches (Optimized)
      const uniqueIds = [...new Set(list.trip_ids)];
      
      // 1. Try to find in ServiceRequest
      const serviceRequests = await base44.asServiceRole.entities.ServiceRequest.filter({
        id: { $in: uniqueIds }
      });
      
      const foundSRs = serviceRequests.map(sr => ({ ...sr, _source_type: 'platform' }));
      trips = [...foundSRs];
      
      // 2. Find missing IDs to check in SupplierOwnBooking
      const foundIds = new Set(foundSRs.map(t => t.id));
      const missingIds = uniqueIds.filter(id => !foundIds.has(id));
      
      if (missingIds.length > 0) {
        const supplierBookings = await base44.asServiceRole.entities.SupplierOwnBooking.filter({
          id: { $in: missingIds }
        });
        
        const foundSOBs = supplierBookings.map(sob => ({ ...sob, _source_type: 'own' }));
        trips = [...trips, ...foundSOBs];
      }

      formattedTrips = trips.map(t => {
        return {
          id: t.id,
          displayId: t.request_number || t.booking_number || 'N/A',
          passengerName: `${t.passengers || 0} Passageiros`, // Também atualizado aqui
          date: t.date,
          time: t.time,
          origin: t.origin,
          destination: t.destination,
          flightNumber: t.origin_flight_number || t.flight_number,
          status: t.status,
          driverName: t.driver_name,
          driverPhone: t.driver_phone,
          vehicleModel: t.vehicle_model,
          vehicle_type_category: t.vehicle_type_name, 
          vehiclePlate: t.vehicle_plate,
          receptivityStatus: t.receptivity_status,
          receptivityNote: t.receptivity_not_completed_reason,
          driverTripStatus: t.driver_trip_status,
          partner_notes: t.notes, // Mapping 'notes' to 'partner_notes' for consistency if needed, or keep generic notes
          eta: t.current_eta_minutes,
          stops: t.planned_stops || t.additional_stops || []
        };
      });
    }

    // Ordenar por data/hora
    formattedTrips.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA - dateB;
    });

    // 4. Buscar dados do fornecedor
    let supplierName = 'Fornecedor';
    if (list.supplier_id) {
      try {
        const s = await base44.asServiceRole.entities.Supplier.get(list.supplier_id);
        if (s) supplierName = s.name;
      } catch (e) {
        // Ignore error
      }
    }

    return Response.json({
      success: true,
      list: {
        name: list.name,
        coordinator: list.coordinator_name,
        supplierName,
        expiresAt: list.expires_at,
        controlNumber: list.control_number
      },
      trips: formattedTrips
    });

  } catch (error) {
    console.error('[getSharedTripList] Error:', error);
    return Response.json({ success: false, error: 'Erro interno ao processar lista: ' + error.message }, { status: 500 });
  }
});