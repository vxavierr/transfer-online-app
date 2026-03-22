import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.supplier_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      manual_client_name,
      manual_client_document,
      manual_client_email,
      manual_description,
      total_amount,
      due_date,
      payment_method_description,
      bank_account_details,
      nf_number,
      receipt_number,
    } = body;

    if (!manual_client_name?.trim()) {
      return Response.json({ error: 'Informe o cliente da fatura' }, { status: 400 });
    }

    if (!manual_description?.trim()) {
      return Response.json({ error: 'Informe a descrição da fatura' }, { status: 400 });
    }

    if (!due_date) {
      return Response.json({ error: 'Informe a data de vencimento' }, { status: 400 });
    }

    if (!payment_method_description?.trim()) {
      return Response.json({ error: 'Informe a forma de recebimento' }, { status: 400 });
    }

    const parsedTotal = Number(total_amount);
    if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
      return Response.json({ error: 'Informe um valor total válido' }, { status: 400 });
    }

    const counters = await base44.asServiceRole.entities.SupplierInvoiceCounter.filter({ counter_name: 'main' });
    let counter = counters[0];

    if (!counter) {
      counter = await base44.asServiceRole.entities.SupplierInvoiceCounter.create({
        counter_name: 'main',
        last_number: 0,
      });
    }

    const newNumber = counter.last_number + 1;
    await base44.asServiceRole.entities.SupplierInvoiceCounter.update(counter.id, { last_number: newNumber });
    const invoice_number = `INV-SUP-${String(newNumber).padStart(4, '0')}`;

    const today = new Date().toISOString().slice(0, 10);

    const invoice = await base44.asServiceRole.entities.SupplierInvoice.create({
      invoice_number,
      supplier_id: user.supplier_id,
      invoice_type: 'manual',
      period_start: today,
      period_end: today,
      status: 'faturado_aguardando_pgto',
      finance_status: 'pending',
      total_amount: parsedTotal,
      paid_amount: 0,
      generated_by_user_id: user.id,
      due_date,
      payment_method_description,
      bank_account_details: bank_account_details || '',
      nf_number: nf_number || '',
      receipt_number: receipt_number || '',
      manual_client_name: manual_client_name.trim(),
      manual_client_document: manual_client_document || '',
      manual_client_email: manual_client_email || '',
      manual_description: manual_description.trim(),
    });

    return Response.json({ success: true, invoice });
  } catch (error) {
    console.error('[createManualSupplierInvoice]', error);
    return Response.json({ error: error.message || 'Erro ao criar fatura manual' }, { status: 500 });
  }
});