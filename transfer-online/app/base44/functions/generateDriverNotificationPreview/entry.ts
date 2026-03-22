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

    const { serviceRequestId } = body;

    if (!serviceRequestId) {
      return Response.json({ error: 'serviceRequestId é obrigatório' }, { status: 400 });
    }

    let serviceRequest = null;
    let isEventTrip = false;
    let isOwnBooking = false;
    let isDirectBooking = false;

    // 1. ServiceRequest
    const serviceRequests = await base44.entities.ServiceRequest.filter({ id: serviceRequestId });
    if (serviceRequests.length > 0) {
      serviceRequest = serviceRequests[0];
    } 
    // 2. SupplierOwnBooking
    else {
      const ownBookings = await base44.entities.SupplierOwnBooking.filter({ id: serviceRequestId });
      if (ownBookings.length > 0) {
        serviceRequest = ownBookings[0];
        isOwnBooking = true;
        serviceRequest.request_number = serviceRequest.booking_number;
      }
      // 3. EventTrip
      else {
          const eventTrips = await base44.entities.EventTrip.filter({ id: serviceRequestId });
          if (eventTrips.length > 0) {
              serviceRequest = eventTrips[0];
              isEventTrip = true;
              
              if (serviceRequest.is_casual_driver) {
                  serviceRequest.driver_name = serviceRequest.casual_driver_name;
                  serviceRequest.driver_phone = serviceRequest.casual_driver_phone;
              } else if (serviceRequest.subcontractor_driver_name) {
                  serviceRequest.driver_name = serviceRequest.subcontractor_driver_name;
                  serviceRequest.driver_phone = serviceRequest.subcontractor_driver_phone;
              } else if (serviceRequest.driver_id) {
                  try {
                      const driver = await base44.entities.Driver.get(serviceRequest.driver_id);
                      serviceRequest.driver_name = driver.name;
                      serviceRequest.driver_phone = driver.phone_number;
                      serviceRequest.driver_email = driver.email;
                  } catch (err) {}
              }
              
              serviceRequest.request_number = serviceRequest.trip_code || serviceRequest.name;
              serviceRequest.time = serviceRequest.start_time;

              // Fetch passengers to get flight info
              try {
                  const passengers = await base44.entities.EventPassenger.filter({ event_trip_id: serviceRequest.id });
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
          // 4. Booking
          else {
              const bookings = await base44.entities.Booking.filter({ id: serviceRequestId });
              if (bookings.length > 0) {
                  serviceRequest = bookings[0];
                  isDirectBooking = true;
                  serviceRequest.request_number = serviceRequest.booking_number;
              }
          }
      }
    }
    
    if (!serviceRequest) {
      return Response.json({ error: `Solicitação não encontrada` }, { status: 404 });
    }

    let driverAccessToken = serviceRequest.driver_access_token;
    // Don't generate token just for preview if not exists, but calculate what URL would be
    // Actually, to be accurate, we might need it. Let's assume if it doesn't exist, we use a placeholder or create it if user confirms.
    // For preview, let's use existing or placeholder.
    const tokenForPreview = driverAccessToken || 'TOKEN_SERA_GERADO_NO_ENVIO';

    const origin = req.headers.get('origin');
    let baseUrl = Deno.env.get('BASE_URL') || origin || 'https://seu-app.base44.app';
    if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
    }
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    
    const tripUrl = `${baseUrl}/DetalhesViagemMotorista?token=${tokenForPreview}`;

    // Calendar logic
    let calendarUrl = null;
    try {
        if (serviceRequest.date) {
            const [yStr, mStr, dStr] = String(serviceRequest.date).split('T')[0].split('-');
            const [hStr, minStr] = String(serviceRequest.time || '00:00').split(':');
            
            const year = parseInt(yStr);
            const month = parseInt(mStr);
            const day = parseInt(dStr);
            const hours = parseInt(hStr) || 0;
            const minutes = parseInt(minStr) || 0;
            
            if (year && month && day) {
                const pad = (n) => n.toString().padStart(2, '0');
                const format = (y, m, d, h, min) => `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`;
                
                const startStr = format(year, month, day, hours, minutes);
                const durationMinutes = Number(serviceRequest.duration_minutes) || 120;
                const startObj = new Date(year, month - 1, day, hours, minutes);
                const endObj = new Date(startObj.getTime() + durationMinutes * 60000);
                
                const endStr = format(endObj.getFullYear(), endObj.getMonth() + 1, endObj.getDate(), endObj.getHours(), endObj.getMinutes());

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
    } catch (e) {}

    const tripData = {
      request_number: serviceRequest.request_number,
      origin: serviceRequest.origin,
      destination: serviceRequest.destination,
      date: new Date(serviceRequest.date).toLocaleDateString('pt-BR'),
      time: serviceRequest.time,
      partner_notes: serviceRequest.partner_notes,
      trip_url: tripUrl,
      origin_flight_number: serviceRequest.origin_flight_number,
      destination_flight_number: serviceRequest.destination_flight_number,
      calendarUrl
    };

    const whatsappMessage = `🚗 *Nova Viagem*
${tripData.request_number}
📅 ${tripData.date} ${tripData.time}
📍 ${tripData.origin} -> ${tripData.destination}
${tripData.origin_flight_number ? `✈️ *Voo Chegada:* ${tripData.origin_flight_number}\n` : ''}${tripData.destination_flight_number ? `✈️ *Voo Partida:* ${tripData.destination_flight_number}\n` : ''}${tripData.partner_notes ? `📝 *Obs do Gestor:* ${tripData.partner_notes}\n` : ''}
*Acesse os detalhes completos no link abaixo*
🔗 ${tripData.trip_url}

${tripData.calendarUrl ? `🗓️ Agendar: ${tripData.calendarUrl}` : ''}`;

    let phone = String(serviceRequest.driver_phone || '').replace(/\D/g, '');
    if (phone && phone.length <= 11 && !phone.startsWith('55')) phone = '55' + phone;

    return Response.json({
      whatsappMessage,
      driverPhone: phone,
      driverName: serviceRequest.driver_name,
      driverEmail: serviceRequest.driver_email
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});