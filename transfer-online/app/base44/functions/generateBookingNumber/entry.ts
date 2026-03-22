import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Usar service role para garantir acesso ao contador
    const counters = await base44.asServiceRole.entities.BookingCounter.filter({ counter_name: 'main' });

    let counter;
    let nextNumber;

    if (counters.length === 0) {
      // Primeira vez: criar o contador
      counter = await base44.asServiceRole.entities.BookingCounter.create({
        counter_name: 'main',
        last_number: 1
      });
      nextNumber = 1;
    } else {
      // Incrementar o contador existente
      counter = counters[0];
      nextNumber = counter.last_number + 1;
      
      await base44.asServiceRole.entities.BookingCounter.update(counter.id, {
        last_number: nextNumber
      });
    }

    // Formatar o número com zeros à esquerda (ex: TP-0001)
    const bookingNumber = `TP-${String(nextNumber).padStart(4, '0')}`;

    return Response.json({ bookingNumber, rawNumber: nextNumber });

  } catch (error) {
    console.error('Erro ao gerar número de reserva:', error);
    return Response.json(
      { error: error.message || 'Erro ao gerar número de reserva' },
      { status: 500 }
    );
  }
});