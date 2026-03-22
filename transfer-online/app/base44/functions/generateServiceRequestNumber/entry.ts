import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar ou criar o contador
    const counters = await base44.asServiceRole.entities.ServiceRequestCounter.filter({ 
      counter_name: 'main' 
    });

    let counter;
    let nextNumber;

    if (counters.length === 0) {
      // Criar contador inicial
      counter = await base44.asServiceRole.entities.ServiceRequestCounter.create({
        counter_name: 'main',
        last_number: 1
      });
      nextNumber = 1;
    } else {
      counter = counters[0];
      nextNumber = counter.last_number + 1;
      
      // Atualizar o contador
      await base44.asServiceRole.entities.ServiceRequestCounter.update(counter.id, {
        last_number: nextNumber
      });
    }

    // Formatar número (ex: SR-0001)
    const requestNumber = `SR-${String(nextNumber).padStart(4, '0')}`;

    return Response.json({
      success: true,
      requestNumber: requestNumber,
      number: nextNumber
    });

  } catch (error) {
    console.error('Erro ao gerar número da solicitação:', error);
    return Response.json(
      { error: error.message || 'Erro ao gerar número' },
      { status: 500 }
    );
  }
});