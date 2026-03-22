import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar ou criar contador
    const counters = await base44.asServiceRole.entities.SupplierInvoiceCounter.filter({ counter_name: 'main' });
    
    let counter;
    if (counters.length === 0) {
      counter = await base44.asServiceRole.entities.SupplierInvoiceCounter.create({
        counter_name: 'main',
        last_number: 0
      });
    } else {
      counter = counters[0];
    }

    const newNumber = counter.last_number + 1;
    
    await base44.asServiceRole.entities.SupplierInvoiceCounter.update(counter.id, {
      last_number: newNumber
    });

    const invoiceNumber = `INV-SUP-${String(newNumber).padStart(4, '0')}`;

    return Response.json({ 
      success: true,
      invoiceNumber 
    });

  } catch (error) {
    console.error('[generateSupplierInvoiceNumber] Erro:', error);
    return Response.json(
      { error: error.message || 'Erro ao gerar número de fatura' },
      { status: 500 }
    );
  }
});