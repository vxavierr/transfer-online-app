import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar autenticação do usuário
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    // Extrair campos com destructuring para garantir que só passamos o esperado,
    // mas agora incluindo TODOS os campos necessários.
    const {
      quote_format,
      service_type,
      vehicle_type_id,
      vehicle_type_name,
      multi_vehicle_quotes,
      driver_language,
      origin,
      destination,
      date,
      time,
      return_date,
      return_time,
      hours,
      distance_km,
      duration_minutes,
      passengers,
      requester_name,
      customer_name,
      customer_email,
      customer_phone,
      notes,
      professional_notes,
      reason,
      origin_flight_number,
      destination_flight_number,
      return_origin_flight_number,
      return_destination_flight_number,
      agency_control_number,
      agency_quoted_legs,
      quoted_trips
    } = body;

    // Validações básicas e detalhadas
    const missingFields = [];
    
    // Se for cotação manual (com quoted_trips) ou agência, validações são diferentes
    const isManualOrAgency = (quoted_trips && quoted_trips.length > 0) || (agency_quoted_legs && agency_quoted_legs.length > 0);

    if (!isManualOrAgency) {
      if (!service_type) missingFields.push('Tipo de Serviço');
      if (!origin) missingFields.push('Origem');
      if (!date) missingFields.push('Data');
      if (!time) missingFields.push('Horário');
    }
    
    if (!customer_name) missingFields.push('Nome do Cliente');

    if (missingFields.length > 0) {
      return Response.json(
        { error: `Dados obrigatórios faltando: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Gerar número da cotação diretamente (sem chamar outra função para evitar problemas de contexto)
    const counters = await base44.asServiceRole.entities.QuoteCounter.filter({ counter_name: 'main' });
    
    let nextNumber;
    if (counters.length === 0) {
      const counter = await base44.asServiceRole.entities.QuoteCounter.create({
        counter_name: 'main',
        last_number: 1
      });
      nextNumber = 1;
    } else {
      const counter = counters[0];
      nextNumber = counter.last_number + 1;
      await base44.asServiceRole.entities.QuoteCounter.update(counter.id, {
        last_number: nextNumber
      });
    }
    
    const quoteNumber = `COT-${String(nextNumber).padStart(4, '0')}`;

    // Criar solicitação de cotação
    const quoteRequest = await base44.asServiceRole.entities.QuoteRequest.create({
      quote_number: quoteNumber,
      quote_format: quote_format || 'standard',
      service_type,
      vehicle_type_id,
      vehicle_type_name,
      multi_vehicle_quotes: multi_vehicle_quotes || [],
      driver_language: driver_language || 'pt',
      origin,
      destination: destination || origin,
      date,
      time,
      return_date,
      return_time,
      hours,
      distance_km: distance_km || 0,
      duration_minutes: duration_minutes || 0,
      passengers: passengers || 1,
      requester_name: requester_name || '',
      customer_name,
      customer_email,
      customer_phone: customer_phone || '',
      notes: notes || '',
      professional_notes: professional_notes || '',
      reason: reason || 'Fora do raio de atuação',
      status: 'pendente',
      origin_flight_number,
      destination_flight_number,
      return_origin_flight_number,
      return_destination_flight_number,
      agency_control_number,
      agency_quoted_legs: agency_quoted_legs || [],
      quoted_trips: quoted_trips || []
    });

    // Enviar notificações por e-mail
    try {
      await base44.asServiceRole.functions.invoke('sendQuoteRequestEmails', {
        quoteRequestId: quoteRequest.id
      });
    } catch (emailError) {
      console.error('Erro ao enviar e-mails de notificação:', emailError);
      // Não falhar a operação se o e-mail falhar
    }

    return Response.json({
      success: true,
      quote_request: quoteRequest
    });

  } catch (error) {
    console.error('Erro ao criar solicitação de cotação:', error);
    return Response.json(
      { error: error.message || 'Erro ao criar solicitação de cotação' },
      { status: 500 }
    );
  }
});