import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.supplier_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { supplier_id, service_request_ids, period_start, period_end, external_reviewer_email } = body;

    if (supplier_id !== user.supplier_id) {
      return Response.json({ error: 'Unauthorized to create invoice for this supplier' }, { status: 403 });
    }

    if (!service_request_ids || service_request_ids.length === 0) {
      return Response.json({ error: 'No service requests provided' }, { status: 400 });
    }

    if (!external_reviewer_email) {
      return Response.json({ error: 'Email do revisor externo é obrigatório' }, { status: 400 });
    }

    const supplier = await base44.asServiceRole.entities.Supplier.get(supplier_id).catch(() => null);
    if (!supplier) {
      return Response.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
    }

    const requests = await base44.asServiceRole.entities.ServiceRequest.filter({
      id: { $in: service_request_ids },
      chosen_supplier_id: supplier_id,
    });

    const foundRequestIds = new Set(requests.map((r) => r.id));
    const potentialOwnBookingIds = service_request_ids.filter((id) => !foundRequestIds.has(id));

    let ownBookings = [];
    if (potentialOwnBookingIds.length > 0) {
      ownBookings = await base44.asServiceRole.entities.SupplierOwnBooking.filter({
        id: { $in: potentialOwnBookingIds },
        supplier_id: supplier_id,
      }).catch(() => []);
    }

    if (requests.length === 0 && ownBookings.length === 0) {
      return Response.json({ error: 'Nenhuma viagem válida encontrada para esta fatura.' }, { status: 400 });
    }

    const totalRequests = requests.reduce((sum, r) => {
      return sum + (r.chosen_supplier_cost || 0) + (r.total_additional_expenses_approved || 0);
    }, 0);

    const totalOwnBookings = ownBookings.reduce((sum, b) => {
      return sum + (b.price || 0);
    }, 0);

    const total_amount = totalRequests + totalOwnBookings;

    const counters = await base44.asServiceRole.entities.SupplierInvoiceCounter.filter({ counter_name: 'main' });
    let counter;
    if (counters.length === 0) {
      counter = await base44.asServiceRole.entities.SupplierInvoiceCounter.create({ counter_name: 'main', last_number: 0 });
    } else {
      counter = counters[0];
    }

    const newNumber = counter.last_number + 1;
    await base44.asServiceRole.entities.SupplierInvoiceCounter.update(counter.id, { last_number: newNumber });
    const invoice_number = `INV-SUP-${String(newNumber).padStart(4, '0')}`;

    const external_review_token = crypto.randomUUID();

    const invoice = await base44.asServiceRole.entities.SupplierInvoice.create({
      invoice_number,
      supplier_id,
      related_service_requests_ids: requests.map((r) => r.id),
      related_supplier_own_booking_ids: ownBookings.map((b) => b.id),
      period_start,
      period_end,
      total_amount,
      status: 'aguardando_aprovacao_externa',
      external_reviewer_email,
      external_review_token,
      generated_by_user_id: user.id,
    });

    for (const req of requests) {
      await base44.asServiceRole.entities.ServiceRequest.update(req.id, {
        supplier_billing_status: 'em_rascunho',
        supplier_invoice_id: invoice.id,
      });
    }

    for (const booking of ownBookings) {
      await base44.asServiceRole.entities.SupplierOwnBooking.update(booking.id, {
        supplier_invoice_id: invoice.id,
        payment_status: 'faturado',
      });
    }

    try {
      await base44.asServiceRole.functions.invoke('sendExternalInvoiceReviewEmail', {
        invoice_id: invoice.id,
        reviewer_email: external_reviewer_email,
        supplier_name: supplier.name,
      });
    } catch (emailError) {
      console.error('[createSupplierInvoice] Erro ao enviar email:', emailError);
    }

    return Response.json({ success: true, invoice });
  } catch (error) {
    console.error('[createSupplierInvoice] Error:', error);
    return Response.json({ error: error.message || 'Erro ao criar fatura' }, { status: 500 });
  }
});