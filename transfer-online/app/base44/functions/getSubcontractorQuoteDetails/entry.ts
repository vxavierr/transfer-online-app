import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { token } = await req.json();

        if (!token) {
            return Response.json({ success: false, error: 'Token is required' }, { status: 400 });
        }

        // Tentar encontrar em ServiceRequest
        let trips = await base44.entities.ServiceRequest.filter({ subcontractor_response_token: token }, 1);
        let trip = trips[0];
        let tripType = 'platform';

        if (!trip) {
            // Tentar em SupplierOwnBooking
            trips = await base44.entities.SupplierOwnBooking.filter({ subcontractor_response_token: token }, 1);
            trip = trips[0];
            tripType = 'own';
        }

        if (!trip) {
            return Response.json({ success: false, error: 'Solicitação não encontrada ou link inválido' }, { status: 404 });
        }

        // Buscar dados do fornecedor para exibir marca
        const supplier = await base44.entities.Supplier.get(trip.supplier_id || trip.chosen_supplier_id);

        // Buscar dados do subcontratado (Parceiro)
        let subcontractorName = null;
        if (trip.subcontractor_id) {
            try {
                const sub = await base44.entities.Subcontractor.get(trip.subcontractor_id);
                subcontractorName = sub?.name;
            } catch (e) {
                // Ignorar erro se não encontrar
            }
        }

        // Garantir nome do veículo
        let vehicleTypeName = trip.vehicle_type_name || trip.chosen_vehicle_type_name;
        if (!vehicleTypeName && (trip.vehicle_type_id || trip.chosen_vehicle_type_id)) {
            try {
                const vId = trip.vehicle_type_id || trip.chosen_vehicle_type_id;
                // Tenta buscar em SupplierVehicleType
                const vehicle = await base44.entities.SupplierVehicleType.get(vId);
                if (vehicle) {
                    vehicleTypeName = vehicle.name;
                }
            } catch (e) {
                console.error("Erro ao buscar nome do veículo:", e);
            }
        }

        // Dados públicos seguros
        const publicData = {
            id: trip.id,
            request_number: trip.request_number || trip.booking_number,
            origin: trip.origin,
            destination: trip.destination,
            date: trip.date,
            time: trip.time,
            return_date: trip.return_date,
            return_time: trip.return_time,
            service_type: trip.service_type,
            vehicle_type_name: vehicleTypeName, 
            passengers: trip.passengers,
            notes: trip.notes,
            // Status da subcontratação
            current_cost: trip.subcontractor_cost,
            driver_assigned: !!trip.subcontractor_driver_name,
            trip_type: tripType,
            supplier_name: supplier?.name,
            supplier_logo: supplier?.logo_url,
            subcontractor_name: subcontractorName
        };

        return Response.json({ success: true, data: publicData });

    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});