import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticar usuário
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Parse do body
    const body = await req.json();
    const {
      serviceRequestId,
      rating,
      comment,
      punctuality_rating,
      vehicle_condition_rating,
      driver_behavior_rating
    } = body;

    // Validações
    if (!serviceRequestId || !rating) {
      return Response.json({ 
        error: 'serviceRequestId e rating são obrigatórios' 
      }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return Response.json({ 
        error: 'Rating deve ser entre 1 e 5' 
      }, { status: 400 });
    }

    // Buscar a ServiceRequest
    const serviceRequests = await base44.entities.ServiceRequest.filter({ id: serviceRequestId });
    
    if (!serviceRequests || serviceRequests.length === 0) {
      return Response.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    const serviceRequest = serviceRequests[0];

    // Verificar se o usuário tem permissão para avaliar (solicitante ou passageiro)
    if (serviceRequest.user_id !== user.id && serviceRequest.passenger_user_id !== user.id) {
      return Response.json({ 
        error: 'Você não tem permissão para avaliar esta viagem' 
      }, { status: 403 });
    }

    // Verificar se a viagem foi finalizada
    if (serviceRequest.driver_trip_status !== 'finalizada') {
      return Response.json({ 
        error: 'Só é possível avaliar viagens finalizadas' 
      }, { status: 400 });
    }

    // Verificar se já foi avaliada
    if (serviceRequest.rating_submitted) {
      return Response.json({ 
        error: 'Esta viagem já foi avaliada' 
      }, { status: 400 });
    }

    // Buscar o driver_id
    const drivers = await base44.entities.Driver.filter({ phone_number: serviceRequest.driver_phone });
    let driverId = null;
    
    if (drivers && drivers.length > 0) {
      driverId = drivers[0].id;
    }

    // Criar a avaliação
    const newRating = await base44.entities.Rating.create({
      service_request_id: serviceRequestId,
      driver_id: driverId,
      rated_by_user_id: user.id,
      rating,
      comment: comment || null,
      rating_type: 'geral',
      punctuality_rating: punctuality_rating || null,
      vehicle_condition_rating: vehicle_condition_rating || null,
      driver_behavior_rating: driver_behavior_rating || null
    });

    // Atualizar a ServiceRequest
    await base44.entities.ServiceRequest.update(serviceRequestId, {
      rating_submitted: true,
      rating_id: newRating.id
    });

    // Enviar notificação ao fornecedor
    try {
      const suppliers = await base44.entities.Supplier.filter({ id: serviceRequest.chosen_supplier_id });
      const supplier = suppliers[0];

      if (supplier?.email) {
        const ratingStars = '⭐'.repeat(rating);
        
        await base44.integrations.Core.SendEmail({
          to: supplier.email,
          subject: `📊 Nova Avaliação Recebida - ${serviceRequest.request_number}`,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1f2937;">📊 Nova Avaliação Recebida</h2>
              
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Viagem:</strong> ${serviceRequest.request_number}</p>
                <p style="margin: 10px 0;"><strong>Motorista:</strong> ${serviceRequest.driver_name}</p>
                <p style="margin: 10px 0;"><strong>Avaliação:</strong> ${ratingStars} (${rating}/5)</p>
                ${comment ? `<p style="margin: 10px 0;"><strong>Comentário:</strong><br>${comment}</p>` : ''}
              </div>

              ${punctuality_rating || vehicle_condition_rating || driver_behavior_rating ? `
              <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1e40af; margin-top: 0;">Detalhes da Avaliação</h3>
                ${punctuality_rating ? `<p style="margin: 5px 0;">⏰ <strong>Pontualidade:</strong> ${'⭐'.repeat(punctuality_rating)} (${punctuality_rating}/5)</p>` : ''}
                ${vehicle_condition_rating ? `<p style="margin: 5px 0;">🚗 <strong>Estado do Veículo:</strong> ${'⭐'.repeat(vehicle_condition_rating)} (${vehicle_condition_rating}/5)</p>` : ''}
                ${driver_behavior_rating ? `<p style="margin: 5px 0;">😊 <strong>Comportamento:</strong> ${'⭐'.repeat(driver_behavior_rating)} (${driver_behavior_rating}/5)</p>` : ''}
              </div>
              ` : ''}

              <p style="color: #6b7280; font-size: 14px;">Esta avaliação ajuda a manter a qualidade do serviço.</p>
            </div>
          `
        });
      }
    } catch (emailError) {
      console.error('[submitRating] Erro ao enviar notificação:', emailError);
      // Não falhar a operação se o email falhar
    }

    return Response.json({
      success: true,
      message: 'Avaliação enviada com sucesso!',
      rating: newRating
    });

  } catch (error) {
    console.error('[submitRating] Erro:', error);
    return Response.json({
      error: error.message || 'Erro ao enviar avaliação'
    }, { status: 500 });
  }
});