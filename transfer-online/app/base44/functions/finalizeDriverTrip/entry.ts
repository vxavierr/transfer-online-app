import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ensureArray = (value) => Array.isArray(value) ? value : [];

// Função utilitária para obter horário de Brasília
function getBrasiliaTime() {
  const now = new Date();
  const brasiliaTimeString = now.toLocaleString('en-US', { 
    timeZone: 'America/Sao_Paulo' 
  });
  return new Date(brasiliaTimeString);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const { 
      serviceRequestId, 
      token,
      hasAdditionalExpenses,
      additionalExpenses
    } = body;

    console.log('[finalizeDriverTrip] Iniciando finalização:', serviceRequestId);

    if (!serviceRequestId) {
      return Response.json({ 
        error: 'serviceRequestId é obrigatório' 
      }, { status: 400 });
    }

    let serviceRequest = null;
    let isOwnBooking = false;
    let isEventTrip = false;
    let isDirectBooking = false;

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
          const directBookings = await base44.asServiceRole.entities.Booking.filter({ id: serviceRequestId });
          if (directBookings.length > 0) {
            serviceRequest = directBookings[0];
            isDirectBooking = true;
          }
        }
      }
    }
    
    if (!serviceRequest) {
      return Response.json({ 
        error: 'Solicitação não encontrada' 
      }, { status: 404 });
    }

    // Validar token
    if (!token || serviceRequest.driver_access_token !== token) {
      return Response.json({ 
        error: 'Token inválido ou ausente' 
      }, { status: 403 });
    }

    // Validar status atual
    const currentDriverStatus = isDirectBooking
      ? (serviceRequest.driver_current_status || serviceRequest.driver_trip_status)
      : serviceRequest.driver_trip_status;

    const validStatuses = ['chegou_destino', 'no_show'];
    if (!validStatuses.includes(currentDriverStatus)) {
      return Response.json({ 
        error: `Status inválido para finalização. Status atual: ${currentDriverStatus}` 
      }, { status: 400 });
    }

    // Usar horário de Brasília
    const now = getBrasiliaTime();
    const nowISO = now.toISOString();

    console.log('[finalizeDriverTrip] 🕐 Horário Brasília:', nowISO);

    const updateData = {
      driver_trip_status_updated_at: nowISO
    };

    const normalizedExpenses = ensureArray(additionalExpenses);
    const hasExpenses = hasAdditionalExpenses && normalizedExpenses.length > 0;

    // Se há despesas adicionais
    if (hasExpenses) {
      console.log('[finalizeDriverTrip] Processando despesas adicionais:', normalizedExpenses.length);
      
      // Validar despesas
      for (const expense of normalizedExpenses) {
        if (!expense.type || !['estacionamento', 'pedagio', 'hora_espera', 'outros'].includes(expense.type)) { // pedagio mantido no backend para compatibilidade com registros antigos
          return Response.json({ 
            error: 'Tipo de despesa inválido' 
          }, { status: 400 });
        }
        
        if (expense.type === 'hora_espera' && (!expense.quantity_minutes || expense.quantity_minutes < 1)) {
          return Response.json({ 
            error: 'Quantidade de minutos inválida para hora de espera' 
          }, { status: 400 });
        }
        
        if (expense.type !== 'hora_espera' && (!expense.value || expense.value <= 0)) {
          return Response.json({ 
            error: 'Valor inválido para despesa' 
          }, { status: 400 });
        }
        
        if (expense.type === 'outros' && !expense.description) {
          return Response.json({ 
            error: 'Descrição obrigatória para despesas do tipo "outros"' 
          }, { status: 400 });
        }
      }

      updateData.driver_reported_additional_expenses = normalizedExpenses;
      updateData.status = 'aguardando_revisao_fornecedor';
      updateData.driver_trip_status = 'aguardando_confirmacao_despesas';
      if (!isOwnBooking && !isEventTrip && !isDirectBooking) {
        updateData.supplier_billing_status = 'pendente_faturamento';
      }

    } else {
      // Sem despesas adicionais, finalizar direto
      console.log('[finalizeDriverTrip] Finalizando sem despesas adicionais');
      
      updateData.status = 'concluida';
      updateData.driver_trip_status = 'finalizada';
      updateData.total_additional_expenses_approved = 0;
      const finalBasePrice = Number(serviceRequest.chosen_client_price || serviceRequest.total_price || serviceRequest.price || 0);
      if (Number.isFinite(finalBasePrice)) {
        updateData.final_client_price_with_additions = finalBasePrice;
      }
      if (!isOwnBooking && !isEventTrip && !isDirectBooking) {
        updateData.supplier_billing_status = 'pendente_faturamento';
        updateData.driver_reported_additional_expenses = [];
        updateData.supplier_approved_additional_expenses = [];
      }
    }

    if (isOwnBooking) {
      await base44.asServiceRole.entities.SupplierOwnBooking.update(serviceRequestId, updateData);
    } else if (isEventTrip) {
      const eventUpdateData = {
        driver_trip_status: updateData.driver_trip_status,
        driver_trip_status_updated_at: updateData.driver_trip_status_updated_at,
        driver_reported_additional_expenses: updateData.driver_reported_additional_expenses || []
      };

      if (updateData.status === 'concluida') {
        eventUpdateData.status = 'completed';
      }

      await base44.asServiceRole.entities.EventTrip.update(serviceRequestId, eventUpdateData);
    } else if (isDirectBooking) {
      const bookingUpdateData = {
        driver_current_status: updateData.driver_trip_status,
        driver_trip_status_updated_at: updateData.driver_trip_status_updated_at,
        total_additional_expenses_approved: updateData.total_additional_expenses_approved || 0,
        ...(updateData.driver_reported_additional_expenses ? { driver_reported_additional_expenses: updateData.driver_reported_additional_expenses } : {}),
        ...(updateData.supplier_approved_additional_expenses ? { supplier_approved_additional_expenses: updateData.supplier_approved_additional_expenses } : {})
      };

      if (updateData.status === 'concluida') {
        bookingUpdateData.status = 'concluida';
      }

      await base44.asServiceRole.entities.Booking.update(serviceRequestId, bookingUpdateData);
    } else {
      await base44.asServiceRole.entities.ServiceRequest.update(serviceRequestId, updateData);
    }

    // Registrar no log
    try {
      await base44.asServiceRole.entities.TripStatusLog.create({
        service_request_id: !isOwnBooking && !isEventTrip && !isDirectBooking ? serviceRequestId : null,
        supplier_own_booking_id: isOwnBooking ? serviceRequestId : null,
        event_trip_id: isEventTrip ? serviceRequestId : null,
        booking_id: isDirectBooking ? serviceRequestId : null,
        status: updateData.driver_trip_status,
        notes: hasExpenses 
          ? `Viagem finalizada com ${normalizedExpenses.length || 0} despesas adicionais reportadas` 
          : 'Viagem finalizada sem despesas adicionais',
        timestamp: nowISO
      });
    } catch (logError) {
      console.error('[finalizeDriverTrip] Erro ao registrar log:', logError);
    }

    // Expirar link da timeline
    try {
      const filter = { status: 'active' };
      if (isOwnBooking) filter.supplier_own_booking_id = serviceRequestId;
      else if (isEventTrip) filter.event_trip_id = serviceRequestId;
      else filter.service_request_id = serviceRequestId;

      const activeTimelines = await base44.asServiceRole.entities.SharedTripTimeline.filter(filter);

      for (const timeline of activeTimelines) {
        // Define expiração para 10 minutos no futuro (tolerância)
        const expirationDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        await base44.asServiceRole.entities.SharedTripTimeline.update(timeline.id, {
          expires_at: expirationDate
          // Mantém status='active' por enquanto
        });
      }
    } catch (timelineError) {
      console.error('[finalizeDriverTrip] Erro ao expirar timeline:', timelineError);
    }

    // Enviar link de avaliação automaticamente se houver pelo menos um contato válido
    if (updateData.driver_trip_status === 'finalizada' || updateData.driver_trip_status === 'aguardando_confirmacao_despesas') {
      try {
        console.log('[finalizeDriverTrip] Gerando link de avaliação com destinatários definidos por template.');
        await base44.asServiceRole.functions.invoke('generateAndSendRatingLink', {
          serviceRequestId: serviceRequestId,
          language: serviceRequest.driver_language || 'pt'
        });
      } catch (ratingError) {
        console.error('[finalizeDriverTrip] Erro ao enviar link de avaliação:', ratingError);
        // Não falha a requisição principal se o envio do email falhar
      }
    }

    return Response.json({
      success: true,
      message: hasExpenses 
        ? 'Viagem finalizada. Aguardando revisão do fornecedor.' 
        : 'Viagem finalizada com sucesso!',
      requires_supplier_review: hasExpenses,
      newStatus: updateData.driver_trip_status,
      serviceStatus: updateData.status || serviceRequest.status,
      brasilia_time: nowISO
    });

  } catch (error) {
    console.error('[finalizeDriverTrip] Erro:', error);
    return Response.json({
      error: error.message || 'Erro ao finalizar viagem'
    }, { status: 500 });
  }
});