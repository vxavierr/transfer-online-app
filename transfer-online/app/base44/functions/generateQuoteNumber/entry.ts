import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Esta função pode ser chamada por outras funções backend via service role
    // Não requer autenticação de usuário direto
    
    // Usar service role para garantir acesso ao contador
    const counters = await base44.asServiceRole.entities.QuoteCounter.filter({ counter_name: 'main' });

    let counter;
    let nextNumber;

    if (counters.length === 0) {
      // Primeira vez: criar o contador
      counter = await base44.asServiceRole.entities.QuoteCounter.create({
        counter_name: 'main',
        last_number: 1
      });
      nextNumber = 1;
    } else {
      // Incrementar o contador existente
      counter = counters[0];
      nextNumber = counter.last_number + 1;
      
      await base44.asServiceRole.entities.QuoteCounter.update(counter.id, {
        last_number: nextNumber
      });
    }

    // Formatar o número com zeros à esquerda (ex: COT-0001)
    const quoteNumber = `COT-${String(nextNumber).padStart(4, '0')}`;

    return Response.json({ quoteNumber, rawNumber: nextNumber });

  } catch (error) {
    console.error('Erro ao gerar número de cotação:', error);
    return Response.json(
      { error: error.message || 'Erro ao gerar número de cotação' },
      { status: 500 }
    );
  }
});