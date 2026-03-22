import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { serviceRequestId, language } = await req.json();

    if (!serviceRequestId) {
      return Response.json({ error: 'serviceRequestId é obrigatório' }, { status: 400 });
    }

    console.log(`[generateAndSendRatingLink] Iniciando para ID: ${serviceRequestId}`);

    // 1. Buscar a Viagem (Polimórfico)
    let request = null;
    let tripType = null;

    const serviceRequests = await base44.asServiceRole.entities.ServiceRequest.filter({ id: serviceRequestId });
    if (serviceRequests && serviceRequests.length > 0) {
      request = serviceRequests[0];
      tripType = 'service_request';
    } else {
      const ownBookings = await base44.asServiceRole.entities.SupplierOwnBooking.filter({ id: serviceRequestId });
      if (ownBookings && ownBookings.length > 0) {
        request = ownBookings[0];
        tripType = 'supplier_own_booking';
      } else {
        const bookings = await base44.asServiceRole.entities.Booking.filter({ id: serviceRequestId });
        if (bookings && bookings.length > 0) {
          request = bookings[0];
          tripType = 'booking';
        }
      }
    }

    if (!request) {
      return Response.json({ error: 'Viagem não encontrada' }, { status: 404 });
    }

    const getPassengerField = (fieldName) => {
      if (!Array.isArray(request.passengers_details)) return null;
      const leadPassenger = request.passengers_details.find(passenger => passenger?.is_lead_passenger && passenger?.[fieldName]);
      if (leadPassenger) return leadPassenger[fieldName];
      return request.passengers_details.find(passenger => passenger?.[fieldName])?.[fieldName] || null;
    };

    // Normalizar dados de contato do passageiro sem promover o solicitante para passageiro
    let passengerEmail = null;
    let passengerPhone = null;
    let passengerName = null;
    let driverLanguage = ['pt', 'en', 'es'].includes(language) ? language : (request.driver_language || 'pt');
    let tripNumber = null;

    if (tripType === 'service_request') {
      passengerEmail = request.passenger_email || getPassengerField('email') || null;
      passengerPhone = request.passenger_phone || getPassengerField('phone_number') || null;
      passengerName = request.passenger_name || getPassengerField('name') || null;
      tripNumber = request.request_number;
    } else if (tripType === 'supplier_own_booking') {
      passengerEmail = request.passenger_email || getPassengerField('email') || null;
      passengerPhone = request.passenger_phone || getPassengerField('phone_number') || null;
      passengerName = request.passenger_name || getPassengerField('name') || null;
      tripNumber = request.booking_number;
    } else if (tripType === 'booking') {
      passengerEmail = request.customer_email || null;
      passengerPhone = request.customer_phone || null;
      passengerName = request.customer_name || null;
      tripNumber = request.booking_number;
    }

    // 2. Gerar ou Reutilizar Token (Com verificação de race condition)
    let freshRequest = request;
    try {
      if (tripType === 'service_request') {
        const fresh = await base44.asServiceRole.entities.ServiceRequest.get(request.id);
        if (fresh) freshRequest = fresh;
      } else if (tripType === 'supplier_own_booking') {
        const fresh = await base44.asServiceRole.entities.SupplierOwnBooking.get(request.id);
        if (fresh) freshRequest = fresh;
      } else if (tripType === 'booking') {
        const fresh = await base44.asServiceRole.entities.Booking.get(request.id);
        if (fresh) freshRequest = fresh;
      }
    } catch (e) {
      console.warn('Erro ao recarregar entidade para verificação de token:', e);
    }

    let token = freshRequest.rating_link_token;
    let expiresAt = freshRequest.rating_link_expires_at ? new Date(freshRequest.rating_link_expires_at) : null;
    const now = new Date();

    if (!token || !expiresAt || expiresAt < now) {
      token = crypto.randomUUID();
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const updateData = {
        rating_link_token: token,
        rating_link_expires_at: expiresAt.toISOString()
      };

      if (tripType === 'service_request') {
        await base44.asServiceRole.entities.ServiceRequest.update(serviceRequestId, updateData);
      } else if (tripType === 'supplier_own_booking') {
        await base44.asServiceRole.entities.SupplierOwnBooking.update(serviceRequestId, updateData);
      } else if (tripType === 'booking') {
        await base44.asServiceRole.entities.Booking.update(serviceRequestId, updateData);
      }

      // Verificação de persistência com Retry
      let verified = null;
      let attempts = 0;
      let persisted = false;

      while (attempts < 3 && !persisted) {
        await new Promise(r => setTimeout(r, 500));
        
        try {
          if (tripType === 'service_request') {
            verified = await base44.asServiceRole.entities.ServiceRequest.get(serviceRequestId);
          } else if (tripType === 'supplier_own_booking') {
            verified = await base44.asServiceRole.entities.SupplierOwnBooking.get(serviceRequestId);
          } else if (tripType === 'booking') {
            verified = await base44.asServiceRole.entities.Booking.get(serviceRequestId);
          }

          if (verified && verified.rating_link_token === token) {
            persisted = true;
            console.log(`[generateAndSendRatingLink] Token persistido com sucesso (Tentativa ${attempts + 1})`);
          } else {
            console.warn(`[generateAndSendRatingLink] Token não persistido na tentativa ${attempts + 1}. Retentando...`);
            if (attempts === 1) {
              if (tripType === 'service_request') {
                await base44.asServiceRole.entities.ServiceRequest.update(serviceRequestId, updateData);
              } else if (tripType === 'supplier_own_booking') {
                await base44.asServiceRole.entities.SupplierOwnBooking.update(serviceRequestId, updateData);
              } else if (tripType === 'booking') {
                await base44.asServiceRole.entities.Booking.update(serviceRequestId, updateData);
              }
            }
          }
        } catch (e) {
          console.error(`[generateAndSendRatingLink] Erro na verificação de persistência:`, e);
        }
        attempts++;
      }

      if (!persisted) {
        console.error(`[generateAndSendRatingLink] ERRO CRÍTICO: Falha ao persistir token`);
      }
    } else {
      console.log(`[generateAndSendRatingLink] Reutilizando token existente`);
    }

    // 3. Criar Link
    const baseUrl = Deno.env.get('BASE_URL');
    const appUrl = baseUrl ? baseUrl.replace(/\/$/, '') : (req.headers.get('origin') || 'https://app.transferonline.com.br');
    const ratingLink = `${appUrl}/AvaliarViagem?token=${token}`;

    // Verificação FINAL de persistência antes do envio
    let isTokenPersisted = false;
    try {
      let finalCheck = null;
      if (tripType === 'service_request') finalCheck = await base44.asServiceRole.entities.ServiceRequest.get(serviceRequestId);
      else if (tripType === 'supplier_own_booking') finalCheck = await base44.asServiceRole.entities.SupplierOwnBooking.get(serviceRequestId);
      else if (tripType === 'booking') finalCheck = await base44.asServiceRole.entities.Booking.get(serviceRequestId);

      if (finalCheck && finalCheck.rating_link_token === token) {
        isTokenPersisted = true;
      }
    } catch (e) {
      console.error('[generateAndSendRatingLink] Erro na verificação final:', e);
    }

    if (!isTokenPersisted) {
      throw new Error('Falha crítica: Token não foi persistido no banco de dados. Abortando envio para evitar link inválido.');
    }

    // 4. Enviar pesquisa usando a rotina central de templates e permissões
    const normalizedTrip = {
      ...request,
      passenger_name: passengerName,
      passenger_email: passengerEmail,
      passenger_phone: passengerPhone,
      request_number: tripNumber,
      driver_language: driverLanguage
    };

    console.log('[generateAndSendRatingLink] Destinatários normalizados:', {
      tripId: serviceRequestId,
      passenger_email: normalizedTrip.passenger_email || null,
      passenger_phone: normalizedTrip.passenger_phone || null,
      requester_email: normalizedTrip.requester_email || null,
      requester_phone: normalizedTrip.requester_phone || null
    });

    const notificationResponse = await base44.asServiceRole.functions.invoke('sendTripStatusNotification', {
      trip: normalizedTrip,
      newStatus: 'solicitar_avaliacao',
      ratingLink
    });

    const notificationData = notificationResponse?.data || notificationResponse || {};
    const results = Array.isArray(notificationData.results) ? notificationData.results : [];

    let emailSent = results.some(result => result.type === 'email' && result.status === 'sent');
    let whatsappSent = results.some(result => result.type === 'whatsapp' && result.status === 'sent');
    let emailError = results.filter(result => result.type === 'email' && result.status === 'error').map(result => result.error).join(' | ') || null;
    let whatsappError = results.filter(result => result.type === 'whatsapp' && result.status === 'error').map(result => result.error).join(' | ') || null;

    if (!results.length) {
      throw new Error('Nenhum destinatário elegível para a pesquisa conforme os templates configurados.');
    }

    // Log de Auditoria do Token
    try {
      const logData = {
        status: 'rating_link_generated',
        timestamp: new Date().toISOString(),
        notes: `Rating Token Generated: ${token}`
      };

      if (tripType === 'service_request') logData.service_request_id = serviceRequestId;
      else if (tripType === 'supplier_own_booking') logData.supplier_own_booking_id = serviceRequestId;
      else if (tripType === 'booking') logData.booking_id = serviceRequestId;

      await base44.asServiceRole.entities.TripStatusLog.create(logData);
      console.log(`[generateAndSendRatingLink] Log de auditoria criado para token ${token}`);
    } catch (logError) {
      console.warn('[generateAndSendRatingLink] Falha ao criar log de auditoria do token:', logError);
    }

    const success = emailSent || whatsappSent;
    let finalMessage = 'Link enviado com sucesso!';
    
    if (whatsappSent && !emailSent && emailError) {
      finalMessage = 'Enviado via WhatsApp (E-mail falhou)';
    } else if (!whatsappSent && emailSent) {
      finalMessage = 'Enviado via E-mail (WhatsApp não enviado)';
    } else if (!success) {
      finalMessage = 'Falha ao enviar por E-mail e WhatsApp';
      if (emailError) throw new Error(`Falha no envio: E-mail (${emailError}) | WhatsApp (${whatsappError})`);
      throw new Error('Falha no envio: Nenhum canal disponível ou erro desconhecido');
    }

    return Response.json({ 
      success: true, 
      message: finalMessage,
      whatsapp_sent: whatsappSent,
      email_sent: emailSent,
      email_error: emailError,
      whatsapp_error: whatsappError
    });

  } catch (error) {
    console.error('Erro ao gerar link de avaliação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});