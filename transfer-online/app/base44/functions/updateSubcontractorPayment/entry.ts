import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || !user.supplier_id) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { tripId, tripType, paymentStatus, paymentDate } = await req.json();

        if (!tripId || !tripType || !paymentStatus) {
            return Response.json({ success: false, error: 'Dados incompletos' }, { status: 400 });
        }

        const updateData = {
            subcontractor_payment_status: paymentStatus,
            subcontractor_payment_date: paymentStatus === 'pago' ? (paymentDate || new Date().toISOString()) : null
        };

        if (tripType === 'own') {
            await base44.entities.SupplierOwnBooking.update(tripId, updateData);
        } else {
            await base44.entities.ServiceRequest.update(tripId, updateData);
        }

        return Response.json({ success: true, message: 'Pagamento atualizado' });

    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});