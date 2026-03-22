import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token, action } = body;

    // Caso especial para EventPassenger (usado no ReceptiveListEventView)
    if (body.eventId && body.passengerData) {
        const { eventId, passengerData } = body;
        
        // Validar token e obter lista
        let sharedList = null;
        if (token) {
            const sharedLists = await base44.asServiceRole.entities.SharedReceptiveList.filter({ token });
            if (sharedLists.length === 0) {
                return Response.json({ success: false, error: 'Token inválido' }, { status: 403 });
            }
            sharedList = sharedLists[0];
        }

        if (action === 'add') {
            let targetTripId = passengerData.event_trip_id;
            let targetTrip = null;

            if (targetTripId) {
                // Se o ID da viagem for explicitamente fornecido do frontend, use-o diretamente
                targetTrip = await base44.asServiceRole.entities.EventTrip.get(targetTripId).catch(() => null);
                if (!targetTrip) {
                    return Response.json({ success: false, error: 'Viagem selecionada não encontrada' }, { status: 404 });
                }
            } else if (sharedList) {
                // Se não tiver trip ID, tentar encontrar a viagem correta na lista compartilhada
                const currentTripIds = sharedList.event_trip_ids || [];
                
                if (currentTripIds.length > 0) {
                     const existingTrips = await base44.asServiceRole.entities.EventTrip.filter({
                        id: { $in: currentTripIds }
                    });

                    // Prioridade: Viagens Normais (Não Flexíveis)
                    const normalTrips = existingTrips.filter(t => !t.is_flexible_vehicle);
                    
                    if (normalTrips.length === 1) {
                        // Se só tem 1 viagem normal (ex: ônibus específico), usa ela
                        targetTrip = normalTrips[0];
                        targetTripId = targetTrip.id;
                    } else if (existingTrips.length === 1) {
                        // Se só tem 1 viagem no total, usa ela
                        targetTrip = existingTrips[0];
                        targetTripId = targetTrip.id;
                    } else {
                        // Fallback: Procura por uma de "Avulsos" na data
                        const tripDate = passengerData.date || new Date().toISOString().split('T')[0];
                        const avulsoTrip = existingTrips.find(t => 
                            t.is_flexible_vehicle === true && 
                            t.date === tripDate &&
                            (t.name.includes("Avulsos") || t.name.includes("Adicionados") || t.name.includes("Extra"))
                        );
                        if (avulsoTrip) {
                            targetTrip = avulsoTrip;
                            targetTripId = avulsoTrip.id;
                        }
                    }
                }

                // Se ainda não tem viagem (e não encontrou a normal única), cria uma nova de "Passageiros Adicionados"
                if (!targetTripId) {
                    const tripDate = passengerData.date || new Date().toISOString().split('T')[0];
                    targetTrip = await base44.asServiceRole.entities.EventTrip.create({
                        event_id: eventId,
                        name: "Passageiros Adicionados (Avulsos)",
                        status: "confirmed",
                        is_flexible_vehicle: true,
                        trip_type: passengerData.trip_type || 'door_to_door',
                        date: tripDate,
                        start_time: passengerData.time || '00:00',
                        end_time: passengerData.time || '00:00',
                        vehicle_capacity: 99,
                        passenger_count: 0,
                        origin: passengerData.origin_address || "A definir",
                        destination: passengerData.destination_address || "A definir"
                    });

                    // Adicionar à lista
                    await base44.asServiceRole.entities.SharedReceptiveList.update(sharedList.id, {
                        event_trip_ids: [...(sharedList.event_trip_ids || []), targetTrip.id]
                    });

                    targetTripId = targetTrip.id;
                }
                }

            // Determinar se é alocação flexível baseado na viagem alvo
            // Se a viagem for normal (ex: ônibus), o passageiro NÃO deve ser flexível para aparecer na lista correta
            let isFlexible = passengerData.is_flexible_allocation;
            if (targetTrip && !targetTrip.is_flexible_vehicle) {
                isFlexible = false;
            } else if (targetTrip && targetTrip.is_flexible_vehicle) {
                isFlexible = true;
            }

            const newPassenger = await base44.asServiceRole.entities.EventPassenger.create({
                event_id: eventId,
                event_trip_id: targetTripId, // Vincular à viagem
                ...passengerData,
                is_flexible_allocation: isFlexible,
                // Sobrescrever status para embarcado automaticamente
                boarding_status: 'boarded',
                status: 'assigned',
                boarding_time: new Date().toISOString(),
                assigned_at_checkin: true
            });
            
            // Atualizar contagem da viagem
            if (targetTripId) {
                try {
                    const trip = targetTrip || await base44.asServiceRole.entities.EventTrip.get(targetTripId);
                    await base44.asServiceRole.entities.EventTrip.update(targetTripId, {
                        passenger_count: (trip.passenger_count || 0) + 1,
                        current_passenger_count: (trip.current_passenger_count || 0) + 1
                    });
                } catch (e) {}
            }

            return Response.json({ success: true, data: newPassenger });
        }
    }

    // Caso padrão para ServiceRequest / SupplierOwnBooking
    const { requestId, passengerIndex, data } = body;

    if (!requestId || passengerIndex === undefined || !action) {
      return Response.json({ success: false, error: 'Parâmetros inválidos' }, { status: 400 });
    }

    // Validar token (segurança)
    if (token) {
      const sharedLists = await base44.asServiceRole.entities.SharedReceptiveList.filter({ token });
      if (sharedLists.length === 0) {
        return Response.json({ success: false, error: 'Token inválido' }, { status: 403 });
      }
    }

    // Buscar solicitação
    let entityType = 'ServiceRequest';
    let request = null;
    try {
        request = await base44.asServiceRole.entities.ServiceRequest.get(requestId);
    } catch (e) {}
    
    if (!request) {
        try {
            request = await base44.asServiceRole.entities.SupplierOwnBooking.get(requestId);
            entityType = 'SupplierOwnBooking';
        } catch (e) {}
    }

    if (!request) {
      return Response.json({ success: false, error: 'Solicitação não encontrada' }, { status: 404 });
    }

    const passengersDetails = request.passengers_details || [];
    const receptivityStatuses = request.passenger_receptivity_statuses || [];
    const departureStatuses = request.passenger_departure_statuses || [];

    if (passengerIndex < 0 || passengerIndex >= (passengersDetails.length || request.passengers)) {
        return Response.json({ success: false, error: 'Índice de passageiro inválido' }, { status: 400 });
    }

    let updateData = {};

    if (action === 'remove') {
        // Remover dos arrays
        passengersDetails.splice(passengerIndex, 1);
        receptivityStatuses.splice(passengerIndex, 1);
        departureStatuses.splice(passengerIndex, 1);
        
        updateData = {
            passengers: (request.passengers || 1) - 1,
            passengers_details: passengersDetails,
            passenger_receptivity_statuses: receptivityStatuses,
            passenger_departure_statuses: departureStatuses
        };
    } else if (action === 'update_notes') {
        // Atualizar notas (comentário)
        if (receptivityStatuses[passengerIndex]) {
            receptivityStatuses[passengerIndex].notes = data.notes;
            receptivityStatuses[passengerIndex].updated_at = new Date().toISOString();
        } else {
            // Se não existir status ainda, criar estrutura básica
             receptivityStatuses[passengerIndex] = {
                name: passengersDetails[passengerIndex]?.name || `Passageiro ${passengerIndex + 1}`,
                status: 'pending',
                notes: data.notes,
                updated_at: new Date().toISOString()
            };
        }
        updateData = { passenger_receptivity_statuses: receptivityStatuses };
    } else if (action === 'update_profile') {
        // Atualizar dados do passageiro
        if (passengersDetails[passengerIndex]) {
            passengersDetails[passengerIndex] = {
                ...passengersDetails[passengerIndex],
                ...data
            };
        }
        // Atualizar nome nos status também se mudou
        if (data.name) {
            if (receptivityStatuses[passengerIndex]) receptivityStatuses[passengerIndex].name = data.name;
            if (departureStatuses[passengerIndex]) departureStatuses[passengerIndex].name = data.name;
        }
        
        updateData = { 
            passengers_details: passengersDetails,
            passenger_receptivity_statuses: receptivityStatuses,
            passenger_departure_statuses: departureStatuses
        };
    }

    // Salvar
    if (entityType === 'ServiceRequest') {
        await base44.asServiceRole.entities.ServiceRequest.update(requestId, updateData);
    } else {
        await base44.asServiceRole.entities.SupplierOwnBooking.update(requestId, updateData);
    }

    return Response.json({ 
        success: true, 
        message: 'Atualizado com sucesso',
        data: updateData
    });

  } catch (error) {
    console.error('Erro em managePassenger:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});