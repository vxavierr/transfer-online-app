import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// New helper function for reverse geocoding (updated)
const ensureArray = (value) => Array.isArray(value) ? value : [];

const reverseGeocode = async (lat, lon) => {
  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    console.error("[reverseGeocode] GOOGLE_MAPS_API_KEY não configurada.");
    return null;
  }
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`
    );
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    return null;
  } catch (error) {
    console.error("[reverseGeocode] Erro ao geocodificar:", error);
    return null;
  }
};

Deno.serve(async (req) => {
  try {
    // Handle CORS preflight request if needed (though Base44 handles this usually)
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

    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const {
      serviceRequestId,
      token,
      newStatus,
      location_lat,
      location_lon,
      latitude,
      longitude,
      notes,
      stopIndex,
      isPlannedStop
    } = body;

    // Normalize coordinates
    const finalLat = location_lat !== undefined ? location_lat : latitude;
    const finalLon = location_lon !== undefined ? location_lon : longitude;

    if (!serviceRequestId) {
      return Response.json({ 
        error: 'serviceRequestId é obrigatório' 
      }, { status: 400 });
    }

    if (!newStatus) {
      return Response.json({ 
        error: 'newStatus é obrigatório' 
      }, { status: 400 });
    }

    const validStatuses = [
      'aguardando',
      'a_caminho',
      'chegou_origem',
      'passageiro_embarcou',
      'parada_adicional',
      'a_caminho_destino',
      'chegou_destino',
      'aguardando_confirmacao_despesas',
      'finalizada',
      'no_show',
      'cancelada_motorista'
    ];

    if (!validStatuses.includes(newStatus)) {
      return Response.json({ 
        error: `Status inválido. Valores permitidos: ${validStatuses.join(', ')}` 
      }, { status: 400 });
    }

    let serviceRequest = null;
    let isOwnBooking = false;
    let isEventTrip = false;
    let isDirectBooking = false;

    // Use service role to bypass RLS for finding the request initially
    const serviceRequests = await base44.asServiceRole.entities.ServiceRequest.filter({ id: serviceRequestId });
    if (serviceRequests.length > 0) {
      serviceRequest = serviceRequests[0];
    } else {
      const bookings = await base44.asServiceRole.entities.SupplierOwnBooking.filter({ id: serviceRequestId });
      if (bookings.length > 0) {
        serviceRequest = bookings[0];
        isOwnBooking = true;
      } else {
        const eventTrips = await base44.asServiceRole.entities.EventTrip.filter({ id: serviceRequestId });
        if (eventTrips.length > 0) {
          serviceRequest = eventTrips[0];
          isEventTrip = true;
        } else {
          // 4. Buscar em Booking (Direct Booking)
          const directBookings = await base44.asServiceRole.entities.Booking.filter({ id: serviceRequestId });
          if (directBookings.length > 0) {
            serviceRequest = directBookings[0];
            isDirectBooking = true;
          }
        }
      }
    }
    
    if (!serviceRequest) {
      return Response.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    // Verificação de permissão via TOKEN ou autenticação
    let isAuthorized = false;

    if (token) {
      // Check if token matches
      if (serviceRequest.driver_access_token && serviceRequest.driver_access_token === token) {
        isAuthorized = true;
      } else {
        return Response.json({ 
          error: 'Token inválido' 
        }, { status: 403 });
      }
    } else {
      const user = await base44.auth.me().catch(() => null);
      
      if (!user) {
        return Response.json({ error: 'Não autenticado e sem token válido' }, { status: 401 });
      }

      if (user.role === 'admin') {
        isAuthorized = true;
      } else if (user.is_driver) {
        if (user.driver_id) {
          // Se a viagem tem um driver_id definido, verificamos se é o mesmo do usuário
          if (serviceRequest.driver_id) {
            if (serviceRequest.driver_id === user.driver_id) {
               isAuthorized = true;
            } else {
               // If driver has supplier_id, allow if it's the supplier? No, logic below
            }
          } else {
            // Fallback: Verificação por telefone (legado ou quando driver_id não está na request)
            const drivers = await base44.asServiceRole.entities.Driver.filter({ id: user.driver_id });
            
            if (drivers.length > 0) {
               // Normalização para comparação segura
               const normalizePhone = (p) => p ? p.replace(/\D/g, '') : '';
               const driverPhone = normalizePhone(drivers[0].phone_number);
               
               // Para EventTrip, o telefone do motorista pode estar em 'subcontractor_driver_phone' se não tiver driver_id direto
               let requestPhone = normalizePhone(serviceRequest.driver_phone);
               if (!requestPhone && isEventTrip) {
                 requestPhone = normalizePhone(serviceRequest.subcontractor_driver_phone);
               }

               if (driverPhone && requestPhone && driverPhone === requestPhone) {
                  isAuthorized = true;
               }
            }
          }
        }
      } else if (user.supplier_id) {
         // Supplier checking their own request
         if (serviceRequest.supplier_id === user.supplier_id) {
            isAuthorized = true;
         }
      }
    }

    if (!isAuthorized) {
      return Response.json({ 
        error: 'Acesso não autorizado ou motorista não corresponde' 
      }, { status: 403 });
    }

    // BLOCKING LOGIC: Check for concurrent trips if starting a new one
    if (newStatus === 'a_caminho') {
        const driverId = serviceRequest.driver_id;
        
        if (driverId) {
            const activeStatuses = [
                'a_caminho', 'chegou_origem', 'passageiro_embarcou', 
                'parada_adicional', 'a_caminho_destino', 'chegou_destino', 
                'aguardando_confirmacao_despesas'
            ];
            
            try {
                const [checkSR, checkEvent, checkOwn] = await Promise.all([
                    base44.asServiceRole.entities.ServiceRequest.filter({ 
                        driver_id: driverId, 
                        status: 'em_andamento' 
                    }),
                    base44.asServiceRole.entities.EventTrip.filter({ 
                        driver_id: driverId, 
                        status: 'dispatched' 
                    }),
                    // For SupplierOwnBooking, fetch recent ones to check status manually
                    base44.asServiceRole.entities.SupplierOwnBooking.filter({
                        driver_id: driverId
                    }, { limit: 20, sort: { date: -1 } })
                ]);

                const activeSR = checkSR.find(t => t.id !== serviceRequestId && activeStatuses.includes(t.driver_trip_status));
                const activeEvent = checkEvent.find(t => t.id !== serviceRequestId && activeStatuses.includes(t.driver_trip_status));
                const activeOwn = checkOwn.find(t => t.id !== serviceRequestId && (
                    (t.driver_trip_status && activeStatuses.includes(t.driver_trip_status)) ||
                    (t.driver_current_status && activeStatuses.includes(t.driver_current_status))
                ));

                const conflict = activeSR || activeEvent || activeOwn;

                if (conflict) {
                    const conflictCode = conflict.request_number || conflict.trip_code || conflict.booking_number || 'Viagem Ativa';
                    return Response.json({ 
                        error: `Você já possui uma viagem em andamento (${conflictCode}). Finalize-a antes de iniciar esta.`,
                        code: 'CONCURRENT_TRIP',
                        conflictId: conflict.id,
                        conflictToken: conflict.driver_access_token
                    }, { status: 409 });
                }
            } catch (err) {
                console.error('[updateTripStatus] Blocking check error:', err);
                // Continue on error to not block operations if DB is flaky, 
                // or return error? Better to log and continue or fail safe?
                // Let's continue, it's a safety feature, not critical for data integrity.
            }
        }
    }

    // Usar UTC Real (o frontend converte para Brasília)
    const now = new Date();
    const nowISO = now.toISOString();

    console.log('[updateTripStatus] 🕐 Horário UTC:', nowISO);

    // Obter endereço da localização, se disponível (Parallelize geocoding)
    let address = null;
    let locationAddress = null;
    let locationCoordinates = null;
    
    // Otimização: Apenas geocodificar para status relevantes
    const shouldGeocode = ['chegou_origem', 'chegou_destino', 'parada_adicional', 'finalizada'].includes(newStatus);

    // Start reverse geocoding early if needed
    const geocodePromise = (async () => {
        if (!shouldGeocode) return null;

        if (finalLat && finalLon) {
            try {
                return await reverseGeocode(finalLat, finalLon);
            } catch (err) {
                console.error('Erro ao geocodificar localização:', err);
            }
        } else if (serviceRequest.current_location_lat && serviceRequest.current_location_lon) {
             // Fallback for history log
             try {
                return await reverseGeocode(serviceRequest.current_location_lat, serviceRequest.current_location_lon);
            } catch (err) {
                console.error('Erro ao geocodificar localização (histórico):', err);
            }
        }
        return null;
    })();

    // Prepare coordinates for history
    const currentLat = finalLat || serviceRequest.current_location_lat;
    const currentLon = finalLon || serviceRequest.current_location_lon;
    if (currentLat && currentLon) {
        locationCoordinates = `${currentLat}, ${currentLon}`;
    }

    // Await address before proceeding with critical updates if we really need it
    // But we can let it resolve.
    const addressResult = await Promise.race([
        geocodePromise,
        new Promise(resolve => setTimeout(() => resolve(null), 3000))
    ]);
    address = addressResult;
    locationAddress = addressResult;

    // Recarregar ServiceRequest para garantir dados atualizados (ex: notification_phones)
    // Isso previne que edições recentes nos telefones não sejam consideradas no envio
    if (!isOwnBooking && !isEventTrip && !isDirectBooking) {
        try {
            const freshSR = await base44.asServiceRole.entities.ServiceRequest.get(serviceRequestId);
            if (freshSR) {
                // Mesclar para garantir que temos os campos mais recentes, especialmente contatos
                serviceRequest = { ...serviceRequest, ...freshSR };
                console.log(`[updateTripStatus] Dados recarregados. Phones: ${JSON.stringify(serviceRequest.notification_phones)}`);
            }
        } catch (e) {
            console.error('[updateTripStatus] Erro ao recarregar dados atualizados:', e);
        }
    }

    // LOGS (Fire and forget promises to run in parallel with critical update)
    const logsPromise = (async () => {
        try {
            const user = await base44.auth.me().catch(() => null); 

            await Promise.all([
                base44.asServiceRole.entities.TripStatusLog.create({
                    service_request_id: !isOwnBooking && !isEventTrip && !isDirectBooking ? serviceRequestId : null,
                    supplier_own_booking_id: isOwnBooking ? serviceRequestId : null,
                    event_trip_id: isEventTrip ? serviceRequestId : null,
                    booking_id: isDirectBooking ? serviceRequestId : null,
                    status: newStatus,
                    location_lat: finalLat || null,
                    location_lon: finalLon || null,
                    notes: notes || null,
                    timestamp: nowISO
                }),
                base44.asServiceRole.entities.TripHistory.create({
                    trip_id: serviceRequestId,
                    trip_type: isOwnBooking ? 'SupplierOwnBooking' : (isEventTrip ? 'EventTrip' : (isDirectBooking ? 'Booking' : 'ServiceRequest')),
                    event_type: 'Status Alterado',
                    user_id: user ? user.id : (token ? 'motorista_token' : 'motorista_unknown'),
                    user_name: user ? (user.full_name || user.email) : 'Motorista (App)',
                    details: {
                        old_status: isDirectBooking ? serviceRequest.driver_current_status : serviceRequest.driver_trip_status,
                        new_status: newStatus,
                        location_coordinates: locationCoordinates,
                        location_address: locationAddress
                    },
                    comment: notes || `Status alterado para ${newStatus}`
                })
            ]);
        } catch (logError) {
            console.error('[updateTripStatus] Erro nos logs:', logError);
        }
    })();

    const currentCommandHistory = ensureArray(serviceRequest.command_history);

    // Adicionar ao histórico de comandos
    const commandEntry = {
      status: newStatus,
      timestamp: nowISO,
      ...(finalLat !== undefined && finalLat !== null ? { latitude: finalLat } : {}),
      ...(finalLon !== undefined && finalLon !== null ? { longitude: finalLon } : {}),
      ...(address ? { address } : {})
    };

    // Atualizar a ServiceRequest
    const updateData = {
      driver_trip_status: newStatus,
      driver_trip_status_updated_at: nowISO,
      // Atualizar localização imediatamente para refletir no mapa
      ...(finalLat && { current_location_lat: finalLat }),
      ...(finalLon && { current_location_lon: finalLon }),
      ...(finalLat && finalLon && { location_last_updated_at: nowISO }),
      command_history: [
        ...currentCommandHistory,
        commandEntry
      ]
    };

    // Lógica de Paradas Adicionais (Cronômetro) e Paradas Planejadas
    let currentStops = [...ensureArray(serviceRequest.additional_stops)];
    let stopsUpdated = false;
    let plannedStopsUpdated = false;
    let currentPlannedStops = [...ensureArray(serviceRequest.planned_stops)];

    // 1. Se estiver entrando em parada adicional
    if (newStatus === 'parada_adicional') {
      // Adicionar nova parada ativa
      currentStops.push({
        timestamp: nowISO, // Mantido para compatibilidade
        start_time: nowISO,
        status: 'active',
        notes: notes || (isPlannedStop && stopIndex !== undefined && currentPlannedStops[stopIndex] ? `Parada: ${currentPlannedStops[stopIndex].address}` : 'Parada iniciada'),
        ...(finalLat !== undefined && finalLat !== null ? { latitude: finalLat } : {}),
        ...(finalLon !== undefined && finalLon !== null ? { longitude: finalLon } : {}),
        ...(address ? { address } : {})
      });
      stopsUpdated = true;

      // Se for uma parada planejada, atualizar o status dela
      if (isPlannedStop && stopIndex !== undefined && currentPlannedStops[stopIndex]) {
        currentPlannedStops[stopIndex] = {
          ...currentPlannedStops[stopIndex],
          status: 'completed',
          completed_at: nowISO
        };
        plannedStopsUpdated = true;

        // Notificar passageiro específico da parada
        const stop = currentPlannedStops[stopIndex];
        if (stop.passenger_phone && (stop.purpose === 'pickup' || stop.purpose === 'dropoff')) {
          const msg = stop.purpose === 'pickup' 
            ? `🚗 Olá ${stop.passenger_name || ''}! Seu motorista chegou ao ponto de encontro.`
            : `📍 Olá ${stop.passenger_name || ''}! Você chegou ao seu destino.`;
          
          try {
            base44.functions.invoke('sendWhatsAppMessage', {
              to: stop.passenger_phone,
              message: msg
            });
          } catch (e) {
            console.error('Erro ao enviar notificação de parada:', e);
          }
        }
      }
    } 
    // 2. Se estiver saindo de uma parada (qualquer outro status) e tiver parada ativa
    else {
      // Verificar se existe alguma parada ativa para fechar
      const activeStopIndex = currentStops.findIndex(s => s.status === 'active');
      
      if (activeStopIndex !== -1) {
        const activeStop = currentStops[activeStopIndex];
        const endTime = new Date();
        const startTime = new Date(activeStop.start_time);
        const durationMs = endTime - startTime;
        const durationMinutes = Math.ceil(durationMs / 60000); // Arredondar para cima

        currentStops[activeStopIndex] = {
          ...activeStop,
          end_time: nowISO,
          duration_minutes: durationMinutes,
          status: 'completed'
        };
        stopsUpdated = true;
      }
    }

    if (stopsUpdated) {
      updateData.additional_stops = currentStops;
    }

    if (plannedStopsUpdated) {
      updateData.planned_stops = currentPlannedStops;
    }

    // Atualizar status geral baseado no status do motorista
    if (newStatus === 'a_caminho' || newStatus === 'chegou_origem' || newStatus === 'passageiro_embarcou' || newStatus === 'a_caminho_destino' || newStatus === 'parada_adicional' || newStatus === 'chegou_destino') {
      updateData.status = 'em_andamento';
    }

    if (newStatus === 'finalizada') {
      updateData.status = 'concluida';
    }

    if (newStatus === 'cancelada_motorista' || newStatus === 'no_show') {
      updateData.status = 'cancelada';
    }

    if (isOwnBooking) {
      await base44.asServiceRole.entities.SupplierOwnBooking.update(serviceRequestId, updateData);
    } else if (isEventTrip) {
      // Mapeamento de status para EventTrip
      const eventUpdateData = { ...updateData };
      
      // Mapear status geral para os permitidos em EventTrip (planned, confirmed, dispatched, completed, cancelled)
      if (updateData.status === 'em_andamento') eventUpdateData.status = 'dispatched';
      if (updateData.status === 'concluida') eventUpdateData.status = 'completed';
      if (updateData.status === 'cancelada') eventUpdateData.status = 'cancelled';
      
      // Se não houver mapeamento direto (ex: status intermediários), mantém o status atual ou não altera se não for compatível
      if (!['planned', 'confirmed', 'dispatched', 'completed', 'cancelled'].includes(eventUpdateData.status)) {
         delete eventUpdateData.status; // Não atualiza o status geral se não tiver um correspondente
      }

      await base44.asServiceRole.entities.EventTrip.update(serviceRequestId, eventUpdateData);
    } else if (isDirectBooking) {
      // Mapeamento para Booking (Booking usa driver_current_status em vez de driver_trip_status)
      const bookingUpdateData = { ...updateData };
      
      // Ajustar nome do campo de status do motorista
      bookingUpdateData.driver_current_status = bookingUpdateData.driver_trip_status;
      delete bookingUpdateData.driver_trip_status;
      
      // Mapear status geral (Booking não tem 'em_andamento')
      if (bookingUpdateData.status === 'em_andamento') {
        // Se estiver em andamento, não altera o status principal (mantém confirmada)
        delete bookingUpdateData.status;
      }
      
      await base44.asServiceRole.entities.Booking.update(serviceRequestId, bookingUpdateData);
    } else {
      await base44.asServiceRole.entities.ServiceRequest.update(serviceRequestId, updateData);
    }

    // Execute non-critical tasks in parallel (ETA, Notifications, Rating)
    const sideEffectsPromise = (async () => {
        let generatedTimelineUrl = null;
        let etaMinutes = null;

        // 1. Calculate ETA (Otimizado: apenas quando realmente necessário)
        const shouldCalculateETA = ['a_caminho', 'passageiro_embarcou', 'a_caminho_destino'].includes(newStatus);
        
        if (shouldCalculateETA) {
            // PRIORIDADE 1: Usar GPS se disponível
            if (finalLat && finalLon && finalLat !== 0 && finalLon !== 0) {
                const driverLoc = `${finalLat},${finalLon}`;
                let calcOrigin = null;
                let calcDestination = null;

                if (newStatus === 'a_caminho' && serviceRequest.origin) {
                    calcOrigin = driverLoc;
                    calcDestination = serviceRequest.origin;
                } else if (['passageiro_embarcou', 'a_caminho_destino'].includes(newStatus) && serviceRequest.destination) {
                    calcOrigin = driverLoc;
                    calcDestination = serviceRequest.destination;
                }

                if (calcOrigin && calcDestination) {
                    try {
                        const etaResponse = await base44.functions.invoke('calculateETA', {
                            origin: calcOrigin,
                            destination: calcDestination
                        });
                        if (etaResponse.data.success) {
                            etaMinutes = etaResponse.data.eta_minutes;
                            console.log(`[updateTripStatus] ✅ ETA calculado via GPS: ${etaMinutes} min`);
                        }
                    } catch (e) { console.error('ETA GPS Error', e); }
                }
            }
            
            // PRIORIDADE 2: Fallback para origem → destino (sempre que possível, especialmente para "passageiro_embarcou")
            if (!etaMinutes && serviceRequest.destination) {
                // Para "passageiro_embarcou", sempre calcular ETA mesmo sem GPS
                const shouldFallback = newStatus === 'passageiro_embarcou' || 
                                       (newStatus === 'a_caminho_destino' && serviceRequest.origin);
                
                if (shouldFallback) {
                    try {
                        const fallbackOrigin = newStatus === 'passageiro_embarcou' ? serviceRequest.origin : serviceRequest.origin;
                        const etaResponse = await base44.functions.invoke('calculateETA', {
                            origin: fallbackOrigin,
                            destination: serviceRequest.destination
                        });
                        if (etaResponse.data.success) {
                            etaMinutes = etaResponse.data.eta_minutes;
                            console.log(`[updateTripStatus] ⚠️ ETA calculado via fallback (origem→destino): ${etaMinutes} min`);
                        }
                    } catch (e) { console.error('ETA Fallback Error', e); }
                }
            }
        }

        // Sempre atualiza o ETA se deveria calcular, mesmo que seja para null (para limpar dados antigos/incorretos)
        if (shouldCalculateETA) {
             const etaUpdate = {
                current_eta_minutes: etaMinutes, // Pode ser null se falhou, o que limpa a previsão errada
                eta_last_calculated_at: nowISO
            };
            try {
                if (isOwnBooking) await base44.asServiceRole.entities.SupplierOwnBooking.update(serviceRequestId, etaUpdate);
                else if (isEventTrip) await base44.asServiceRole.entities.EventTrip.update(serviceRequestId, etaUpdate);
                else if (isDirectBooking) {
                    // Booking não tem campos de ETA, ignorar
                }
                else await base44.asServiceRole.entities.ServiceRequest.update(serviceRequestId, etaUpdate);
            } catch(e) { console.error('Update ETA Error', e); }
        }

        // 2. Timeline Link
        // Garante que só gera o link se for EXATAMENTE 'a_caminho'.
        // Para 'passageiro_embarcou', NÃO deve gerar nem reenviar link via generateSharedTimelineLink para o passageiro.
        if (newStatus === 'a_caminho') {
            try {
                const timelineResponse = await base44.functions.invoke('generateSharedTimelineLink', {
                    serviceRequestId: serviceRequestId,
                    notificationType: 'both',
                    autoGenerated: true
                });
                if (timelineResponse.data && timelineResponse.data.success) generatedTimelineUrl = timelineResponse.data.timelineUrl;
            } catch (e) { console.error('Timeline Gen Error', e); }
        } else {
             try {
                const filterQuery = { status: 'active' };
                if (isOwnBooking) filterQuery.supplier_own_booking_id = serviceRequestId;
                else if (isEventTrip) filterQuery.event_trip_id = serviceRequestId;
                else filterQuery.service_request_id = serviceRequestId;
                const existingTimelines = await base44.asServiceRole.entities.SharedTripTimeline.filter(filterQuery);
                if (existingTimelines.length > 0) {
                    const baseUrl = Deno.env.get('BASE_URL') || `https://${req.headers.get('host')}`;
                    generatedTimelineUrl = `${baseUrl}/SharedTripTimeline?token=${existingTimelines[0].token}`;
                }
            } catch (e) {}
        }

        // 3. Status Notification
        try {
            await base44.functions.invoke('sendTripStatusNotification', {
                trip: {
                    ...serviceRequest,
                    command_history: ensureArray(updateData.command_history),
                    additional_stops: ensureArray(updateData.additional_stops || serviceRequest.additional_stops),
                    planned_stops: ensureArray(updateData.planned_stops || serviceRequest.planned_stops),
                    driver_trip_status: newStatus,
                    status: updateData.status || serviceRequest.status
                },
                newStatus: newStatus,
                timelineUrl: generatedTimelineUrl
            });

            // Enviar notificações extras para telefones cadastrados (se houver)
            // REMOVIDO: Agora handled internamente pelo generateSharedTimelineLink para garantir dados frescos e evitar duplicidade
            /*
            if (newStatus === 'a_caminho' && generatedTimelineUrl && serviceRequest.notification_phones && serviceRequest.notification_phones.length > 0) {
                console.log(`[updateTripStatus] Enviando notificações extras para ${serviceRequest.notification_phones.length} números.`);
                
                const extraMsg = `🚗 *Sua viagem iniciou!* \n\nAcompanhe o deslocamento em tempo real aqui: ${generatedTimelineUrl}`;
                
                await Promise.all(serviceRequest.notification_phones.map(phone => {
                    return base44.functions.invoke('sendWhatsAppMessage', {
                        to: phone,
                        message: extraMsg
                    }).catch(err => console.error(`Erro ao enviar notificação extra para ${phone}:`, err));
                }));
            }
            */
        } catch (e) { console.error('Notification Error', e); }

        // 4. Rating Link (Finalized)
        if (newStatus === 'finalizada') {
            try {
                let passengerEmail = isOwnBooking ? serviceRequest.passenger_email : (serviceRequest.passenger_email || serviceRequest.customer_email);
                if (passengerEmail) {
                    await base44.functions.invoke('generateAndSendRatingLink', {
                        serviceRequestId: serviceRequestId,
                        recipientEmail: passengerEmail
                    });
                }
            } catch (e) { console.error('Rating Link Error', e); }
        }

        return etaMinutes;
    })();

    const etaResult = await sideEffectsPromise;

    // Await logs as well to ensure they are saved
    await logsPromise;

    return Response.json({
      success: true,
      message: 'Status atualizado com sucesso',
      newStatus,
      eta_minutes: etaResult || null,
      brasilia_time: nowISO
    });

  } catch (error) {
    console.error('[updateTripStatus] Erro:', error);
    return Response.json({
      error: error.message || 'Erro ao atualizar status da viagem'
    }, { status: 500 });
  }
});