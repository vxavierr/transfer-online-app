import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  console.log("=== sendSupplierOwnBookingDriverInfoNotification INICIADO ===");

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

    const { bookingId, notificationType } = requestBody;

    if (!bookingId || !notificationType) {
      console.error("Parâmetros faltando:", { bookingId, notificationType });
      return Response.json(
        { success: false, error: 'Parâmetros obrigatórios: bookingId, notificationType' },
        { status: 400 }
      );
    }

    console.log("Parâmetros validados:", { bookingId, notificationType });

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
    const driverName = driver?.name || booking.driver_name || 'Motorista não atribuído';
    const driverPhone = driver?.phone_number || booking.driver_phone || 'Não informado';
    const vehicleModel = booking.vehicle_model || 'Veículo não informado';
    const vehiclePlate = booking.vehicle_plate || 'Placa não informada';

    // Verificar se os dados do motorista foram preenchidos minimamente
    if (driverName === 'Motorista não atribuído' || driverPhone === 'Não informado' || vehicleModel === 'Veículo não informado' || vehiclePlate === 'Placa não informada') {
      console.error("Dados do motorista incompletos.");
      return Response.json(
        { success: false, error: 'Por favor, preencha todos os dados do motorista antes de compartilhar com o cliente.' },
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

    let emailSent = false;
    let whatsappSent = false;
    let emailError = null;
    let whatsappError = null;

    // Enviar E-mail
    if ((notificationType === 'email' || notificationType === 'both') && booking.passenger_email) {
      console.log("Tentando enviar e-mail...");

      const emailBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .booking-number { background: #10b981; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; border-radius: 8px; margin: 20px 0; }
            .driver-card { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3); }
            .driver-info { background: white; color: #1f2937; padding: 15px; border-radius: 8px; margin-top: 15px; }
            .driver-info-item { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .driver-info-item:last-child { border-bottom: none; }
            .driver-info-label { font-weight: bold; color: #6b7280; width: 120px; }
            .driver-info-value { color: #111827; font-size: 16px; }
            .section { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
            .section h2 { color: #2563eb; margin-top: 0; font-size: 18px; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .info-label { font-weight: bold; color: #6b7280; }
            .info-value { color: #111827; }
            .highlight { background: #dbeafe; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3b82f6; text-align: center; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚗 Informações do Seu Motorista</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Sua viagem (${booking.booking_number}) está confirmada!</p>
            </div>

            <div class="content">
              ${booking.booking_number ? `<div class="booking-number">Reserva: ${booking.booking_number}</div>` : ''}

              <p>Olá <strong>${booking.passenger_name}</strong>,</p>
              <p>Temos o prazer de informar que seu motorista já foi designado! Confira os detalhes abaixo:</p>

              <div class="driver-card">
                <h2 style="margin: 0 0 15px 0; font-size: 24px; text-align: center;">👨‍✈️ Seu Motorista</h2>
                <div class="driver-info">
                  <div class="driver-info-item">
                    <span class="driver-info-label">👤 Nome:</span>
                    <span class="driver-info-value"><strong>${driverName}</strong></span>
                  </div>
                  <div class="driver-info-item">
                    <span class="driver-info-label">📱 Telefone:</span>
                    <span class="driver-info-value"><strong>${driverPhone}</strong></span>
                  </div>
                  <div class="driver-info-item">
                    <span class="driver-info-label">🚗 Veículo:</span>
                    <span class="driver-info-value"><strong>${vehicleModel}</strong></span>
                  </div>
                  <div class="driver-info-item">
                    <span class="driver-info-label">🔢 Placa:</span>
                    <span class="driver-info-value"><strong>${vehiclePlate}</strong></span>
                  </div>
                </div>
              </div>

              <div class="section">
                <h2>📍 Detalhes da Viagem</h2>
                <div class="info-row">
                  <span class="info-label">Origem:</span>
                  <span class="info-value">${booking.origin || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Destino:</span>
                  <span class="info-value">${booking.destination || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Data:</span>
                  <span class="info-value">${formatDate(booking.date)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Horário:</span>
                  <span class="info-value">${booking.time || '-'}</span>
                </div>
              </div>

              ${booking.service_type === 'round_trip' ? `
              <div class="section">
                <h2>🔄 Viagem de Retorno</h2>
                <div class="info-row">
                  <span class="info-label">Data:</span>
                  <span class="info-value">${formatDate(booking.return_date)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Horário:</span>
                  <span class="info-value">${booking.return_time || '-'}</span>
                </div>
              </div>
              ` : ''}

              <div class="highlight">
                <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 20px;">📱 Contato Direto</h3>
                <p style="margin: 0; color: #1e3a8a; font-size: 16px;">
                  Você pode entrar em contato diretamente com o motorista através do telefone <strong>${driverPhone}</strong>
                </p>
              </div>

              <p style="text-align: center; margin-top: 30px;">
                Desejamos uma excelente viagem! ✈️🚗
              </p>
            </div>

            <div class="footer">
              <p>TransferOnline - Sistema de Reservas de Transfer</p>
              <p>Este é um e-mail automático com informações importantes sobre sua viagem.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        console.log("Enviando e-mail para:", booking.passenger_email);
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'TransferOnline',
          to: booking.passenger_email,
          subject: `🚗 Seu Motorista - Viagem ${booking.booking_number}`,
          body: emailBody
        });
        emailSent = true;
        console.log("E-mail enviado com sucesso!");
      } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        emailError = error.message || 'Erro desconhecido ao enviar e-mail';
      }
    }

    // Enviar WhatsApp
    if ((notificationType === 'whatsapp' || notificationType === 'both') && booking.passenger_phone) {
      console.log("Tentando enviar WhatsApp...");

      const apiUrl = Deno.env.get('EVOLUTION_API_URL');
      const token = Deno.env.get('EVOLUTION_API_KEY');
      const instanceId = Deno.env.get('EVOLUTION_INSTANCE_NAME');
      const clientToken = Deno.env.get('EVOLUTION_CLIENT_TOKEN');

      if (apiUrl && token && instanceId) {
        const originalPhone = booking.passenger_phone || '';
        let phoneNumber = originalPhone.replace(/\D/g, '') || '';
        
        // Lógica inteligente para internacionalização
        if (!originalPhone.includes('+') && !phoneNumber.startsWith('55')) {
          phoneNumber = '55' + phoneNumber;
        }

        if (phoneNumber && phoneNumber.length >= 10) {
          let message = `🚗 *INFORMAÇÕES DO SEU MOTORISTA - Viagem ${booking.booking_number}*

`;
          message += `Olá *${booking.passenger_name}*!

`;
          message += `Sua viagem está confirmada! Confira os dados do motorista designado:

`;
          message += `━━━━━━━━━━━━━━━━━━━
`;
          message += `👨‍✈️ *SEU MOTORISTA*
`;
          message += `• Nome: *${driverName}*
`;
          message += `• Telefone: *${driverPhone}*
`;
          message += `• Veículo: *${vehicleModel} / Placa: ${vehiclePlate}*
`;
          message += `━━━━━━━━━━━━━━━━━━━

`;

          message += `📍 *DETALHES DA VIAGEM*
`;
          message += `• Origem: ${booking.origin || '-'}
`;
          message += `• Destino: ${booking.destination || '-'}
`;
          message += `• Data: ${formatDate(booking.date)}
`;
          message += `• Horário: ${booking.time || '-'}
`;

          if (booking.service_type === 'round_trip') {
            message += `
🔄 *RETORNO*
`;
            message += `• Data: ${formatDate(booking.return_date)}
`;
            message += `• Horário: ${booking.return_time}
`;
          }

          message += `
Tenha uma excelente viagem! ✈️`;

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
          if (clientToken) { headers['Client-Token'] = clientToken; }

          const payload = { phone: phoneNumber, message: message };

          const whatsappResponse = await fetch(zApiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
          });

          const responseText = await whatsappResponse.text();

          if (whatsappResponse.ok) {
            whatsappSent = true;
          } else {
            let errorDetail = responseText;
            try {
              const jsonError = JSON.parse(responseText);
              if (jsonError.error) { errorDetail = typeof jsonError.error === 'string' ? jsonError.error : jsonError.error.message; }
              else if (jsonError.message) { errorDetail = jsonError.message; }
            } catch (e) { /* ignore */ }
            whatsappError = `Erro ${whatsappResponse.status}: ${errorDetail}`;
          }
        } else {
          whatsappError = "Número de telefone do passageiro inválido ou muito curto";
        }
      } else {
        whatsappError = "Credenciais da API de WhatsApp não configuradas completamente";
      }
    }

    if (emailSent || whatsappSent) {
      await client.entities.SupplierOwnBooking.update(bookingId, {
        driver_info_shared_at: new Date().toISOString()
      });
    }

    const results = {
      success: emailSent || whatsappSent,
      message: emailSent || whatsappSent ? 'Informações do motorista compartilhadas com sucesso' : 'Não foi possível enviar notificações',
      emailSent,
      whatsappSent,
      emailError,
      whatsappError
    };

    return Response.json(results);

  } catch (error) {
    console.error('[sendSupplierOwnBookingDriverInfoNotification] Erro CRÍTICO:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});