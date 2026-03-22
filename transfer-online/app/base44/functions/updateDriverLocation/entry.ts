import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Função para notificar admin sobre GPS desabilitado
async function notifyAdminGPSIssue(base44, serviceRequest) {
  try {
    // Buscar admins
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = allUsers.filter(u => u.role === 'admin');
    
    if (admins.length === 0) return;
    
    // Enviar email para os admins
    for (const admin of admins) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `⚠️ GPS Desabilitado - ${serviceRequest.request_number}`,
        body: `
          <h2>Alerta: GPS Desabilitado</h2>
          <p>O motorista da viagem <strong>${serviceRequest.request_number}</strong> está com o GPS desabilitado ou sem sinal.</p>
          <ul>
            <li><strong>Motorista:</strong> ${serviceRequest.driver_name || 'Não atribuído'}</li>
            <li><strong>Viagem:</strong> ${serviceRequest.origin} → ${serviceRequest.destination}</li>
            <li><strong>Data:</strong> ${serviceRequest.date} às ${serviceRequest.time}</li>
            <li><strong>Passageiro:</strong> ${serviceRequest.passenger_name}</li>
          </ul>
          <p style="color: red; font-weight: bold;">⚠️ O rastreamento em tempo real não está disponível para esta viagem.</p>
          <p>Entre em contato com o motorista se necessário.</p>
        `
      });
    }
    
    console.log('[notifyAdminGPSIssue] Notificações enviadas para', admins.length, 'admins');
  } catch (err) {
    console.error('[notifyAdminGPSIssue] Erro ao notificar admins:', err);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { serviceRequestId, token, latitude, longitude, speed, gpsDisabled } = body;

    // Validação de token ou autenticação de motorista
    if (token) {
      // Acesso via token (sem autenticação de usuário)
      let serviceRequest = null;
      let isOwnBooking = false;

      const serviceRequests = await base44.asServiceRole.entities.ServiceRequest.filter({
        driver_access_token: token
      });

      if (serviceRequests.length > 0) {
        serviceRequest = serviceRequests[0];
      } else {
        const bookings = await base44.asServiceRole.entities.SupplierOwnBooking.filter({
          driver_access_token: token
        });
        if (bookings.length > 0) {
          serviceRequest = bookings[0];
          isOwnBooking = true;
        }
      }

      if (!serviceRequest) {
        return Response.json({ error: 'Token inválido' }, { status: 401 });
      }

      // Se GPS foi desabilitado, notificar admin
      if (gpsDisabled === true) {
        console.log('[updateDriverLocation] GPS desabilitado detectado - notificando admins');
        
        // Notificar admins de forma assíncrona (não aguardar)
        notifyAdminGPSIssue(base44, serviceRequest).catch(err => {
          console.error('[updateDriverLocation] Erro ao notificar admins:', err);
        });
        
        return Response.json({ 
          success: true,
          gps_alert_sent: true,
          message: 'Administradores notificados sobre GPS desabilitado'
        });
      }

      // Validar coordenadas
      if (latitude === undefined || longitude === undefined) {
        return Response.json({ error: 'Coordenadas são obrigatórias' }, { status: 400 });
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return Response.json({ error: 'Coordenadas inválidas' }, { status: 400 });
      }

      const now = new Date().toISOString();

      // Atualizar localização
      const locUpdate = {
        current_location_lat: latitude,
        current_location_lon: longitude,
        current_speed: speed,
        location_last_updated_at: now,
        gps_tracking_enabled: true
      };

      if (isOwnBooking) {
        await base44.asServiceRole.entities.SupplierOwnBooking.update(serviceRequest.id, locUpdate);
      } else {
        await base44.asServiceRole.entities.ServiceRequest.update(serviceRequest.id, locUpdate);
      }

      // Registrar no log
      await base44.asServiceRole.entities.TripStatusLog.create({
        service_request_id: serviceRequest.id,
        status: serviceRequest.driver_trip_status,
        location_lat: latitude,
        location_lon: longitude,
        notes: 'Atualização de localização GPS',
        timestamp: now
      });

      // Calcular ETA se passageiro embarcou
      let etaMinutes = null;
      if (serviceRequest.driver_trip_status === 'passageiro_embarcou' && serviceRequest.destination) {
        try {
          const etaResponse = await base44.asServiceRole.functions.invoke('calculateETA', {
            origin: `${latitude},${longitude}`,
            destination: serviceRequest.destination
          });

          if (etaResponse.data.success) {
            etaMinutes = etaResponse.data.eta_minutes;
            
            const etaUpdate = {
              current_eta_minutes: etaMinutes,
              eta_last_calculated_at: now
            };

            if (isOwnBooking) {
              await base44.asServiceRole.entities.SupplierOwnBooking.update(serviceRequest.id, etaUpdate);
            } else {
              await base44.asServiceRole.entities.ServiceRequest.update(serviceRequest.id, etaUpdate);
            }
          }
        } catch (etaError) {
          console.error('[updateDriverLocation] Erro ao calcular ETA:', etaError);
        }
      }

      return Response.json({
        success: true,
        message: 'Localização atualizada com sucesso',
        eta_minutes: etaMinutes,
        location: {
          latitude,
          longitude,
          updated_at: now
        }
      });
    }

    // Autenticação via usuário logado (fallback)
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_driver) {
      return Response.json({ error: 'Acesso restrito a motoristas' }, { status: 403 });
    }

    if (!serviceRequestId) {
      return Response.json({ error: 'serviceRequestId é obrigatório' }, { status: 400 });
    }

    const serviceRequests = await base44.entities.ServiceRequest.filter({ id: serviceRequestId });
    
    if (!serviceRequests || serviceRequests.length === 0) {
      return Response.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    const serviceRequest = serviceRequests[0];

    const activeStatuses = ['a_caminho', 'chegou_origem', 'passageiro_embarcou', 'a_caminho_destino'];
    if (!activeStatuses.includes(serviceRequest.driver_trip_status)) {
      return Response.json({ 
        error: 'Rastreamento só é permitido durante viagens ativas' 
      }, { status: 400 });
    }

    // Se GPS foi desabilitado, notificar admin
    if (gpsDisabled === true) {
      console.log('[updateDriverLocation] GPS desabilitado detectado - notificando admins');
      
      notifyAdminGPSIssue(base44, serviceRequest).catch(err => {
        console.error('[updateDriverLocation] Erro ao notificar admins:', err);
      });
      
      return Response.json({ 
        success: true,
        gps_alert_sent: true,
        message: 'Administradores notificados sobre GPS desabilitado'
      });
    }

    if (latitude === undefined || longitude === undefined) {
      return Response.json({ error: 'Coordenadas são obrigatórias' }, { status: 400 });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return Response.json({ error: 'Coordenadas inválidas' }, { status: 400 });
    }

    const now = new Date().toISOString();

    await base44.entities.ServiceRequest.update(serviceRequestId, {
      current_location_lat: latitude,
      current_location_lon: longitude,
      current_speed: speed,
      location_last_updated_at: now,
      gps_tracking_enabled: true
    });

    await base44.entities.TripStatusLog.create({
      service_request_id: serviceRequestId,
      status: serviceRequest.driver_trip_status,
      location_lat: latitude,
      location_lon: longitude,
      notes: 'Atualização de localização GPS',
      timestamp: now
    });

    let etaMinutes = null;
    if (serviceRequest.driver_trip_status === 'passageiro_embarcou' && serviceRequest.destination) {
      try {
        const etaResponse = await base44.functions.invoke('calculateETA', {
          origin: `${latitude},${longitude}`,
          destination: serviceRequest.destination
        });

        if (etaResponse.data.success) {
          etaMinutes = etaResponse.data.eta_minutes;
          
          await base44.entities.ServiceRequest.update(serviceRequestId, {
            current_eta_minutes: etaMinutes,
            eta_last_calculated_at: now
          });
        }
      } catch (etaError) {
        console.error('[updateDriverLocation] Erro ao calcular ETA:', etaError);
      }
    }

    return Response.json({
      success: true,
      message: 'Localização atualizada com sucesso',
      eta_minutes: etaMinutes,
      location: {
        latitude,
        longitude,
        updated_at: now
      }
    });

  } catch (error) {
    console.error('[updateDriverLocation] Erro:', error);
    return Response.json({
      error: error.message || 'Erro ao atualizar localização'
    }, { status: 500 });
  }
});