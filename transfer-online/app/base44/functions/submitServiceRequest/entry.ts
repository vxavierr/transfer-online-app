import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Função utilitária para obter horário de Brasília
function getBrasiliaTime() {
  const now = new Date();
  const brasiliaTimeString = now.toLocaleString('en-US', { 
    timeZone: 'America/Sao_Paulo' 
  });
  return new Date(brasiliaTimeString);
}

// Função para sanitizar números (float ou int)
function sanitizeNumber(value, type = 'float') {
  if (value === undefined || value === null || value === '') return null;
  const parsed = type === 'int' ? parseInt(value, 10) : parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

// Função para sanitizar campos de texto opcionais
function sanitizeString(value) {
  return (value && typeof value === 'string' && value.trim() !== '') ? value.trim() : null;
}

// Helper to generate request number (inlined to avoid invoke issues)
async function generateRequestNumber(base44) {
  const counters = await base44.asServiceRole.entities.ServiceRequestCounter.filter({ 
    counter_name: 'main' 
  });

  let counter;
  let nextNumber;

  if (counters.length === 0) {
    counter = await base44.asServiceRole.entities.ServiceRequestCounter.create({
      counter_name: 'main',
      last_number: 1
    });
    nextNumber = 1;
  } else {
    counter = counters[0];
    nextNumber = counter.last_number + 1;
    await base44.asServiceRole.entities.ServiceRequestCounter.update(counter.id, {
      last_number: nextNumber
    });
  }
  return `SR-${String(nextNumber).padStart(4, '0')}`;
}

Deno.serve(async (req) => {
  try {
    console.log('[submitServiceRequest] === INÍCIO ===');
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      console.log('[submitServiceRequest] Usuário não autenticado');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[submitServiceRequest] Usuário autenticado:', user.id, 'Role:', user.role);

    const body = await req.json();
    // console.log('[submitServiceRequest] Body recebido (keys):', Object.keys(body));
    
    const {
      client_id, service_type, driver_language, origin, destination,
      date, time, return_date, return_time, hours, distance_km, duration_minutes,
      passengers, passenger_user_id, passenger_name, passenger_email, passenger_phone,
      passengers_details, notes, cost_allocation, billing_method,
      billing_responsible_user_id, billing_responsible_email, billing_responsible_name,
      credit_card_payment_link_recipient, purchase_order_number,
      offered_suppliers, chosen_supplier_id, chosen_vehicle_type_id,
      chosen_supplier_cost, chosen_client_price, additional_stops,
      origin_flight_number, destination_flight_number,
      return_origin_flight_number, return_destination_flight_number,
      requester_user_id, // Campo opcional para admin definir quem solicitou
      requester_full_name,
      requester_email,
      requester_phone,
      frequent_requester_id,
      notification_phones
    } = body;

    // Validações básicas
    if (!client_id || !service_type || !chosen_supplier_id || !chosen_vehicle_type_id) {
      console.log('[submitServiceRequest] Dados obrigatórios faltando');
      return Response.json({ error: 'Dados obrigatórios faltando' }, { status: 400 });
    }
    
    // VALIDAÇÃO AJUSTADA PARA MASTER: apenas usuários não-admin devem ter client_id correspondente
    if (user.role !== 'admin' && user.client_id !== client_id) {
      console.log('[submitServiceRequest] Usuário não autorizado (não é admin e client_id não corresponde)');
      return Response.json({ error: 'Usuário não autorizado' }, { status: 403 });
    }

    // === PARALELISMO: Buscas independentes (Cliente e Veículo) ===
    console.log('[submitServiceRequest] Buscando cliente e veículo em paralelo...');
    const [clientResults, vehicleResults] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({ id: client_id }).catch(e => { console.error('Erro buscar client:', e); return []; }),
      base44.asServiceRole.entities.SupplierVehicleType.filter({ id: chosen_vehicle_type_id }).catch(e => { console.error('Erro buscar veiculo:', e); return []; })
    ]);
    const client = clientResults[0] || null;
    const vehicle = vehicleResults[0] || null;

    if (!client) {
      console.log('[submitServiceRequest] Cliente não encontrado');
      return Response.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }
    
    if (!vehicle) {
      console.error('[submitServiceRequest] Veículo não encontrado');
      return Response.json({ error: 'Tipo de veículo não encontrado' }, { status: 404 });
    }

    console.log('[submitServiceRequest] Dados carregados. Cliente:', client.name, '| Veículo:', vehicle.name);

    // === VERIFICAÇÃO DE DUPLICIDADE (inlined, sem chamada externa) ===
    let duplicateWarning = null;
    try {
      if (date && (passenger_user_id || passenger_email)) {
        const existingForDate = await base44.asServiceRole.entities.ServiceRequest.filter({ date: date });
        const duplicates = existingForDate.filter(r => {
          if (['cancelada', 'cancelado', 'cancelada_motorista'].includes(r.status)) return false;
          const sameId = passenger_user_id && r.passenger_user_id === passenger_user_id;
          const sameEmail = passenger_email && r.passenger_email &&
                            r.passenger_email.toLowerCase() === passenger_email.toLowerCase();
          const sameTime = !time || r.time === time;
          return (sameId || sameEmail) && sameTime;
        });
        if (duplicates.length > 0) {
          const trip = duplicates[0];
          duplicateWarning = `⚠️ Atenção: Já existe uma viagem agendada para este passageiro em ${date} às ${trip.time}.\nOrigem: ${trip.origin}\nDestino: ${trip.destination}`;
          console.warn('[submitServiceRequest] ⚠️ Duplicidade detectada (permitindo seguir):', duplicateWarning);
        }
      }
    } catch (dupError) {
      console.warn('[submitServiceRequest] Erro ao verificar duplicidade (ignorando):', dupError.message);
    }

    // Definir ID do usuário solicitante
    let finalUserId = user.id;
    if (user.role === 'admin' && requester_user_id) {
      finalUserId = requester_user_id;
    }

    // Horários
    const timeoutMinutes = client.supplier_response_timeout_minutes || 60;
    const brazilTime = getBrasiliaTime();
    const deadline = new Date(brazilTime);
    deadline.setMinutes(deadline.getMinutes() + timeoutMinutes);

    // Token
    const responseToken = btoa(`${Date.now()}-${Math.random()}-${chosen_supplier_id}`);

    // Sanitização de detalhes dos passageiros
    let cleanPassengersDetails = null;
    if (passengers_details && Array.isArray(passengers_details) && passengers_details.length > 0) {
      cleanPassengersDetails = passengers_details.map(p => ({
        name: p.name || '',
        document_type: p.document_type || 'RG',
        document_number: p.document_number || '',
        phone_number: p.phone_number || '',
        is_lead_passenger: !!p.is_lead_passenger
      }));
    }

    // Preparar objeto base
    const baseRequestData = {
      client_id: client_id,
      user_id: finalUserId,
      driver_language: driver_language,
      passengers: Math.max(1, sanitizeNumber(passengers, 'int') || 1),
      passenger_user_id: sanitizeString(passenger_user_id),
      passenger_name: sanitizeString(passenger_name),
      passenger_email: sanitizeString(passenger_email),
      passenger_phone: sanitizeString(passenger_phone),
      passengers_details: cleanPassengersDetails,
      notes: sanitizeString(notes),
      billing_method: billing_method,
      billing_responsible_user_id: sanitizeString(billing_responsible_user_id),
      billing_responsible_email: sanitizeString(billing_responsible_email),
      billing_responsible_name: sanitizeString(billing_responsible_name),
      credit_card_payment_link_recipient: sanitizeString(credit_card_payment_link_recipient),
      purchase_order_number: sanitizeString(purchase_order_number),
      offered_suppliers: Array.isArray(offered_suppliers) ? offered_suppliers : [],
      chosen_supplier_id: chosen_supplier_id,
      chosen_vehicle_type_id: chosen_vehicle_type_id,
      supplier_response_status: 'aguardando_resposta',
      supplier_request_sent_at: brazilTime.toISOString(),
      supplier_response_deadline: deadline.toISOString(),
      status: 'aguardando_fornecedor',
      requester_user_id: sanitizeString(requester_user_id),
      requester_full_name: sanitizeString(requester_full_name),
      requester_email: sanitizeString(requester_email),
      requester_phone: sanitizeString(requester_phone),
      frequent_requester_id: sanitizeString(frequent_requester_id),
      notification_phones: Array.isArray(notification_phones) ? notification_phones : []
    };

    if (cost_allocation && Array.isArray(cost_allocation) && cost_allocation.length > 0) {
      baseRequestData.cost_allocation = cost_allocation.map(ca => {
        const item = {
          ...ca,
          allocation_value: sanitizeNumber(ca.allocation_value),
          cost_center_id: sanitizeString(ca.cost_center_id)
        };
        if (!item.cost_center_id) delete item.cost_center_id;
        return item;
      });
    }

    if (additional_stops && Array.isArray(additional_stops) && additional_stops.length > 0) {
      baseRequestData.planned_stops = additional_stops
        .filter(s => typeof s === 'string' && s.trim() !== '')
        .map((addr, index) => ({
          address: addr.trim(),
          order: index + 1,
          notes: ''
        }));
    }

    // Limpeza de nulos do baseRequestData
    Object.keys(baseRequestData).forEach(key => {
      if (baseRequestData[key] === null || baseRequestData[key] === undefined) {
        delete baseRequestData[key];
      }
    });

    // ** LÓGICA ROUND TRIP **
    if (service_type === 'round_trip') {
      if (!return_date || !return_time) {
        return Response.json({ error: 'Data e horário de retorno obrigatórios' }, { status: 400 });
      }

      // Gerar número base
      // const outboundNumberResponse = await base44.asServiceRole.functions.invoke('generateServiceRequestNumber');
      // const outboundRequestNumber = outboundNumberResponse.data.requestNumber;
      const outboundRequestNumber = await generateRequestNumber(base44);
      const returnRequestNumber = `${outboundRequestNumber}-R`;

      // Preços e validação mínima
      let outboundSupplierCost = (parseFloat(chosen_supplier_cost) || 0) / 2;
      let outboundClientPrice = (parseFloat(chosen_client_price) || 0) / 2;

      if (vehicle.min_price_one_way > 0 && outboundClientPrice < vehicle.min_price_one_way) {
        outboundClientPrice = vehicle.min_price_one_way;
        outboundSupplierCost = vehicle.min_price_one_way;
      }

      // Preparar dados IDA e VOLTA
      const outboundData = {
        ...baseRequestData,
        request_number: outboundRequestNumber,
        service_type: 'one_way',
        origin: origin,
        destination: destination,
        date: date,
        time: time,
        origin_flight_number: sanitizeString(origin_flight_number),
        destination_flight_number: sanitizeString(destination_flight_number),
        chosen_supplier_cost: sanitizeNumber(outboundSupplierCost),
        chosen_client_price: sanitizeNumber(outboundClientPrice),
        is_return_leg: false,
        supplier_response_token: responseToken,
        distance_km: (sanitizeNumber(distance_km) || 0) / 2,
        duration_minutes: (sanitizeNumber(duration_minutes, 'int') || 0) / 2
      };

      const returnData = {
        ...baseRequestData,
        request_number: returnRequestNumber,
        service_type: 'one_way',
        origin: destination,
        destination: origin,
        date: return_date,
        time: return_time,
        origin_flight_number: sanitizeString(return_origin_flight_number),
        destination_flight_number: sanitizeString(return_destination_flight_number),
        chosen_supplier_cost: sanitizeNumber(outboundSupplierCost),
        chosen_client_price: sanitizeNumber(outboundClientPrice),
        is_return_leg: true,
        // related_trip_id será setado após criação da ida
        supplier_response_token: btoa(`${Date.now()}-${Math.random()}-${chosen_supplier_id}-return`),
        distance_km: (sanitizeNumber(distance_km) || 0) / 2,
        duration_minutes: (sanitizeNumber(duration_minutes, 'int') || 0) / 2
      };

      // Clean undefined
      [outboundData, returnData].forEach(obj => {
        Object.keys(obj).forEach(key => { if (obj[key] === null || obj[key] === undefined) delete obj[key]; });
      });

      console.log('[submitServiceRequest] Criando IDA e VOLTA...');
      
      // Criação sequencial necessária para o ID da ida ser usado na volta (related_trip_id) - ou update depois.
      // Vamos criar IDA primeiro.
      const outboundRequest = await base44.asServiceRole.entities.ServiceRequest.create(outboundData);
      
      // Adicionar ID da ida na volta
      returnData.related_trip_id = outboundRequest.id;
      
      const returnRequest = await base44.asServiceRole.entities.ServiceRequest.create(returnData);

      // Update IDA com ID da volta (paralelo com logs de histórico)
      const updatePromise = base44.asServiceRole.entities.ServiceRequest.update(outboundRequest.id, {
        related_trip_id: returnRequest.id
      });

      // Históricos em paralelo
      const historyPromises = [
        base44.asServiceRole.entities.TripHistory.create({
          trip_id: outboundRequest.id,
          trip_type: 'ServiceRequest',
          event_type: 'Viagem Criada',
          user_id: user.id,
          user_name: user.full_name || user.email,
          details: { origin: outboundRequest.origin, destination: outboundRequest.destination, date: outboundRequest.date, time: outboundRequest.time, is_round_trip_outbound: true },
          comment: 'Solicitação de IDA (Ida e Volta) criada'
        }),
        base44.asServiceRole.entities.TripHistory.create({
          trip_id: returnRequest.id,
          trip_type: 'ServiceRequest',
          event_type: 'Viagem Criada',
          user_id: user.id,
          user_name: user.full_name || user.email,
          details: { origin: returnRequest.origin, destination: returnRequest.destination, date: returnRequest.date, time: returnRequest.time, is_round_trip_return: true },
          comment: 'Solicitação de VOLTA (Ida e Volta) criada'
        })
      ];

      // Aguardar tudo para garantir consistência antes de responder (embora update e history pudessem ser background,
      // para serverless é melhor garantir execução)
      await Promise.all([updatePromise, ...historyPromises]);

      return Response.json({
        success: true,
        warning: duplicateWarning,
        is_round_trip: true,
        service_request: outboundRequest,
        return_service_request: returnRequest,
        request_number: outboundRequestNumber,
        return_request_number: returnRequestNumber,
        message: `Duas solicitações criadas: ${outboundRequestNumber} e ${returnRequestNumber}`
      });

    } else {
      // ** LÓGICA ONE WAY / HOURLY **
      console.log('[submitServiceRequest] Criando solicitação única...');
      // const requestNumberResponse = await base44.asServiceRole.functions.invoke('generateServiceRequestNumber');
      // const requestNumber = requestNumberResponse.data.requestNumber;
      const requestNumber = await generateRequestNumber(base44);

      let finalSupplierCost = parseFloat(chosen_supplier_cost) || 0;
      let finalClientPrice = parseFloat(chosen_client_price) || 0;

      if (service_type === 'one_way' && vehicle.min_price_one_way > 0) {
        if (finalClientPrice < vehicle.min_price_one_way) {
          finalClientPrice = vehicle.min_price_one_way;
          finalSupplierCost = vehicle.min_price_one_way;
        }
      }

      const requestData = {
        ...baseRequestData,
        request_number: requestNumber,
        service_type: service_type,
        origin: origin,
        destination: sanitizeString(destination),
        date: date,
        time: time,
        chosen_supplier_cost: sanitizeNumber(finalSupplierCost),
        chosen_client_price: sanitizeNumber(finalClientPrice),
        supplier_response_token: responseToken,
        is_return_leg: false,
        distance_km: sanitizeNumber(distance_km),
        duration_minutes: sanitizeNumber(duration_minutes, 'int'),
        hours: sanitizeNumber(hours, 'int'),
        origin_flight_number: sanitizeString(origin_flight_number),
        destination_flight_number: sanitizeString(destination_flight_number)
      };

      // Clean undefined
      Object.keys(requestData).forEach(key => { if (requestData[key] === null || requestData[key] === undefined) delete requestData[key]; });

      const serviceRequest = await base44.asServiceRole.entities.ServiceRequest.create(requestData);
      console.log('[submitServiceRequest] Criado ID:', serviceRequest.id);

      // Histórico
      await base44.asServiceRole.entities.TripHistory.create({
        trip_id: serviceRequest.id,
        trip_type: 'ServiceRequest',
        event_type: 'Viagem Criada',
        user_id: user.id,
        user_name: user.full_name || user.email,
        details: { origin: serviceRequest.origin, destination: serviceRequest.destination, date: serviceRequest.date, time: serviceRequest.time },
        comment: 'Solicitação criada via sistema'
      }).catch(e => console.error('Erro historico:', e));

      return Response.json({
        success: true,
        warning: duplicateWarning,
        is_round_trip: false,
        service_request: serviceRequest,
        request_number: requestNumber
      });
    }

  } catch (error) {
    console.error('[submitServiceRequest] ❌ ERRO CRÍTICO:', error);
    return Response.json(
      { error: error.message || 'Erro interno ao criar solicitação' },
      { status: 500 }
    );
  }
});