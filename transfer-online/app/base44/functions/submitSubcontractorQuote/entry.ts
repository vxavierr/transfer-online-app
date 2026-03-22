import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { token, cost, driverName, driverPhone, vehicleModel, vehiclePlate } = await req.json();

        if (!token) {
            return Response.json({ success: false, error: 'Token is required' }, { status: 400 });
        }

        // Tentar encontrar em ServiceRequest
        let trips = await base44.entities.ServiceRequest.filter({ subcontractor_response_token: token }, 1);
        let trip = trips[0];
        let entityName = 'ServiceRequest';

        if (!trip) {
            // Tentar em SupplierOwnBooking
            trips = await base44.entities.SupplierOwnBooking.filter({ subcontractor_response_token: token }, 1);
            trip = trips[0];
            entityName = 'SupplierOwnBooking';
        }

        if (!trip) {
            return Response.json({ success: false, error: 'Solicitação não encontrada' }, { status: 404 });
        }

        const updateData = {
            subcontractor_response_at: new Date().toISOString()
        };

        // Se enviou custo (Fase 1)
        if (cost !== undefined) {
            updateData.subcontractor_cost = parseFloat(cost);
        }

        // Se enviou motorista (Fase 2)
        if (driverName) {
            updateData.subcontractor_driver_name = driverName;
            updateData.subcontractor_driver_phone = driverPhone;
            updateData.subcontractor_vehicle_model = vehicleModel;
            updateData.subcontractor_vehicle_plate = vehiclePlate;
        }

        if (entityName === 'ServiceRequest') {
            await base44.entities.ServiceRequest.update(trip.id, updateData);
        } else {
            await base44.entities.SupplierOwnBooking.update(trip.id, updateData);
        }

        // Notificar fornecedor (opcional, pode ser via email/push)
        // ...

        return Response.json({ success: true, message: 'Informações enviadas com sucesso' });

    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});