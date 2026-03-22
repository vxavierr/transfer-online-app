import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { serviceRequestId } = await req.json();

    if (!serviceRequestId) {
      return Response.json({ error: 'ID da viagem é obrigatório' }, { status: 400 });
    }

    // Verificar permissões (Admin ou Fornecedor dono)
    let trip = null;
    let isSupplierOwner = false;
    let tripType = '';

    // Tentar ServiceRequest
    const serviceRequests = await base44.asServiceRole.entities.ServiceRequest.filter({ id: serviceRequestId });
    if (serviceRequests.length > 0) {
      trip = serviceRequests[0];
      tripType = 'ServiceRequest';
      if (user.supplier_id && trip.chosen_supplier_id === user.supplier_id) isSupplierOwner = true;
    } else {
      // Tentar SupplierOwnBooking
      const ownBookings = await base44.asServiceRole.entities.SupplierOwnBooking.filter({ id: serviceRequestId });
      if (ownBookings.length > 0) {
        trip = ownBookings[0];
        tripType = 'SupplierOwnBooking';
        if (user.supplier_id && trip.supplier_id === user.supplier_id) isSupplierOwner = true;
      } else {
        // Tentar Booking
        const bookings = await base44.asServiceRole.entities.Booking.filter({ id: serviceRequestId });
        if (bookings.length > 0) {
          trip = bookings[0];
          tripType = 'Booking';
          if (user.supplier_id && trip.supplier_id === user.supplier_id) isSupplierOwner = true;
        }
      }
    }

    if (!trip) {
      return Response.json({ error: 'Viagem não encontrada' }, { status: 404 });
    }

    const isAdmin = user.role === 'admin' || user.email === 'fernandotransferonline@gmail.com';

    if (!isAdmin && !isSupplierOwner) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    console.log(`[adminManualSendRating] Iniciando envio manual para ID: ${serviceRequestId} por ${user.email}`);

    // Se autorizado, chamar a função de envio
    try {
      const response = await base44.functions.invoke('generateAndSendRatingLink', {
        serviceRequestId: serviceRequestId,
        recipientEmail: null // Deixar a função buscar o email/telefone automaticamente
      });
      
      const responseData = response?.data || response;

      if (response?.status && response.status >= 400) {
         throw new Error(responseData?.error || `Erro na função remota (${response.status})`);
      }

      // Registrar no histórico da viagem
      await base44.asServiceRole.entities.TripHistory.create({
          trip_id: serviceRequestId,
          trip_type: tripType,
          event_type: 'Link de Avaliação Reenviado',
          user_id: user.id,
          user_name: user.full_name,
          comment: 'O link da pesquisa de satisfação foi reenviado manualmente.',
          details: {
              reponse_from_generateAndSendRatingLink: responseData,
              reenviado_por_funcao: 'adminManualSendRating'
          }
      });

      return Response.json(responseData);
    } catch (invokeError) {
      console.error('[adminManualSendRating] Erro ao invocar generateAndSendRatingLink:', invokeError);
      const msg = invokeError.response?.data?.error || invokeError.message || 'Erro desconhecido ao enviar';
      return Response.json({ error: `Falha no envio: ${msg}` }, { status: 500 });
    }

  } catch (error) {
    console.error('[adminManualSendRating] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});