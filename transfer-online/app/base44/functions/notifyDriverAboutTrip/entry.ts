import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// v7 - Added Booking support
Deno.serve(async (req) => {
  try {
    console.log('[notifyDriverAboutTrip] v7 START');
    
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
    const entities = base44.asServiceRole.entities;

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    console.log('[notifyDriverAboutTrip] Body:', JSON.stringify(body));

    const { serviceRequestId, notificationType = 'both', forceEmail = null } = body;

    if (!serviceRequestId) {
      return Response.json({ error: 'serviceRequestId é obrigatório' }, { status: 400 });
    }

    let serviceRequest = null;
    let isOwnBooking = false;
    let isEventTrip = false;
    let isDirectBooking = false;

    // 1. ServiceRequest
    const serviceRequests = await entities.ServiceRequest.filter({ id: serviceRequestId });
    if (serviceRequests.length > 0) {
      serviceRequest = serviceRequests[0];
    } 
    // 2. SupplierOwnBooking
    else {
      const ownBookings = await entities.SupplierOwnBooking.filter({ id: serviceRequestId });
      if (ownBookings.length > 0) {
        serviceRequest = ownBookings[0];
        isOwnBooking = true;
        serviceRequest.request_number = serviceRequest.booking_number;
      }
      // 3. EventTrip
      else {
          const eventTrips = await entities.EventTrip.filter({ id: serviceRequestId });
          if (eventTrips.length > 0) {
              serviceRequest = eventTrips[0];
              isEventTrip = true;
              
              if (serviceRequest.is_casual_driver) {
                  serviceRequest.driver_name = serviceRequest.casual_driver_name;
                  serviceRequest.driver_phone = serviceRequest.casual_driver_phone;
                  // casual driver usually doesn't have email stored in trip, maybe we can assume none or add it if schema changes
              } else if (serviceRequest.subcontractor_driver_name) {
                  serviceRequest.driver_name = serviceRequest.subcontractor_driver_name;
                  serviceRequest.driver_phone = serviceRequest.subcontractor_driver_phone;
              } else if (serviceRequest.driver_id) {
                  try {
                      const driver = await entities.Driver.get(serviceRequest.driver_id);
                      serviceRequest.driver_name = driver.name;
                      serviceRequest.driver_phone = driver.phone_number;
                      serviceRequest.driver_email = driver.email;
                  } catch (err) {}
              }
              
              serviceRequest.request_number = serviceRequest.trip_code || serviceRequest.name;
              serviceRequest.passenger_name = serviceRequest.name || "Grupo do Evento";
              serviceRequest.passengers = serviceRequest.passenger_count;
              serviceRequest.time = serviceRequest.start_time;

              // Fetch passengers to get flight info
              try {
                  const passengers = await entities.EventPassenger.filter({ event_trip_id: serviceRequest.id });
                  if (passengers.length > 0) {
                      const flightNumbers = [...new Set(passengers
                          .filter(p => p.flight_number)
                          .map(p => (p.airline ? `${p.airline} ` : '') + p.flight_number)
                      )];
                      
                      if (flightNumbers.length > 0) {
                          const flightsStr = flightNumbers.join(', ');
                          if (serviceRequest.trip_type === 'departure') {
                              serviceRequest.destination_flight_number = flightsStr;
                          } else {
                              // arrival or others -> origin_flight_number (arrival flight)
                              serviceRequest.origin_flight_number = flightsStr;
                          }
                      }
                  }
              } catch (err) {
                  console.error('Error fetching passengers for flight info:', err);
              }
          }
          // 4. Booking (Direct Booking) - NEW
          else {
              const bookings = await entities.Booking.filter({ id: serviceRequestId });
              if (bookings.length > 0) {
                  serviceRequest = bookings[0];
                  isDirectBooking = true;
                  serviceRequest.request_number = serviceRequest.booking_number;
                  serviceRequest.passenger_name = serviceRequest.customer_name;
                  serviceRequest.passenger_phone = serviceRequest.customer_phone;
                  serviceRequest.passengers = serviceRequest.passengers;
                  serviceRequest.chosen_supplier_id = serviceRequest.supplier_id;
              }
          }
      }
    }
    
    if (!serviceRequest) {
      console.error(`[notifyDriverAboutTrip] Not Found: ${serviceRequestId}`);
      return Response.json({ error: `Solicitação não encontrada para ID: ${serviceRequestId}` }, { status: 404 });
    }

    // If it's a casual driver with an ID, fetch the latest data
    if (serviceRequest.event_casual_driver_id && isEventTrip) {
        try {
            const casualDriver = await entities.EventCasualDriver.get(serviceRequest.event_casual_driver_id);
            if (casualDriver) {
                serviceRequest.driver_name = casualDriver.name;
                serviceRequest.driver_phone = casualDriver.phone;
                serviceRequest.driver_email = casualDriver.email || serviceRequest.driver_email; // Fallback to trip email if empty
            }
        } catch (e) {
            console.warn('Error fetching casual driver details:', e);
        }
    }

    if (!serviceRequest.driver_name || !serviceRequest.driver_phone) {
      return Response.json({ error: 'Dados do motorista incompletos' }, { status: 400 });
    }

    let driverAccessToken = serviceRequest.driver_access_token;
    if (!driverAccessToken) {
      driverAccessToken = crypto.randomUUID();
      const updateData = {
          driver_access_token: driverAccessToken,
          driver_notification_sent_at: new Date().toISOString()
      };
      if (isEventTrip) await entities.EventTrip.update(serviceRequestId, updateData);
      else if (isOwnBooking) await entities.SupplierOwnBooking.update(serviceRequestId, updateData);
      else if (isDirectBooking) await entities.Booking.update(serviceRequestId, updateData);
      else await entities.ServiceRequest.update(serviceRequestId, updateData);
    }

    const origin = req.headers.get('origin');
    let baseUrl = Deno.env.get('BASE_URL') || origin || 'https://seu-app.base44.app';
    if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
    }
    // Remove trailing slash if exists
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    
    const tripUrl = `${baseUrl}/DetalhesViagemMotorista?token=${driverAccessToken}`;

    let calendarUrl = null;
    try {
        if (serviceRequest.date) {
            // Safely parse parts to avoid timezone issues with Date constructor on strings
            // Assume dateStr is YYYY-MM-DD
            const [yStr, mStr, dStr] = String(serviceRequest.date).split('T')[0].split('-');
            const [hStr, minStr] = String(serviceRequest.time || '00:00').split(':');
            
            const year = parseInt(yStr);
            const month = parseInt(mStr);
            const day = parseInt(dStr);
            const hours = parseInt(hStr) || 0;
            const minutes = parseInt(minStr) || 0;
            
            if (year && month && day) {
                // Construct "YYYYMMDDTHHMMSS" manually to ensure floating time (no Z)
                const pad = (n) => n.toString().padStart(2, '0');
                const format = (y, m, d, h, min) => `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`;
                
                const startStr = format(year, month, day, hours, minutes);
                
                // Calculate end time
                const durationMinutes = Number(serviceRequest.duration_minutes) || 120;
                // Use Date object for arithmetic
                const startObj = new Date(year, month - 1, day, hours, minutes);
                const endObj = new Date(startObj.getTime() + durationMinutes * 60000);
                
                const endStr = format(
                    endObj.getFullYear(),
                    endObj.getMonth() + 1,
                    endObj.getDate(),
                    endObj.getHours(),
                    endObj.getMinutes()
                );

                const title = `🚗 Viagem ${serviceRequest.request_number}`;
                const notesStr = serviceRequest.partner_notes || serviceRequest.notes || '';
                const details = `Passageiro: ${serviceRequest.passenger_name || 'Passageiro'}\nObs: ${notesStr}\nLink: ${tripUrl}`;
                const location = `${serviceRequest.origin} -> ${serviceRequest.destination}`;
                
                const params = new URLSearchParams({
                    action: 'TEMPLATE',
                    text: title,
                    details: details,
                    location: location,
                    dates: `${startStr}/${endStr}`
                });
                
                calendarUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
            }
        }
    } catch (e) {
        console.warn('Failed to generate calendar link locally', e);
    }

    let supplierName = 'Fornecedor';
    const supplierId = serviceRequest.chosen_supplier_id || serviceRequest.supplier_id;
    if (supplierId) {
        try {
            const suppliers = await entities.Supplier.filter({ id: supplierId });
            if (suppliers.length > 0) supplierName = suppliers[0].name;
        } catch(e) {}
    }

    const tripData = {
      request_number: serviceRequest.request_number,
      origin: serviceRequest.origin,
      destination: serviceRequest.destination,
      date: new Date(serviceRequest.date).toLocaleDateString('pt-BR'),
      time: serviceRequest.time,
      passenger_name: serviceRequest.passenger_name,
      passenger_phone: serviceRequest.passenger_phone || serviceRequest.customer_phone,
      passengers: serviceRequest.passengers,
      notes: serviceRequest.notes || 'Nenhuma observação',
      partner_notes: serviceRequest.partner_notes,
      supplier_name: supplierName,
      trip_url: tripUrl,
      is_receptive_needed: serviceRequest.is_receptive_needed,
      receptive_performed_by: serviceRequest.receptive_performed_by,
      receptive_notes: serviceRequest.receptive_notes,
      origin_flight_number: serviceRequest.origin_flight_number,
      destination_flight_number: serviceRequest.destination_flight_number,
      additional_stops: serviceRequest.additional_stops,
      calendarUrl
    };

    let emailSent = false;
    let whatsappSent = false;
    let emailError = null;
    let whatsappError = null;

    const emailTo = forceEmail || serviceRequest.driver_email;

    if ((notificationType === 'email' || notificationType === 'both') && emailTo) {
      try {
        await base44.integrations.Core.SendEmail({
          to: emailTo,
          subject: `🚗 Nova Viagem - ${tripData.request_number}`,
          body: `Nova viagem: ${tripData.origin} -> ${tripData.destination}. <a href="${tripData.trip_url}">Ver Detalhes</a>${tripData.calendarUrl ? ` | <a href="${tripData.calendarUrl}">🗓️ Adicionar ao Google Calendar</a>` : ''}`
        });
        emailSent = true;
      } catch (e) { emailError = e.message; }
    }

    if (notificationType === 'whatsapp' || notificationType === 'both') {
      try {
        const apiUrl = Deno.env.get('EVOLUTION_API_URL');
        const token = Deno.env.get('EVOLUTION_API_KEY');
        const instanceId = Deno.env.get('EVOLUTION_INSTANCE_NAME');
        
        if (apiUrl && token && instanceId) {
            let baseUrl = apiUrl.trim();
            while(baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
            try { const u = new URL(baseUrl); baseUrl = `${u.protocol}//${u.host}`; } catch(e){}

            let stopsText = '';
            if (tripData.additional_stops && Array.isArray(tripData.additional_stops) && tripData.additional_stops.length > 0) {
                stopsText = '\n🛑 *PARADAS:*\n';
                tripData.additional_stops.forEach((stop, idx) => {
                    const addr = stop.address || 'Endereço não informado';
                    const note = stop.notes ? ` (${stop.notes})` : '';
                    stopsText += `${idx + 1}. ${addr}${note}\n`;
                });
            }

            const whatsappMessage = `🚗 *Nova Viagem*
${tripData.request_number}
📅 ${tripData.date} ${tripData.time}
📍 ${tripData.origin} -> ${tripData.destination}${stopsText}
${tripData.origin_flight_number ? `✈️ *Voo Chegada:* ${tripData.origin_flight_number}\n` : ''}${tripData.destination_flight_number ? `✈️ *Voo Partida:* ${tripData.destination_flight_number}\n` : ''}${tripData.partner_notes ? `📝 *Obs do Gestor:* ${tripData.partner_notes}\n` : ''}
*Acesse os detalhes completos no link abaixo*
🔗 ${tripData.trip_url}

${tripData.calendarUrl ? `🗓️ Agendar: ${tripData.calendarUrl}` : ''}`;

            let phone = String(serviceRequest.driver_phone).replace(/\D/g, '');
            if (phone.length <= 11 && !phone.startsWith('55')) phone = '55' + phone;

            await fetch(`${baseUrl}/instances/${instanceId}/token/${token}/send-text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Client-Token': Deno.env.get('EVOLUTION_CLIENT_TOKEN') || '' },
                body: JSON.stringify({ phone, message: whatsappMessage })
            });
            whatsappSent = true;
        }
      } catch (e) { whatsappError = e.message; }
    }

    return Response.json({
      success: emailSent || whatsappSent,
      emailSent,
      whatsappSent,
      emailError,
      whatsappError,
      tripUrl
    });

  } catch (error) {
    console.error('[notifyDriverAboutTrip] Fatal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});