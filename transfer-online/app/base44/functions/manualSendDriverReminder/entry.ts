import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';

export default Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Validar permissão (apenas admin ou staff autorizado)
    if (!user || (user.role !== 'admin' && !user.supplier_id)) {
       return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId, tripType, channels = ['whatsapp', 'voice_call'] } = await req.json();

    if (!tripId || !tripType) {
        return Response.json({ error: 'Missing tripId or tripType' }, { status: 400 });
    }

    // 1. Buscar a viagem
    let trip;
    let Entity;
    
    if (tripType === 'ServiceRequest') Entity = base44.asServiceRole.entities.ServiceRequest;
    else if (tripType === 'SupplierOwnBooking') Entity = base44.asServiceRole.entities.SupplierOwnBooking;
    else if (tripType === 'Booking') Entity = base44.asServiceRole.entities.Booking;
    else return Response.json({ error: 'Invalid tripType' }, { status: 400 });

    trip = await Entity.get(tripId);
    if (!trip) {
        return Response.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Se for EventTrip, buscar passageiros
    if (tripType === 'EventTrip') {
        try {
            const eventPassengers = await base44.asServiceRole.entities.EventPassenger.filter({ event_trip_id: trip.id });
            if (eventPassengers && eventPassengers.length > 0) {
                trip.passengers_details = eventPassengers.map(p => ({ name: p.passenger_name }));
            }
        } catch (e) {
            console.error(`Error fetching passengers for EventTrip ${trip.id}:`, e);
        }
    }

    // Normalizar dados para o formato do lembrete
    const display_id = trip.request_number || trip.booking_number || trip.id;
    let driverPhone = trip.driver_phone;
    let driverEmail = trip.driver_email;
    let driverName = trip.driver_name;

    // Buscar dados do motorista se faltar contato na viagem
    if ((!driverPhone || !driverEmail) && trip.driver_id) {
        try {
           const driver = await base44.asServiceRole.entities.Driver.get(trip.driver_id);
           if (driver) {
               if (!driverPhone) driverPhone = driver.phone_number;
               if (!driverEmail) driverEmail = driver.email;
               if (!driverName) driverName = driver.name;
           }
        } catch (e) {
            console.error(`Error fetching driver ${trip.driver_id}`, e);
        }
    }

    if (!driverPhone) {
        return Response.json({ error: 'Driver phone not found' }, { status: 400 });
    }

    // Garantir token de acesso
    let driverAccessToken = trip.driver_access_token;
    if (!driverAccessToken) {
        driverAccessToken = uuidv4();
        await Entity.update(trip.id, { driver_access_token: driverAccessToken });
    }

    const appBaseUrl = Deno.env.get('BASE_URL') || 'https://transferonline.base44.app';
    const tripUrl = `${appBaseUrl}/DetalhesViagemMotorista?token=${driverAccessToken}`;
    const passengersCount = trip.passengers || 1;
    const passengerName = trip.passenger_name || trip.customer_name || "Passageiro";
    
    const results = {
        whatsapp: { sent: false, error: null },
        voice_call: { sent: false, error: null }
    };

    // Configurações de API
    const instanceId = Deno.env.get("EVOLUTION_INSTANCE_NAME");
    const token = Deno.env.get("EVOLUTION_API_KEY");
    const apiUrl = Deno.env.get("EVOLUTION_API_URL");
    const clientToken = Deno.env.get("EVOLUTION_CLIENT_TOKEN");
    
    // Robust URL construction
    let baseUrl = apiUrl ? apiUrl.trim() : "";
    if (baseUrl) {
        while(baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        try {
            const urlObj = new URL(baseUrl);
            baseUrl = `${urlObj.protocol}//${urlObj.host}`;
        } catch (e) {
            baseUrl = apiUrl ? apiUrl.trim() : "";
            while(baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        }
    }

    // 2. Enviar WhatsApp
    if (channels.includes('whatsapp')) {
        if (driverPhone && instanceId && token && apiUrl) {
            let cleanPhone = driverPhone.replace(/\D/g, '');
            if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
                cleanPhone = '55' + cleanPhone;
            }

            // Construir mensagem detalhada igual ao lembrete automático
            const passengers = trip.passengers_details ? trip.passengers_details.map(p => p.name).join(', ') : (trip.passenger_name || trip.customer_name || 'Passageiro');
            
            let message = `🚗 *Lembrete de Viagem (Manual)*\n\n`;
            message += `Olá *${driverName || 'Motorista'}*, lembrete da sua viagem!\n\n`;
            message += `📅 *Data:* ${trip.date.split('-').reverse().join('/')}\n`;
            message += `⏰ *Horário:* ${trip.time}\n`;
            message += `📍 *Origem:* ${trip.origin}\n`;
            message += `🏁 *Destino:* ${trip.destination || 'A definir'}\n`;
            message += `👥 *Passageiro(s):* ${passengers}\n`;

            if (trip.flight_number || trip.origin_flight_number) {
                message += `✈️ *Voo:* ${trip.flight_number || trip.origin_flight_number}\n`;
            }

            const stops = trip.planned_stops || trip.additional_stops || [];
            if (stops && stops.length > 0) {
                message += `🛑 *Paradas:*\n`;
                stops.forEach((stop, idx) => {
                    const addr = stop.address || stop.local || 'Endereço não informado';
                    const note = stop.notes ? ` (${stop.notes})` : '';
                    message += `   ${idx + 1}. ${addr}${note}\n`;
                });
            }

            if (trip.notes) {
                message += `📝 *Obs:* ${trip.notes}\n`;
            }
            if (trip.partner_notes) {
                message += `ℹ️ *Nota Parceiro:* ${trip.partner_notes}\n`;
            }

            message += `\n🔗 *Acesse os detalhes e inicie a viagem:*\n${tripUrl}\n\nBom trabalho!`;

            try {
                const headers = { 'Content-Type': 'application/json' };
                if (clientToken) headers['Client-Token'] = clientToken;

                const zApiUrl = `${baseUrl}/instances/${instanceId}/token/${token}/send-text`;
                const response = await fetch(zApiUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ phone: cleanPhone, message: message })
                });

                if (response.ok) {
                    results.whatsapp.sent = true;
                } else {
                    results.whatsapp.error = await response.text();
                }
            } catch (err) {
                results.whatsapp.error = err.message;
            }
        } else {
            results.whatsapp.error = "Missing WhatsApp configuration or phone";
        }
    }

    // 3. Enviar Ligação (Twilio)
    if (channels.includes('voice_call')) {
        const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
        const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");

        if (twilioSid && twilioToken && twilioFrom && driverPhone) {
            try {
                let phoneToCall = driverPhone.replace(/\D/g, '');
                if (!driverPhone.includes('+') && phoneToCall.length >= 10 && phoneToCall.length <= 11) {
                    phoneToCall = '+55' + phoneToCall;
                } else if (!driverPhone.includes('+')) {
                     phoneToCall = '+' + phoneToCall; 
                } else {
                    phoneToCall = driverPhone;
                }

                const safeOrigin = (trip.origin || '').replace(/&/g, 'e').replace(/[<>]/g, '');
                const sayMessage = `Olá ${driverName || 'Motorista'}, teste de lembrete manual da TransferOnline. Sua viagem de ${safeOrigin} está agendada para as ${trip.time}. Por favor, confirme se recebeu.`;
                const twiml = `<Response><Say language="pt-BR" voice="alice">${sayMessage}</Say></Response>`;

                const body = new URLSearchParams();
                body.append('To', phoneToCall);
                body.append('From', twilioFrom);
                body.append('Twiml', twiml);

                const auth = btoa(`${twilioSid}:${twilioToken}`);
                const callRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: body
                });

                if (callRes.ok) {
                    results.voice_call.sent = true;
                } else {
                    results.voice_call.error = await callRes.text();
                }
            } catch (callErr) {
                results.voice_call.error = callErr.message;
            }
        } else {
            results.voice_call.error = "Missing Twilio configuration or phone";
        }
    }

    // Registrar Histórico
    if (results.whatsapp.sent || results.voice_call.sent) {
        await base44.asServiceRole.entities.TripHistory.create({
            trip_id: trip.id,
            trip_type: tripType,
            event_type: 'Lembrete Manual Enviado',
            user_id: user.id,
            user_name: user.full_name,
            details: results,
            comment: `Lembretes disparados manualmente pelo gestor.`
        });
    }

    return Response.json({ success: true, results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});