import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { serviceRequestId, token, status, reason, passengerUpdate, type } = await req.json(); // NOVO: reason e passengerUpdate

    if (!serviceRequestId || !token) {
      return Response.json({ 
        success: false, 
        error: 'Parâmetros obrigatórios: serviceRequestId, token' 
      }, { status: 400 });
    }

    const validStatuses = ['efetuada', 'nao_efetuada', 'finalizada', 'started', 'completed', 'pending'];
    if (status && !validStatuses.includes(status)) {
      return Response.json({ 
        success: false, 
        error: 'Status inválido.' 
      }, { status: 400 });
    }

    // NOVO: Validar motivo quando status for nao_efetuada
    if (status === 'nao_efetuada' && (!reason || !reason.trim())) {
      return Response.json({ 
        success: false, 
        error: 'Motivo é obrigatório quando a receptividade não foi efetuada' 
      }, { status: 400 });
    }

    // 1. Validar token
    const sharedLists = await base44.asServiceRole.entities.SharedReceptiveList.filter({ token });

    if (sharedLists.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Token inválido' 
      }, { status: 404 });
    }

    const sharedList = sharedLists[0];

    // 2. Verificar se não expirou
    const now = new Date();
    const expiresAt = new Date(sharedList.expires_at);

    if (now > expiresAt) {
      return Response.json({ 
        success: false, 
        error: 'Link expirado' 
      }, { status: 410 });
    }

    // 3. Verificar se o serviceRequestId está associado a este token
    if (!sharedList.request_ids.includes(serviceRequestId)) {
      return Response.json({ 
        success: false, 
        error: 'Solicitação não pertence a esta lista' 
      }, { status: 403 });
    }

    // 4. Obter IP do requisitante
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      'unknown';

    // 5. Buscar a entidade atual para manipular array de passageiros
    let entityType = 'ServiceRequest';
    let request = null;
    
    try {
        request = await base44.asServiceRole.entities.ServiceRequest.get(serviceRequestId);
    } catch (e) {
        // Ignorar erro se não encontrar, tentar o próximo
    }
    
    // Fallback para SupplierOwnBooking se não encontrar
    if (!request) {
        try {
            request = await base44.asServiceRole.entities.SupplierOwnBooking.get(serviceRequestId);
            entityType = 'SupplierOwnBooking';
        } catch (e) {
            // Ignorar erro
        }
    }

    if (!request) {
        return Response.json({ success: false, error: 'Viagem não encontrada' }, { status: 404 });
    }

    const updateData = {};

    // Se for atualização de status geral
    if (status) {
        // --- FASE 2: Lógica para Saída/Retorno (type = 'departure') ---
        if (type === 'departure') {
            updateData.departure_status = status;

            if (status === 'started') {
                // Iniciar viagem de VOLTA
                updateData.departure_trip_status = 'passageiro_embarcou'; // Status específico da volta
                updateData.driver_trip_status = 'passageiro_embarcou';    // Status global (reflete o que está acontecendo agora)
                updateData.driver_current_status = 'passageiro_embarcou';
                updateData.status = 'em_andamento'; // Atualiza status global para Em Andamento

                // Calcular ETA
                const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
                if (googleMapsApiKey && request.origin && request.destination) {
                  try {
                    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
                    url.searchParams.append('origins', request.origin);
                    url.searchParams.append('destinations', request.destination);
                    url.searchParams.append('mode', 'driving');
                    url.searchParams.append('departure_time', 'now');
                    url.searchParams.append('traffic_model', 'best_guess');
                    url.searchParams.append('key', googleMapsApiKey);

                    const res = await fetch(url.toString());
                    const data = await res.json();

                    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
                      const element = data.rows[0].elements[0];
                      const durationSeconds = element.duration_in_traffic?.value || element.duration?.value || 0;
                      updateData.current_eta_minutes = Math.ceil(durationSeconds / 60);
                      updateData.eta_last_calculated_at = new Date().toISOString();
                    }
                  } catch (e) {
                    console.error('Erro ao calcular ETA:', e);
                  }
                }
            } else if (status === 'completed') {
                // Finalizar viagem de VOLTA
                updateData.departure_trip_status = 'finalizada'; // Status específico da volta
                updateData.driver_trip_status = 'finalizada';    // Status global
                updateData.driver_current_status = 'finalizada';
                updateData.status = 'concluida';
            }
        } 
        // --- FASE 1: Lógica Padrão (Receptivo/Ida) ---
        else {
            updateData.receptivity_status = status;
            updateData.receptivity_updated_at = new Date().toISOString();
            updateData.receptivity_updated_by_ip = ipAddress;

            if (status === 'nao_efetuada' && reason) {
              updateData.receptivity_not_completed_reason = reason.trim();
              updateData.receptivity_trip_status = 'no_show'; // Status específico da ida
            } else if (status === 'efetuada') {
              updateData.receptivity_not_completed_reason = null;
              updateData.receptivity_trip_status = 'passageiro_embarcou'; // Inicia a viagem de ida
              updateData.status = 'em_andamento'; // Atualiza status global para Em Andamento

              // Atualizar status global APENAS se a volta ainda não estiver em andamento/finalizada
              // Para evitar sobrescrever status da volta se ela ocorrer simultaneamente ou logo depois
              if (!request.departure_status || request.departure_status === 'pending') {
                  updateData.driver_trip_status = 'passageiro_embarcou';
                  updateData.driver_current_status = 'passageiro_embarcou';
              }
            } else if (status === 'finalizada') {
                // Finalizar viagem de IDA (novo status para receptivo)
                updateData.receptivity_trip_status = 'finalizada';

                // Atualizar status global para 'em_andamento' caso ainda esteja como pendente/confirmada
                if (['pendente', 'confirmada'].includes(request.status)) {
                    updateData.status = 'em_andamento';
                }

                // Atualizar global se volta ainda não começou
                if (!request.departure_status || request.departure_status === 'pending') {
                    // Se só tem ida, ou se a volta é muito depois, 'finalizada' no global faz sentido.
                    updateData.driver_trip_status = 'finalizada';
                    updateData.driver_current_status = 'finalizada';
                }
            }
        }
    }

    // Se for atualização individual de passageiro
    if (passengerUpdate) {
        const { index, status: pStatus, notes } = passengerUpdate;
        
        // Inicializar array se não existir ou estiver vazio
        let currentStatuses = request.passenger_receptivity_statuses || [];
        
        // Se estiver vazio, popular com os passageiros existentes
        if (currentStatuses.length === 0) {
            // Pegar da lista detalhada ou criar do principal
            if (request.passengers_details && request.passengers_details.length > 0) {
                currentStatuses = request.passengers_details.map(p => ({
                    name: p.name,
                    status: 'pending',
                    notes: ''
                }));
            } else {
                // Criar entradas genéricas se não houver detalhes
                currentStatuses = Array.from({ length: request.passengers || 1 }).map((_, i) => ({
                    name: i === 0 ? (request.passenger_name || 'Passageiro Principal') : `Passageiro ${i + 1}`,
                    status: 'pending',
                    notes: ''
                }));
            }
        }

        // Atualizar o passageiro específico
        if (currentStatuses[index]) {
            currentStatuses[index] = {
                ...currentStatuses[index],
                status: pStatus,
                notes: notes || '',
                updated_at: new Date().toISOString()
            };
        }

        updateData.passenger_receptivity_statuses = currentStatuses;
    }

    if (entityType === 'ServiceRequest') {
        await base44.asServiceRole.entities.ServiceRequest.update(serviceRequestId, updateData);
    } else {
        await base44.asServiceRole.entities.SupplierOwnBooking.update(serviceRequestId, updateData);
    }

    return Response.json({
      success: true,
      message: 'Status de receptividade atualizado com sucesso',
      status,
      updatedAt: new Date().toISOString(),
      passengerStatuses: updateData.passenger_receptivity_statuses
    });

  } catch (error) {
    console.error('[updateReceptivityStatus] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Erro ao atualizar status de receptividade' 
    }, { status: 500 });
  }
});