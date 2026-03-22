import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || !user.supplier_id) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { startDate, endDate, status } = await req.json();

        // Construir query
        const query = {
            supplier_id: user.supplier_id, // Para OwnBooking
            // Para ServiceRequest é chosen_supplier_id, mas a query do Mongo/SDK pode não suportar OR simples entre schemas diferentes
            // Faremos duas queries e juntaremos
        };

        // Filtro de data se fornecido
        // ... (simplificado para listar todos com subcontractor_id não nulo)

        // Buscar Own Bookings
        const ownBookings = await base44.entities.SupplierOwnBooking.filter({ 
            supplier_id: user.supplier_id,
            // subcontractor_id: { $ne: null } // SDK pode não suportar $ne assim, filtrar no código
        }, 100);

        // Buscar Service Requests
        const serviceRequests = await base44.entities.ServiceRequest.filter({
            chosen_supplier_id: user.supplier_id,
        }, 100);

        // Filtrar e normalizar
        const payments = [];

        // Buscar dados dos subcontratados para exibir nomes
        const subcontractors = await base44.entities.Subcontractor.filter({ supplier_id: user.supplier_id });
        const subMap = new Map(subcontractors.map(s => [s.id, s]));

        const processTrip = (trip, type) => {
            if (!trip.subcontractor_id) return;

            const sub = subMap.get(trip.subcontractor_id);
            if (!sub) return;

            // Filtro de status de pagamento se solicitado
            if (status && status !== 'all' && trip.subcontractor_payment_status !== status) return;

            payments.push({
                id: trip.id,
                trip_type: type,
                request_number: trip.booking_number || trip.request_number,
                date: trip.date,
                route: `${trip.origin} -> ${trip.destination}`,
                subcontractor_name: sub.name,
                subcontractor_id: sub.id,
                cost: trip.subcontractor_cost || 0,
                payment_status: trip.subcontractor_payment_status || 'pendente',
                payment_date: trip.subcontractor_payment_date
            });
        };

        ownBookings.forEach(b => processTrip(b, 'own'));
        serviceRequests.forEach(r => processTrip(r, 'platform'));

        // Ordenar por data
        payments.sort((a, b) => new Date(b.date) - new Date(a.date));

        return Response.json({ success: true, data: payments });

    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});