import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  console.log('[fetchSharedTimeline] Função iniciada');
  
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    console.log('[fetchSharedTimeline] Token recebido');

    if (!token) {
      return Response.json({ 
        success: false, 
        error: 'Token é obrigatório' 
      }, { status: 400 });
    }

    // Validar formato do token (UUID v4)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      console.warn('[fetchSharedTimeline] ⚠️ Token com formato inválido');
      return Response.json({ 
        success: false, 
        error: 'Link inválido ou não encontrado'
      }, { status: 404 });
    }

    // Buscar timeline
    const timelines = await base44.asServiceRole.entities.SharedTripTimeline.filter({ token });
    
    if (timelines.length === 0) {
      console.warn('[fetchSharedTimeline] ⚠️ Token não encontrado no banco');
      return Response.json({ 
        success: false, 
        error: 'Link inválido ou não encontrado'
      }, { status: 404 });
    }

    const timeline = timelines[0];

    // Verificar expiração por data (tolerância)
    if (timeline.expires_at && new Date(timeline.expires_at) < new Date()) {
       // Expirar se passou do tempo
       await base44.asServiceRole.entities.SharedTripTimeline.update(timeline.id, { status: 'expired' });
       timeline.status = 'expired';
       console.log('[fetchSharedTimeline] ⏰ Link expirado por data');
    }

    // Verificar expiração
    if (timeline.status === 'expired') {
      return Response.json({ 
        success: false, 
        error: 'Esta viagem foi finalizada e este link expirou.'
      }, { status: 410 });
    }

    // Log de acesso seguro (sem expor token completo)
    const maskedToken = `${token.substring(0, 8)}...${token.substring(token.length - 4)}`;
    console.log(`[fetchSharedTimeline] ✅ Acesso autorizado - Token: ${maskedToken}`);
    
    // Registrar acesso para auditoria (opcional, pode criar uma entidade TimelineAccessLog se necessário)
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    console.log(`[fetchSharedTimeline] 📍 IP: ${clientIP}`);

    let trip = null;
    let tripType = null; // 'service_request' | 'supplier_own_booking'

    // Determinar o tipo de viagem e buscar
    if (timeline.service_request_id) {
      const serviceRequests = await base44.asServiceRole.entities.ServiceRequest.filter({ 
        id: timeline.service_request_id 
      });
      if (serviceRequests.length > 0) {
        trip = serviceRequests[0];
        tripType = 'service_request';
      }
    } else if (timeline.supplier_own_booking_id) {
      const ownBookings = await base44.asServiceRole.entities.SupplierOwnBooking.filter({
        id: timeline.supplier_own_booking_id
      });
      if (ownBookings.length > 0) {
        trip = ownBookings[0];
        tripType = 'supplier_own_booking';
      }
    }

    if (!trip) {
      return Response.json({ 
        success: false, 
        error: 'Viagem não encontrada'
      }, { status: 404 });
    }

    // Normalizar objeto para o frontend (que espera serviceRequest)
    const normalizedTrip = {
      ...trip,
      // Mapear booking_number para request_number se necessário
      request_number: trip.request_number || trip.booking_number,
      // Garantir que status do motorista esteja presente
      driver_trip_status: trip.driver_trip_status || 'aguardando'
    };

    // Buscar logs
    let statusLogs = [];
    if (tripType === 'service_request') {
      statusLogs = await base44.asServiceRole.entities.TripStatusLog.filter({ 
        service_request_id: trip.id 
      });
    } else if (tripType === 'supplier_own_booking') {
      statusLogs = await base44.asServiceRole.entities.TripStatusLog.filter({
        supplier_own_booking_id: trip.id
      });
    }

    const sortedLogs = statusLogs.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    console.log('[fetchSharedTimeline] Sucesso');

    return Response.json({ 
      success: true,
      timeline,
      // Retornar como serviceRequest para manter compatibilidade com o frontend
      serviceRequest: normalizedTrip,
      statusLogs: sortedLogs
    });

  } catch (error) {
    console.error('[fetchSharedTimeline] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});