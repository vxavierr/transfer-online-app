import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { tripId, tripType } = body;

    if (!tripId) {
      return Response.json({ error: 'tripId é obrigatório' }, { status: 400 });
    }

    let trip = null;
    let passengerPhone = '';
    let passengerName = '';

    if (tripType === 'own') {
      trip = await base44.entities.SupplierOwnBooking.get(tripId);
      passengerPhone = trip.passenger_phone;
      passengerName = trip.passenger_name;
    } else if (tripType === 'direct_booking') {
      trip = await base44.entities.Booking.get(tripId);
      passengerPhone = trip.customer_phone;
      passengerName = trip.customer_name;
    } else if (tripType === 'platform') {
      trip = await base44.entities.ServiceRequest.get(tripId);
      passengerPhone = trip.passenger_phone || trip.requester_phone;
      passengerName = trip.passenger_name || trip.requester_full_name;
    }

    if (!trip) {
      return Response.json({ error: 'Viagem não encontrada' }, { status: 404 });
    }

    if (!passengerPhone) {
      return Response.json({ error: 'Telefone do passageiro não encontrado' }, { status: 400 });
    }

    // Obter credenciais da Z-API
    const apiUrl = Deno.env.get('EVOLUTION_API_URL');
    const token = Deno.env.get('EVOLUTION_API_KEY');
    const instanceId = Deno.env.get('EVOLUTION_INSTANCE_NAME');

    if (!apiUrl || !token || !instanceId) {
      return Response.json({ error: 'Configuração do WhatsApp incompleta' }, { status: 500 });
    }

    // Formatar mensagem
    const formatPrice = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    const formatDate = (dateStr) => {
        if(!dateStr) return '';
        try {
            const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
            const [y, m, d] = cleanDate.split('-');
            return `${d}/${m}/${y}`;
        } catch { return dateStr; }
    };

    const message = `🚗 *DETALHES DA SUA VIAGEM*

Olá, *${passengerName}*!
Aqui estão os detalhes do seu agendamento:

📅 *Data:* ${formatDate(trip.date)}
⏰ *Horário:* ${trip.time}
📍 *Origem:* ${trip.origin}
🏁 *Destino:* ${trip.destination}
${trip.vehicle_model ? `🚘 *Veículo:* ${trip.vehicle_model} (${trip.vehicle_plate || ''})` : ''}
${trip.driver_name ? `👤 *Motorista:* ${trip.driver_name}` : ''}
${trip.driver_phone ? `📞 *Tel. Motorista:* ${trip.driver_phone}` : ''}

Qualquer dúvida, estamos à disposição!`;

    // Enviar
    let phone = String(passengerPhone).replace(/\D/g, '');
    if (phone.length <= 11 && !phone.startsWith('55')) phone = '55' + phone;

    let baseUrl = apiUrl.trim();
    while(baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;
    try { const u = new URL(baseUrl); baseUrl = `${u.protocol}//${u.host}`; } catch(e){ console.warn('URL parsing error:', e); }

    const zApiUrl = `${baseUrl}/instances/${instanceId}/token/${token}/send-text`;
    
    console.log('[sendTripInfoToPassenger] Sending to:', zApiUrl);

    const response = await fetch(zApiUrl, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json',
          'Client-Token': Deno.env.get('EVOLUTION_CLIENT_TOKEN') || ''
      },
      body: JSON.stringify({ phone, message })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('[sendTripInfoToPassenger] API Error:', response.status, errText);
        return Response.json({ error: `Erro na API de WhatsApp: ${response.status} - ${errText}` }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Mensagem enviada com sucesso!' });

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});