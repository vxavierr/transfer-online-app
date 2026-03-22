import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Removida função getBrasiliaTime - usar UTC diretamente

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    console.log('[saveBookingLead] Recebido:', JSON.stringify(body, null, 2));

    const { 
      phone, email, service_type, origin, destination, date, time, hours, driver_language,
      origin_flight_number, destination_flight_number, return_origin_flight_number, return_destination_flight_number 
    } = body;

    if (!phone || !service_type) {
      console.error('[saveBookingLead] Faltando phone ou service_type');
      return Response.json({ 
        success: false, 
        error: 'Telefone e tipo de serviço são obrigatórios' 
      }, { status: 400 });
    }

    // Criar novo lead sempre (simplificado)
    console.log('[saveBookingLead] Criando novo lead');
    let userId = null;
    try {
      const user = await base44.auth.me();
      userId = user?.id || null;
      console.log('[saveBookingLead] User ID:', userId);
    } catch (e) {
      console.log('[saveBookingLead] Usuário não logado');
    }

    const newLead = await base44.asServiceRole.entities.BookingLead.create({
      phone,
      email: email || '',
      service_type,
      origin,
      destination: destination || '',
      date: date || null,
      time: time || '',
      hours: hours || null,
      driver_language: driver_language || 'pt',
      origin_flight_number: origin_flight_number || null,
      destination_flight_number: destination_flight_number || null,
      return_origin_flight_number: return_origin_flight_number || null,
      return_destination_flight_number: return_destination_flight_number || null,
      status: 'viewed_prices',
      last_activity_at: new Date().toISOString(),
      user_id: userId,
      // Optional fields that might be passed if available
      vehicle_type_id: body.vehicle_type_id || null,
      vehicle_type_name: body.vehicle_type_name || null,
      calculated_price: body.calculated_price || null,
      distance_km: body.distance_km || null,
      duration_minutes: body.duration_minutes || null
    });
    const leadId = newLead.id;
    console.log('[saveBookingLead] Lead criado:', leadId);

    console.log('[saveBookingLead] Sucesso! Lead ID:', leadId);
    return Response.json({ 
      success: true, 
      lead_id: leadId 
    });

  } catch (error) {
    console.error('[saveBookingLead] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});