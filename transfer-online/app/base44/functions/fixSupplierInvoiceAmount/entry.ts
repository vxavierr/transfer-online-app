import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { invoice_id, supplier_own_booking_ids } = body;

    if (!invoice_id || !supplier_own_booking_ids || supplier_own_booking_ids.length === 0) {
      return Response.json({ error: 'invoice_id e supplier_own_booking_ids são obrigatórios' }, { status: 400 });
    }

    const invoice = await base44.asServiceRole.entities.SupplierInvoice.get(invoice_id).catch(() => null);
    if (!invoice) {
      return Response.json({ error: 'Fatura não encontrada' }, { status: 404 });
    }

    const ownBookings = await base44.asServiceRole.entities.SupplierOwnBooking.filter({
      id: { $in: supplier_own_booking_ids },
      supplier_id: invoice.supplier_id,
    });

    if (ownBookings.length === 0) {
      return Response.json({ error: 'Nenhuma viagem própria encontrada para correção' }, { status: 404 });
    }

    const totalAmount = ownBookings.reduce((sum, booking) => sum + (booking.price || 0), 0);

    await base44.asServiceRole.entities.SupplierInvoice.update(invoice_id, {
      related_supplier_own_booking_ids: ownBookings.map((booking) => booking.id),
      related_service_requests_ids: [],
      total_amount: totalAmount,
    });

    for (const booking of ownBookings) {
      await base44.asServiceRole.entities.SupplierOwnBooking.update(booking.id, {
        supplier_invoice_id: invoice_id,
        payment_status: 'faturado',
      });
    }

    return Response.json({
      success: true,
      total_amount: totalAmount,
      booking_ids: ownBookings.map((booking) => booking.id),
      booking_numbers: ownBookings.map((booking) => booking.booking_number),
    });
  } catch (error) {
    console.error('[fixSupplierInvoiceAmount] Error:', error);
    return Response.json({ error: error.message || 'Erro ao corrigir fatura' }, { status: 500 });
  }
});