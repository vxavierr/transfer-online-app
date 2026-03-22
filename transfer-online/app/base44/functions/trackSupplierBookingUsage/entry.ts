import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || !user.supplier_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id } = await req.json();

    if (!booking_id) {
      return Response.json({ error: 'booking_id é obrigatório' }, { status: 400 });
    }

    const booking = await base44.asServiceRole.entities.SupplierOwnBooking.get(booking_id);
    if (!booking || booking.supplier_id !== user.supplier_id) {
      return Response.json({ error: 'Booking não encontrado' }, { status: 404 });
    }

    const supplier = await base44.asServiceRole.entities.Supplier.get(user.supplier_id);
    
    if (!supplier.module3_enabled) {
      return Response.json({ error: 'Módulo 3 não ativado' }, { status: 403 });
    }

    await base44.asServiceRole.entities.Supplier.update(supplier.id, {
      module3_current_trips_count: (supplier.module3_current_trips_count || 0) + 1
    });

    return Response.json({
      success: true,
      current_count: (supplier.module3_current_trips_count || 0) + 1
    });
  } catch (error) {
    console.error('Erro ao rastrear uso:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});