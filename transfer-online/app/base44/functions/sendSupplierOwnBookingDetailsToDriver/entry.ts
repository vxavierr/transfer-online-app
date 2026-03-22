import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { Resend } from 'npm:resend';

Deno.serve(async (req) => {
  console.log("=== sendSupplierOwnBookingDetailsToDriver INICIADO ===");

  try {
    const base44 = createClientFromRequest(req);
    const client = base44.asServiceRole;

    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request body recebido:", JSON.stringify(requestBody));
    } catch (jsonError) {
      console.error("Erro ao fazer parse do JSON:", jsonError);
      return Response.json(
        { success: false, error: 'JSON inválido no corpo da requisição' },
        { status: 400 }
      );
    }

    const { bookingId } = requestBody;

    if (!bookingId) {
      console.error("bookingId faltando");
      return Response.json(
        { success: false, error: 'bookingId é obrigatório' },
        { status: 400 }
      );
    }

    console.log("Buscando viagem própria (SupplierOwnBooking) com ID:", bookingId);
    const booking = await client.entities.SupplierOwnBooking.get(bookingId);

    if (!booking) {
      console.error("Viagem própria não encontrada:", bookingId);
      return Response.json(
        { success: false, error: 'Viagem própria não encontrada' },
        { status: 404 }
      );
    }

    console.log("Viagem própria encontrada:", booking.booking_number);

    // Obter dados do motorista
    let driver = null;
    if (booking.driver_id) {
        driver = await client.entities.Driver.get(booking.driver_id);
    }

    // Fallback para dados manuais se não houver driver_id ou driver não encontrado
    const driverName = driver?.name || booking.driver_name || 'Não Atribuído';
    const driverPhone = driver?.phone_number || booking.driver_phone || 'Não Informado';
    const vehicleModel = booking.vehicle_model || 'Não Informado';
    const vehiclePlate = booking.vehicle_plate || 'Não Informado';

    if (!driverPhone) {
      console.error("Número de telefone do motorista não disponível.");
      return Response.json(
        { success: false, error: 'Número de telefone do motorista não disponível.' },
        { status: 400 }
      );
    }

    // Função auxiliar para formatar data
    const formatDate = (dateString) => {
      if (!dateString) return 'Data não informada';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      } catch (e) {
        return dateString;
      }
    };

    const formatTime = (timeString) => {
        return timeString || 'Horário não informado';
    }

    let phoneNumber = driverPhone.replace(/\D/g, '');
    if (phoneNumber.length <= 11 && !phoneNumber.startsWith('55')) {
        phoneNumber = '55' + phoneNumber;
    }
    
    let message = `*DETALHES DA VIAGEM - ${booking.booking_number}*

`;
    message += `Olá ${driverName},
Você tem uma nova viagem / atualização:`;
    message += `

--- *INFORMAÇÕES GERAIS* ---
`;
    message += `*Cliente:* ${booking.passenger_name}
`;
    message += `*Tipo de Serviço:* ${booking.service_type === 'one_way' ? 'Só Ida' : booking.service_type === 'round_trip' ? 'Ida e Volta' : 'Por Hora'}
`;
    message += `*Data:* ${formatDate(booking.date)}
`;
    message += `*Horário:* ${formatTime(booking.time)}
`;
    if (booking.hours) {
        message += `*Horas Contratadas:* ${booking.hours}h
`;
    }
    message += `*Passageiros:* ${booking.passengers}
`;
    message += `*Veículo:* ${booking.vehicle_model} / Placa: ${booking.vehicle_plate}
`;
    
    message += `
--- *ROTA* ---
`;
    message += `*Origem:* ${booking.origin}
`;
    if (booking.origin_flight_number) {
        message += `*Voo de Origem:* ${booking.origin_flight_number}
`;
    }
    if (booking.additional_stops && booking.additional_stops.length > 0) {
        message += `*Paradas Adicionais:*
`;
        booking.additional_stops.forEach((stop, index) => {
            message += `  - ${stop.address} ${stop.notes ? `(${stop.notes})` : ''}
`;
        });
    }
    if (booking.destination) {
        message += `*Destino:* ${booking.destination}
`;
        if (booking.destination_flight_number) {
            message += `*Voo de Destino:* ${booking.destination_flight_number}
`;
        }
    }

    if (booking.service_type === 'round_trip') {
        message += `
--- *DETALHES DO RETORNO* ---
`;
        message += `*Data Retorno:* ${formatDate(booking.return_date)}
`;
        message += `*Horário Retorno:* ${formatTime(booking.return_time)}
`;
    }

    if (booking.notes) {
      message += `
--- *OBSERVAÇÕES* ---
`;
      message += `${booking.notes}
`;
    }

    message += `
--- *CONTATO PASSAGEIRO* ---
`;
    message += `*Nome:* ${booking.passenger_name}
`;
    if (booking.passenger_phone) {
        message += `*Telefone:* ${booking.passenger_phone}
`;
    }
    if (booking.passenger_email) {
        message += `*Email:* ${booking.passenger_email}
`;
    }

    // Gerar Link do Google Calendar
    let calendarUrl = '';
    try {
        const title = `🚗 Viagem ${booking.booking_number} - ${booking.passenger_name}`;
        const description = `Origem: ${booking.origin}\nDestino: ${booking.destination}\nPassageiro: ${booking.passenger_name}\nVer detalhes no App`;
        
        const [year, month, day] = booking.date.split('-');
        const [hours, minutes] = (booking.time || '00:00').split(':');
        
        const startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
        const durationMinutes = booking.duration_minutes || 120;
        const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
        
        const formatGoogleDate = (date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          const h = String(date.getHours()).padStart(2, '0');
          const min = String(date.getMinutes()).padStart(2, '0');
          return `${y}${m}${d}T${h}${min}00`;
        };
        
        const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`;
        
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: title,
            details: description,
            location: booking.origin,
            dates: dates
        });
        
        calendarUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
    } catch (e) {
        console.error('Erro ao gerar link do calendar:', e);
    }

    if (calendarUrl) {
      message += `\n📅 *Adicionar ao Google Calendar:*\n${calendarUrl}\n`;
    }

    message += `
Tenha uma excelente viagem!`;

    // Enviar email para o motorista
    const driverEmail = booking.driver_email || driver?.email;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey && driverEmail) {
      try {
        const resend = new Resend(resendApiKey);
        const fromAddress = Deno.env.get('RESEND_FROM') || 'TransferOnline <nao-responda@enviotransferonline.com.br>';
        
        const emailSubject = `Nova Viagem Atribuída: ${booking.booking_number} - ${booking.passenger_name}`;
        
        const emailBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f7f6; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; }
              .content { padding: 30px; }
              .section { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2563eb; }
              .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
              .info-label { font-weight: bold; color: #555; }
              .info-value { color: #333; text-align: right; }
              .cta-button { display: inline-block; background: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; text-align: center; margin-top: 15px; width: 100%; box-sizing: border-box; }
              .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; border-top: 1px solid #eee; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚗 Nova Viagem Atribuída</h1>
                <p>Detalhes da sua próxima corrida</p>
              </div>
              <div class="content">
                <p>Olá <strong>${driverName}</strong>,</p>
                <p>Você recebeu uma nova atribuição de viagem. Confira os detalhes:</p>
                
                <div class="section">
                  <div class="info-row"><span class="info-label">Reserva:</span> <span class="info-value">${booking.booking_number || 'N/A'}</span></div>
                  <div class="info-row"><span class="info-label">Passageiro:</span> <span class="info-value">${booking.passenger_name}</span></div>
                  ${booking.passenger_phone ? `<div class="info-row"><span class="info-label">Telefone:</span> <span class="info-value">${booking.passenger_phone}</span></div>` : ''}
                  <div class="info-row"><span class="info-label">Data:</span> <span class="info-value">${formatDate(booking.date)}</span></div>
                  <div class="info-row"><span class="info-label">Horário:</span> <span class="info-value">${booking.time || '-'}</span></div>
                  <div class="info-row"><span class="info-label">Origem:</span> <span class="info-value">${booking.origin || '-'}</span></div>
                  <div class="info-row"><span class="info-label">Destino:</span> <span class="info-value">${booking.destination || '-'}</span></div>
                  <div class="info-row"><span class="info-label">Veículo:</span> <span class="info-value">${vehicleModel}</span></div>
                </div>

                ${calendarUrl ? `
                <div style="text-align: center;">
                  <a href="${calendarUrl}" class="cta-button">📅 Adicionar ao Google Calendar</a>
                </div>
                ` : ''}

                <p style="text-align: center; margin-top: 20px; font-size: 14px; color: #666;">Acesse o aplicativo para ver todos os detalhes e iniciar a viagem.</p>
              </div>
              <div class="footer">
                <p>TransferOnline</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await resend.emails.send({
          from: fromAddress,
          to: [driverEmail],
          subject: emailSubject,
          html: emailBody
        });
        console.log("Email enviado para motorista via Resend");
      } catch (err) {
        console.error("Erro ao enviar email para motorista:", err);
      }
    }

    const apiUrl = Deno.env.get('EVOLUTION_API_URL');
    const token = Deno.env.get('EVOLUTION_API_KEY');
    const instanceId = Deno.env.get('EVOLUTION_INSTANCE_NAME');
    const clientToken = Deno.env.get('EVOLUTION_CLIENT_TOKEN');

    if (!apiUrl || !token || !instanceId) {
      return Response.json({ success: false, error: 'Credenciais da API de WhatsApp não configuradas.' }, { status: 500 });
    }

    let baseUrl = apiUrl.trim();
    while (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    try {
      const urlObj = new URL(baseUrl);
      baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    } catch (e) {
      console.warn("Invalid API URL format", e);
    }

    const zApiUrl = `${baseUrl}/instances/${instanceId}/token/${token}/send-text`;
    const headers = { 'Content-Type': 'application/json' };
    if (clientToken) {
      headers['Client-Token'] = clientToken;
    }

    const payload = { phone: phoneNumber, message: message };

    const whatsappResponse = await fetch(zApiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    const responseText = await whatsappResponse.text();
    console.log("Z-API Response Status:", whatsappResponse.status);
    console.log("Z-API Response Body:", responseText);

    if (!whatsappResponse.ok) {
      let errorDetail = responseText;
      try {
        const jsonError = JSON.parse(responseText);
        if (jsonError.error) { errorDetail = typeof jsonError.error === 'string' ? jsonError.error : jsonError.error.message; }
        else if (jsonError.message) { errorDetail = jsonError.message; }
      } catch (e) { /* ignore */ }
      throw new Error(`Erro ao enviar WhatsApp: ${errorDetail}`);
    }

    // Opcional: Atualizar um campo no booking para indicar que foi enviado
    await client.entities.SupplierOwnBooking.update(bookingId, { 
      driver_booking_info_sent_at: new Date().toISOString() 
    });

    return Response.json({ success: true, message: 'Detalhes da viagem enviados ao motorista.' });

  } catch (error) {
    console.error('[sendSupplierOwnBookingDetailsToDriver] Erro CRÍTICO:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});