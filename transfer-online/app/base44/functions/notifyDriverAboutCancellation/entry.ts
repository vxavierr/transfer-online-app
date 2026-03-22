import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId, tripType, cancelReason } = await req.json();

    if (!tripId || !tripType) {
      return Response.json({ error: 'Missing tripId or tripType' }, { status: 400 });
    }

    // Determine Entity based on tripType
    let Entity;
    let typeLabel;
    if (tripType === 'ServiceRequest' || tripType === 'service_request') {
      Entity = base44.asServiceRole.entities.ServiceRequest;
      typeLabel = 'Solicitação';
    } else if (tripType === 'Booking' || tripType === 'booking') {
      Entity = base44.asServiceRole.entities.Booking;
      typeLabel = 'Reserva';
    } else if (tripType === 'SupplierOwnBooking' || tripType === 'supplier_own_booking') {
      Entity = base44.asServiceRole.entities.SupplierOwnBooking;
      typeLabel = 'Viagem';
    } else {
      return Response.json({ error: 'Invalid tripType' }, { status: 400 });
    }

    // Fetch Trip
    const trip = await Entity.get(tripId);

    if (!trip) {
      return Response.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Get Driver Details
    let driverPhone = trip.driver_phone;
    let driverEmail = trip.driver_email;
    let driverName = trip.driver_name || 'Motorista';
    const driverId = trip.driver_id;

    if ((!driverPhone || !driverEmail) && driverId) {
      try {
        const driver = await base44.asServiceRole.entities.Driver.get(driverId);
        if (driver) {
            if (!driverPhone) driverPhone = driver.phone_number;
            if (!driverEmail) driverEmail = driver.email;
            if (!driverName && driver.name) driverName = driver.name;
        }
      } catch (e) {
        console.error('Error fetching driver:', e);
      }
    }

    if (!driverPhone && !driverEmail) {
      return Response.json({ success: false, message: 'No contact info for driver' });
    }

    const displayId = trip.request_number || trip.booking_number || trip.display_id || trip.id;
    const dateStr = trip.date ? trip.date.split('-').reverse().join('/') : '';
    const message = `🚫 *Viagem Cancelada*\n\nOlá ${driverName}, a viagem abaixo foi cancelada.\n\n🆔 ID: ${displayId}\n📅 Data: ${dateStr} às ${trip.time}\n📍 Origem: ${trip.origin}\n\nMotivo: ${cancelReason || 'Cancelada pelo administrador/fornecedor'}\n\nPor favor, não se dirija ao local.`;

    const instanceId = Deno.env.get("EVOLUTION_INSTANCE_NAME");
    const token = Deno.env.get("EVOLUTION_API_KEY");
    const apiUrl = Deno.env.get("EVOLUTION_API_URL");
    const clientToken = Deno.env.get("EVOLUTION_CLIENT_TOKEN");

    let waSent = false;
    let emailSent = false;

    // 1. Send WhatsApp
    if (driverPhone && instanceId && token && apiUrl) {
      let cleanPhone = driverPhone.replace(/\D/g, '');
      if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
        cleanPhone = '55' + cleanPhone;
      }

      try {
        // Robust URL construction
        let baseUrl = apiUrl.trim();
        while(baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        try {
            const urlObj = new URL(baseUrl);
            baseUrl = `${urlObj.protocol}//${urlObj.host}`;
        } catch (e) {
            console.warn("Invalid API URL format", e);
        }

        const zApiUrl = `${baseUrl}/instances/${instanceId}/token/${token}/send-text`;
        
        const headers = { 'Content-Type': 'application/json' };
        if (clientToken) headers['Client-Token'] = clientToken;

        const response = await fetch(zApiUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            phone: cleanPhone,
            message: message
          })
        });

        if (response.ok) {
          waSent = true;
        } else {
          console.error('Z-API Error:', await response.text());
        }
      } catch (err) {
        console.error('WhatsApp Send Error:', err);
      }
    }

    // 2. Send Email
    if (driverEmail) {
        const emailSubject = `🚫 Viagem Cancelada - ${displayId}`;
        const emailBody = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">🚫 Viagem Cancelada</h2>
                <p>Olá <strong>${driverName}</strong>,</p>
                <p>Informamos que a seguinte viagem foi <strong>CANCELADA</strong> e não deve ser realizada.</p>
                
                <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca; margin: 20px 0;">
                    <p><strong>🆔 ID:</strong> ${displayId}</p>
                    <p><strong>📅 Data:</strong> ${dateStr}</p>
                    <p><strong>⏰ Horário:</strong> ${trip.time}</p>
                    <p><strong>📍 Origem:</strong> ${trip.origin}</p>
                    <p><strong>🏁 Destino:</strong> ${trip.destination}</p>
                    <p><strong>📝 Motivo:</strong> ${cancelReason || 'Não informado'}</p>
                </div>
                
                <p style="font-size: 12px; color: #666;">Esta é uma mensagem automática do sistema TransferOnline.</p>
            </div>
        `;

        try {
            await base44.integrations.Core.SendEmail({
                to: driverEmail,
                subject: emailSubject,
                body: emailBody
            });
            emailSent = true;
        } catch (emailErr) {
            console.error('Email Send Error:', emailErr);
        }
    }

    // 3. Log History - SEMPRE logar a tentativa, mesmo que falhe
    try {
        await base44.asServiceRole.entities.TripHistory.create({
            trip_id: trip.id,
            trip_type: tripType,
            event_type: 'Notificação de Cancelamento',
            user_id: user.id,
            user_name: user.full_name,
            details: {
                success: waSent || emailSent,
                sent_whatsapp: waSent,
                sent_email: emailSent,
                driver_phone: driverPhone || 'N/A',
                driver_email: driverEmail || 'N/A',
                trip_display_id: displayId
            },
            comment: (waSent || emailSent) 
                ? `Motorista notificado sobre o cancelamento. (WA: ${waSent ? 'Sim' : 'Não'}, Email: ${emailSent ? 'Sim' : 'Não'})`
                : `Falha ao notificar motorista sobre cancelamento. Verifique telefone/email.`
        });
    } catch (e) {
        console.error('History Log Error:', e);
    }

    return Response.json({ success: waSent || emailSent, waSent, emailSent, message: (waSent || emailSent) ? 'Notified' : 'Failed to notify' });

  } catch (error) {
    console.error('Func Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});