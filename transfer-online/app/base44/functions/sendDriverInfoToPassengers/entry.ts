import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { format } from 'npm:date-fns';

// v7 - Force update for WhatsApp message template
Deno.serve(async (req) => {
  try {
    console.log('[sendDriverInfoToPassengers] v7 START');
    
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

    const body = await req.json();
    const { serviceRequestId, notificationType = 'both' } = body;

    if (!serviceRequestId) return Response.json({ error: 'ID obrigatório' }, { status: 400 });

    let serviceRequest = null;
    let isOwnBooking = false;
    let isEventTrip = false;
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
        serviceRequest.chosen_supplier_id = serviceRequest.supplier_id;
      }
      // 3. EventTrip
      else {
          const eventTrips = await base44.entities.EventTrip.filter({ id: serviceRequestId });
          if (eventTrips.length > 0) {
              serviceRequest = eventTrips[0];
              isEventTrip = true;
              
              // Fetch Driver Info
              if (serviceRequest.driver_id) {
                  try {
                      const driver = await base44.entities.Driver.get(serviceRequest.driver_id);
                      serviceRequest.driver_name = driver.name;
                      serviceRequest.driver_phone = driver.phone_number;
                      serviceRequest.driver_photo_url = driver.photo_url;
                      
                      // Fetch Vehicle Info
                      if (serviceRequest.vehicle_id) {
                          const vehicle = await base44.entities.DriverVehicle.get(serviceRequest.vehicle_id);
                          serviceRequest.vehicle_model = vehicle.vehicle_model;
                          serviceRequest.vehicle_plate = vehicle.vehicle_plate;
                          serviceRequest.vehicle_color = vehicle.vehicle_color;
                      } else {
                          // Fallback to searching driver vehicle
                          const vehicles = await base44.entities.DriverVehicle.filter({ driver_id: driver.id });
                          if (vehicles.length > 0) {
                              serviceRequest.vehicle_model = vehicles[0].vehicle_model;
                              serviceRequest.vehicle_plate = vehicles[0].vehicle_plate;
                              serviceRequest.vehicle_color = vehicles[0].vehicle_color;
                          }
                      }
                  } catch (e) { console.warn("Driver/Vehicle fetch error", e); }
              }
              
              serviceRequest.request_number = serviceRequest.trip_code || serviceRequest.name;
              serviceRequest.passenger_name = serviceRequest.name || "Grupo do Evento";
              // Try to find ONE passenger to send to
              const passengers = await base44.entities.EventPassenger.filter({ event_trip_id: serviceRequestId });
              if (passengers.length > 0) {
                  serviceRequest.passenger_email = passengers[0].passenger_email;
                  serviceRequest.passenger_phone = passengers[0].passenger_phone;
                  serviceRequest.passenger_name = passengers[0].passenger_name; 
              } else {
                  return Response.json({ error: 'Nenhum passageiro encontrado nesta viagem para notificar' }, { status: 400 });
              }
          }
          // 4. Booking (Direct Booking)
          else {
              const bookings = await base44.entities.Booking.filter({ id: serviceRequestId });
              if (bookings.length > 0) {
                  serviceRequest = bookings[0];
                  isDirectBooking = true;
                  serviceRequest.request_number = serviceRequest.booking_number;
                  serviceRequest.passenger_name = serviceRequest.customer_name;
                  serviceRequest.passenger_phone = serviceRequest.customer_phone;
                  serviceRequest.passenger_email = serviceRequest.customer_email;
                  serviceRequest.chosen_supplier_id = serviceRequest.supplier_id;
              }
          }
      }
    }
    
    if (!serviceRequest) return Response.json({ error: 'Solicitação não encontrada' }, { status: 404 });

    // Validate Driver Data
    if (!serviceRequest.driver_name || !serviceRequest.driver_phone || !serviceRequest.vehicle_model || !serviceRequest.vehicle_plate) {
      return Response.json({ error: 'Dados do motorista/veículo incompletos na viagem' }, { status: 400 });
    }

    // Supplier Info
    let supplierName = "Fornecedor";
    const targetSupplierId = user.supplier_id || serviceRequest.chosen_supplier_id || serviceRequest.supplier_id;
    if (targetSupplierId) {
        const suppliers = await base44.entities.Supplier.filter({ id: targetSupplierId });
        if (suppliers.length > 0) supplierName = suppliers[0].name;
    }

    const lang = serviceRequest.driver_language || 'pt';
    const driverInfoTranslations = {
        pt: {
            title: '🚗 Motorista Designado',
            intro: `Seu motorista para a viagem ${serviceRequest.request_number} foi confirmado.`,
            driver: '👤 Motorista',
            vehicle: '🚗 Veículo',
            plate: 'Placa',
            trip_details: '📅 Detalhes da Viagem',
            date: 'Data',
            time: 'Hora',
            origin: 'Origem',
            destination: 'Destino',
            sentBy: 'Enviado por',
            driverPhoto: 'Foto do Motorista',
        },
        en: {
            title: '🚗 Driver Assigned',
            intro: `Your driver for trip ${serviceRequest.request_number} has been confirmed.`,
            driver: '👤 Driver',
            vehicle: '🚗 Vehicle',
            plate: 'Plate',
            trip_details: '📅 Trip Details',
            date: 'Date',
            time: 'Time',
            origin: 'Origin',
            destination: 'Destination',
            sentBy: 'Sent by',
            driverPhoto: 'Driver Photo',
        },
        es: {
            title: '🚗 Conductor Asignado',
            intro: `Su conductor para el viaje ${serviceRequest.request_number} ha sido confirmado.`,
            driver: '👤 Conductor',
            vehicle: '🚗 Vehículo',
            plate: 'Placa',
            trip_details: '📅 Detalles del Viaje',
            date: 'Fecha',
            time: 'Hora',
            origin: 'Origen',
            destination: 'Destino',
            sentBy: 'Enviado por',
            driverPhoto: 'Foto del Conductor',
        }
    };
    const t = driverInfoTranslations[lang] || driverInfoTranslations.pt;

    const driverInfo = {
      name: serviceRequest.driver_name,
      phone: serviceRequest.driver_phone,
      photo: serviceRequest.driver_photo_url,
      vehicle: serviceRequest.vehicle_model,
      color: serviceRequest.vehicle_color,
      plate: serviceRequest.vehicle_plate
    };

    let emailSent = false;
    let whatsappSent = false;
    let emailError = null;
    let whatsappError = null;

    // Email
    if ((notificationType === 'email' || notificationType === 'both') && serviceRequest.passenger_email) {
      try {
        const emailBody = `
          <h2>${t.title}</h2>
          <p>${t.intro}</p>
          <div style="background:#f0f9ff; padding:15px; border-radius:5px; margin:15px 0;">
            <h3>${t.trip_details}</h3>
            <p><strong>${t.date}:</strong> ${format(new Date(serviceRequest.date), 'dd/MM/yyyy')}</p>
            <p><strong>${t.time}:</strong> ${serviceRequest.start_time || serviceRequest.time}</p>
            <p><strong>${t.origin}:</strong> ${serviceRequest.origin}</p>
            <p><strong>${t.destination}:</strong> ${serviceRequest.destination}</p>
            <hr style="border:0; border-top:1px solid #ddd; margin:10px 0;">
            <h3>${t.driver}</h3>
            <p><strong>Nome:</strong> ${driverInfo.name}</p>
            <p><strong>Telefone:</strong> ${driverInfo.phone}</p>
            <hr style="border:0; border-top:1px solid #ddd; margin:10px 0;">
            <h3>${t.vehicle}</h3>
            <p><strong>Modelo:</strong> ${driverInfo.vehicle} ${driverInfo.color || ''}</p>
            <p><strong>${t.plate}:</strong> ${driverInfo.plate}</p>
          </div>
          <p>${t.sentBy} ${supplierName}</p>
        `;

        await base44.integrations.Core.SendEmail({
          to: serviceRequest.passenger_email,
          subject: `${t.title} - ${serviceRequest.request_number}`,
          body: emailBody
        });
        emailSent = true;
      } catch (e) { emailError = e.message; }
    }

    // WhatsApp
    if ((notificationType === 'whatsapp' || notificationType === 'both') && serviceRequest.passenger_phone) {
        try {
            const apiUrl = Deno.env.get('EVOLUTION_API_URL');
            const token = Deno.env.get('EVOLUTION_API_KEY');
            const instanceId = Deno.env.get('EVOLUTION_INSTANCE_NAME');
            const clientToken = Deno.env.get('EVOLUTION_CLIENT_TOKEN');

            if (apiUrl && token && instanceId) {
                let baseUrl = apiUrl.trim();
                while(baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
                try { const u = new URL(baseUrl); baseUrl = `${u.protocol}//${u.host}`; } catch(e){}

                const waMsg = `
${t.title}

${t.intro}

*${t.trip_details}:*
*${t.date}:* ${format(new Date(serviceRequest.date), 'dd/MM/yyyy')}
*${t.time}:* ${serviceRequest.start_time || serviceRequest.time}
*${t.origin}:* ${serviceRequest.origin}
*${t.destination}:* ${serviceRequest.destination}

${t.driver}
*${driverInfo.name}*
📞 ${driverInfo.phone}

${t.vehicle}
🚗 ${driverInfo.vehicle} ${driverInfo.color || ''}
*${t.plate}: ${driverInfo.plate}*

_${t.sentBy} ${supplierName}_
                `.trim();

                let phone = String(serviceRequest.passenger_phone).replace(/\D/g, '');
                if (phone.length <= 11 && !phone.startsWith('55')) phone = '55' + phone;

                const waRes = await fetch(`${baseUrl}/instances/${instanceId}/token/${token}/send-text`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(clientToken ? {'Client-Token': clientToken} : {}) },
                    body: JSON.stringify({ phone, message: waMsg })
                });
                
                if (!waRes.ok) throw new Error('Z-API Error');
                
                // Send Photo
                if (driverInfo.photo) {
                    await fetch(`${baseUrl}/instances/${instanceId}/token/${token}/send-image`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(clientToken ? {'Client-Token': clientToken} : {}) },
                        body: JSON.stringify({ phone, image: driverInfo.photo, caption: t.driverPhoto })
                    }).catch(e => console.warn('Photo send error', e));
                }
                
                whatsappSent = true;
            }
        } catch (e) { whatsappError = e.message; }
    }

    // Update Timestamp
    const tsUpdate = { driver_info_last_sent_at: new Date().toISOString() };
    if (isEventTrip) await base44.entities.EventTrip.update(serviceRequestId, tsUpdate);
    else if (isOwnBooking) await base44.entities.SupplierOwnBooking.update(serviceRequestId, tsUpdate);
    else if (isDirectBooking) await base44.entities.Booking.update(serviceRequestId, tsUpdate);
    else await base44.entities.ServiceRequest.update(serviceRequestId, tsUpdate);

    return Response.json({
        success: emailSent || whatsappSent,
        emailSent,
        whatsappSent,
        emailError,
        whatsappError
    });

  } catch (error) {
    console.error('[sendDriverInfoToPassengers] Fatal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});