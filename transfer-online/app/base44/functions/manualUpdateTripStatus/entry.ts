import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    
    // Debug: Check headers manually
    const authHeader = req.headers.get('authorization');
    const debugAuth = {
        hasHeader: !!authHeader,
        headerLength: authHeader ? authHeader.length : 0,
        headerStart: authHeader ? authHeader.substring(0, 10) + '...' : 'none'
    };
    console.log('[manualUpdateTripStatus] Auth Debug:', JSON.stringify(debugAuth));

    // 1. Autenticação
    let user;
    try {
      user = await base44.auth.me();
    } catch (e) {
      console.error('[manualUpdateTripStatus] Auth error:', e);
      return Response.json({ 
          error: 'Erro de autenticação (Sessão inválida)',
          details: e.message,
          debug: debugAuth 
      }, { 
          status: 401,
          headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (!user) {
      return Response.json({ 
          error: 'Usuário não identificado (Sessão vazia)',
          debug: debugAuth
      }, { 
          status: 401,
          headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 2. Parse do Payload
    let payload;
    try {
      payload = await req.json();
    } catch (e) {
      return Response.json({ error: 'Payload JSON inválido' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const { 
      serviceRequestId, 
      newStatus,
      hasAdditionalExpenses,
      additionalExpenses
    } = payload;

    console.log(`[manualUpdateTripStatus] User: ${user.email}, Trip: ${serviceRequestId}, Status: ${newStatus}`);

    if (!serviceRequestId || !newStatus) {
      return Response.json({ error: 'ID e Status são obrigatórios' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // 3. Validação de Status
    const allowedStatuses = [
      'aguardando', 'a_caminho', 'chegou_origem', 'passageiro_embarcou',
      'parada_adicional', 'a_caminho_destino', 'chegou_destino',
      'finalizada', 'no_show', 'cancelada_motorista',
      'aguardando_confirmacao_despesas', 'desembarcou'
    ];

    if (!allowedStatuses.includes(newStatus)) {
      return Response.json({ error: `Status inválido: ${newStatus}` }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // 4. Busca da Viagem (Prioridade: EventTrip > Outros)
    let trip = null;
    let tripType = null;

    const entitiesToCheck = [
        { type: 'event_trip', entity: base44.asServiceRole.entities.EventTrip },
        { type: 'service_request', entity: base44.asServiceRole.entities.ServiceRequest },
        { type: 'booking', entity: base44.asServiceRole.entities.Booking },
        { type: 'supplier_own_booking', entity: base44.asServiceRole.entities.SupplierOwnBooking }
    ];

    for (const check of entitiesToCheck) {
        try {
            const result = await check.entity.get(serviceRequestId);
            if (result) {
                trip = result;
                tripType = check.type;
                break;
            }
        } catch (e) { console.warn(`Erro buscando ${check.type}:`, e.message); }
    }

    if (!trip) {
      return Response.json({ error: 'Viagem não encontrada' }, { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // 5. Verificação de Permissões
    const isAdmin = user.role === 'admin';
    const isAssignedDriver = user.is_driver && user.driver_id && trip.driver_id === user.driver_id;
    let isSupplierOwner = false;
    let isEventManager = false;

    if (user.supplier_id) {
        if (tripType === 'service_request') isSupplierOwner = user.supplier_id === trip.chosen_supplier_id;
        else if (tripType === 'supplier_own_booking' || tripType === 'booking') isSupplierOwner = user.supplier_id === trip.supplier_id;
        else if (tripType === 'event_trip') isSupplierOwner = true;
    }

    if (user.event_access_active) isEventManager = true;

    if (!isAdmin && !isAssignedDriver && !isSupplierOwner && !isEventManager) {
      return Response.json({ error: 'Acesso negado para este usuário' }, { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // 6. Preparação e Atualização
    const updateData = {
      driver_trip_status: newStatus,
      driver_trip_status_updated_at: new Date().toISOString()
    };

    // ETA (Opcional)
    if (newStatus === 'passageiro_embarcou' && trip.origin && trip.destination) {
        try {
            const etaResponse = await base44.asServiceRole.functions.invoke('calculateETA', {
                origin: trip.origin, destination: trip.destination
            });
            if (etaResponse.data?.success) {
                updateData.current_eta_minutes = etaResponse.data.eta_minutes;
                updateData.eta_last_calculated_at = new Date().toISOString();
                if (tripType === 'event_trip') {
                    updateData.estimated_arrival_time = etaResponse.data.eta_timestamp;
                    updateData.eta_duration_text = etaResponse.data.duration_text;
                }
            }
        } catch (e) {}
    }

    // Logic for specific status
    if (tripType === 'event_trip') {
        if (newStatus === 'finalizada') updateData.status = 'completed';
        else if (newStatus === 'cancelada_motorista') updateData.status = 'cancelled';
        else if (['a_caminho', 'chegou_origem', 'passageiro_embarcou', 'a_caminho_destino'].includes(newStatus)) {
            updateData.status = 'dispatched';
        }
        if (hasAdditionalExpenses && additionalExpenses?.length > 0) {
            updateData.driver_reported_additional_expenses = additionalExpenses;
        }
        await base44.asServiceRole.entities.EventTrip.update(trip.id, updateData);
    } else {
        // Simple logic for others
        if (hasAdditionalExpenses && additionalExpenses?.length > 0) {
            updateData.driver_reported_additional_expenses = additionalExpenses;
            updateData.driver_trip_status = 'aguardando_confirmacao_despesas';
        }
        
        if (tripType === 'service_request') await base44.asServiceRole.entities.ServiceRequest.update(trip.id, updateData);
        else if (tripType === 'supplier_own_booking') await base44.asServiceRole.entities.SupplierOwnBooking.update(trip.id, updateData);
        else if (tripType === 'booking') {
            // Mapear campos para Booking (usa driver_current_status)
            const bookingUpdate = {
                driver_current_status: newStatus,
                driver_trip_status_updated_at: updateData.driver_trip_status_updated_at,
                driver_reported_additional_expenses: updateData.driver_reported_additional_expenses
            };
            // Remover undefined
            Object.keys(bookingUpdate).forEach(key => bookingUpdate[key] === undefined && delete bookingUpdate[key]);
            
            await base44.asServiceRole.entities.Booking.update(trip.id, bookingUpdate);
        }
    }

    // 7. Log e Rating
    try {
        await base44.asServiceRole.entities.TripStatusLog.create({
            status: newStatus,
            timestamp: new Date().toISOString(),
            notes: `Painel: ${user.full_name}`,
            [tripType + '_id']: trip.id
        });
    } catch (e) {}

    if (newStatus === 'finalizada' && tripType !== 'event_trip' && (trip.passenger_email || trip.customer_email)) {
        base44.asServiceRole.functions.invoke('generateAndSendRatingLink', {
            serviceRequestId: trip.id,
            recipientEmail: trip.passenger_email || trip.customer_email
        }).catch(() => {});
    }

    // Notificação de chegada do motorista
    if (newStatus === 'chegou_origem') {
        base44.asServiceRole.functions.invoke('notifyDriverArrival', {
            tripId: trip.id,
            tripType: tripType,
            overrideDriverName: trip.driver_name // Optional
        }).catch(err => console.error('[manualUpdateTripStatus] Erro ao notificar chegada:', err));
    }

    return Response.json({ success: true, message: 'Status atualizado!', newStatus }, { headers: { 'Access-Control-Allow-Origin': '*' } });

  } catch (error) {
    console.error('[manualUpdateTripStatus] EXCEPTION:', error);
    return Response.json({ 
        error: `Erro interno: ${error.message}`,
        stack: error.stack 
    }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
});