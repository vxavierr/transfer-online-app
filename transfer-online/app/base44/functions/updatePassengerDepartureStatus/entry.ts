import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { serviceRequestId, token, passengerUpdate } = await req.json();

    if (!serviceRequestId || !token || !passengerUpdate) {
      return Response.json({ 
        success: false, 
        error: 'Parâmetros obrigatórios: serviceRequestId, token, passengerUpdate' 
      }, { status: 400 });
    }

    const { index, status, departure_point, notes, departure_time } = passengerUpdate;

    if (!['pending_departure', 'departed', 'departed_other_means'].includes(status)) {
      return Response.json({ success: false, error: 'Status inválido' }, { status: 400 });
    }

    // 1. Validar token
    const sharedLists = await base44.asServiceRole.entities.SharedReceptiveList.filter({ token });
    if (sharedLists.length === 0) {
      return Response.json({ success: false, error: 'Token inválido' }, { status: 404 });
    }

    const sharedList = sharedLists[0];
    const now = new Date();
    const expiresAt = new Date(sharedList.expires_at);

    if (now > expiresAt) {
      return Response.json({ success: false, error: 'Link expirado' }, { status: 410 });
    }

    if (!sharedList.request_ids.includes(serviceRequestId)) {
      return Response.json({ success: false, error: 'Solicitação não pertence a esta lista' }, { status: 403 });
    }

    // 2. Buscar a entidade
    let entityType = 'ServiceRequest';
    let request = null;

    try {
        request = await base44.asServiceRole.entities.ServiceRequest.get(serviceRequestId);
    } catch (e) {
        // Ignore error, try next entity
    }
    
    if (!request) {
        try {
            request = await base44.asServiceRole.entities.SupplierOwnBooking.get(serviceRequestId);
            entityType = 'SupplierOwnBooking';
        } catch (e) {
            // Ignore error
        }
    }

    if (!request) {
        return Response.json({ success: false, error: 'Viagem não encontrada' }, { status: 404 });
    }

    // 3. Atualizar array de status de saída
    let currentDepartureStatuses = request.passenger_departure_statuses || [];

    // Inicializar ou expandir se necessário (garantir que o índice exista)
    // Se o array estiver vazio ou menor que o índice alvo
    while (currentDepartureStatuses.length <= index) {
        const i = currentDepartureStatuses.length;
        let name = `Passageiro ${i + 1}`;
        
        // Tentar pegar o nome correto
        if (request.passengers_details && request.passengers_details[i]) {
            name = request.passengers_details[i].name;
        } else if (request.passenger_receptivity_statuses && request.passenger_receptivity_statuses[i]) {
            name = request.passenger_receptivity_statuses[i].name;
        } else if (i === 0 && request.passenger_name) {
            name = request.passenger_name;
        }

        currentDepartureStatuses.push({
            name: name,
            status: 'pending_departure',
            departure_point: '',
            notes: '',
            updated_at: new Date().toISOString()
        });
    }

    // Atualizar o índice específico
    if (currentDepartureStatuses[index]) {
        currentDepartureStatuses[index] = {
            ...currentDepartureStatuses[index],
            status,
            departure_point: departure_point || currentDepartureStatuses[index].departure_point || '',
            departure_time: departure_time || new Date().toISOString(),
            notes: notes || currentDepartureStatuses[index].notes || '',
            updated_at: new Date().toISOString()
        };
    }

    const updateData = {
        passenger_departure_statuses: currentDepartureStatuses
    };

    if (entityType === 'ServiceRequest') {
        await base44.asServiceRole.entities.ServiceRequest.update(serviceRequestId, updateData);
    } else {
        await base44.asServiceRole.entities.SupplierOwnBooking.update(serviceRequestId, updateData);
    }

    return Response.json({
      success: true,
      message: 'Status de saída atualizado',
      passengerDepartureStatuses: currentDepartureStatuses
    });

  } catch (error) {
    console.error('[updatePassengerDepartureStatus] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Erro ao atualizar status de saída' 
    }, { status: 500 });
  }
});