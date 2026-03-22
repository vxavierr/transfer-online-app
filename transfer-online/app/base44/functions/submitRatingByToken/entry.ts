import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let { 
      token, 
      rating, 
      comment, 
      submitted_by_name, 
      submitted_by_email,
      punctuality,
      vehicle_condition,
      driver_behavior
    } = await req.json();

    if (!token || !rating) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }
    
    token = token.trim().replace(/[^a-f0-9-]/gi, '');

    // 1. Validar token e encontrar viagem (Polimórfico) - Busca Paralela
    const [serviceRequests, ownBookings, bookings] = await Promise.all([
      base44.asServiceRole.entities.ServiceRequest.filter({ rating_link_token: token }),
      base44.asServiceRole.entities.SupplierOwnBooking.filter({ rating_link_token: token }),
      base44.asServiceRole.entities.Booking.filter({ rating_link_token: token })
    ]);

    let request = null;
    let tripType = null;
    let tokenAuditLog = null;

    if (serviceRequests && serviceRequests.length > 0) {
      request = serviceRequests[0];
      tripType = 'service_request';
    } else if (ownBookings && ownBookings.length > 0) {
      request = ownBookings[0];
      tripType = 'supplier_own_booking';
    } else if (bookings && bookings.length > 0) {
      request = bookings[0];
      tripType = 'booking';
    }

    if (!request) {
      try {
        const logs = await base44.asServiceRole.entities.TripStatusLog.filter({
          status: 'rating_link_generated'
        }, '-timestamp', 50);

        const matchLog = logs.find((log) => log.notes && log.notes.includes(token));
        if (matchLog) {
          tokenAuditLog = matchLog;
          const tripId = matchLog.service_request_id || matchLog.supplier_own_booking_id || matchLog.booking_id;

          if (matchLog.service_request_id) {
            request = await base44.asServiceRole.entities.ServiceRequest.get(tripId);
            tripType = 'service_request';
          } else if (matchLog.supplier_own_booking_id) {
            request = await base44.asServiceRole.entities.SupplierOwnBooking.get(tripId);
            tripType = 'supplier_own_booking';
          } else if (matchLog.booking_id) {
            request = await base44.asServiceRole.entities.Booking.get(tripId);
            tripType = 'booking';
          }
        }
      } catch (fallbackError) {
        console.error('[submitRatingByToken] Erro no fallback de log:', fallbackError);
      }
    }

    if (!request) {
      return Response.json({ error: 'Link inválido' }, { status: 404 });
    }

    let expiresAt = request.rating_link_expires_at ? new Date(request.rating_link_expires_at) : null;
    if (!expiresAt && tokenAuditLog?.timestamp) {
      expiresAt = new Date(new Date(tokenAuditLog.timestamp).getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
      return Response.json({ error: 'Link expirado' }, { status: 410 });
    }
    
    if (request.rating_submitted) {
      return Response.json({ error: 'Viagem já avaliada' }, { status: 409 });
    }

    // 2. Obter Driver ID
    const driverId = await getDriverId(base44, request);

    // 3. Preparar objeto Rating
    const ratingData = {
      driver_id: driverId,
      rating: parseInt(rating),
      comment: comment,
      rating_type: 'geral',
      punctuality_rating: parseInt(punctuality || rating),
      vehicle_condition_rating: parseInt(vehicle_condition || rating),
      driver_behavior_rating: parseInt(driver_behavior || rating),
      submitted_by_name: submitted_by_name,
      submitted_by_email: submitted_by_email,
      is_anonymous_link: true,
      rated_by_user_id: null
    };

    // Vincular ao ID correto baseado no tipo
    if (tripType === 'service_request') {
      ratingData.service_request_id = request.id;
    } else if (tripType === 'supplier_own_booking') {
      ratingData.supplier_own_booking_id = request.id;
    } else if (tripType === 'booking') {
      ratingData.booking_id = request.id;
    }

    // Criar avaliação
    const newRating = await base44.asServiceRole.entities.Rating.create(ratingData);

    // 4. Atualizar Entidade Original
    const updateData = {
      rating_submitted: true,
      rating_id: newRating.id
    };

    if (tripType === 'service_request') {
      await base44.asServiceRole.entities.ServiceRequest.update(request.id, updateData);
    } else if (tripType === 'supplier_own_booking') {
      await base44.asServiceRole.entities.SupplierOwnBooking.update(request.id, updateData);
    } else if (tripType === 'booking') {
      await base44.asServiceRole.entities.Booking.update(request.id, updateData);
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('Erro ao enviar avaliação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function getDriverId(base44, request) {
  if (request.driver_id) return request.driver_id;

  if (request.driver_phone) {
    try {
      const drivers = await base44.asServiceRole.entities.Driver.filter({
        phone_number: request.driver_phone
      });
      if (drivers.length > 0) return drivers[0].id;
    } catch (e) {
      console.log("Erro ao buscar driver_id por telefone", e);
    }
  }
  return null;
}