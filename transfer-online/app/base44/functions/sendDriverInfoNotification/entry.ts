import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  console.log("=== sendDriverInfoNotification INICIADO ===");
  
  try {
    const base44 = createClientFromRequest(req);
    console.log("Cliente Base44 criado com sucesso");
    
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

    // Buscar dados da reserva usando service role
    console.log("Buscando reserva com ID:", bookingId);
    let bookings;
    try {
      bookings = await base44.asServiceRole.entities.Booking.list();
      console.log(`Total de reservas encontradas: ${bookings.length}`);
    } catch (listError) {
      console.error("Erro ao listar reservas:", listError);
      return Response.json(
        { success: false, error: 'Erro ao buscar reservas: ' + listError.message },
        { status: 500 }
      );
    }
    
    const bookingData = bookings.find(b => b.id === bookingId);

    if (!bookingData) {
      console.error("Reserva não encontrada:", bookingId);
      return Response.json(
        { success: false, error: 'Reserva não encontrada' },
        { status: 404 }
      );
    }

    console.log("Reserva encontrada:", bookingData.booking_number);

    // Verificar se os dados do motorista foram preenchidos
    if (!bookingData.driver_name || !bookingData.driver_phone || !bookingData.vehicle_model || !bookingData.vehicle_plate) {
      console.error("Dados do motorista incompletos");
      return Response.json(
        { success: false, error: 'Por favor, preencha todos os dados do motorista antes de compartilhar' },
        { status: 400 }
      );
    }

    // Função auxiliar para formatar data
    const formatDate = (dateString) => {
      if (!dateString) return 'Data não informada';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
      } catch (e) {
        console.error("Erro ao formatar data:", e);
        return dateString;
      }
    };

    let emailSent = false;
    let whatsappSent = false;
    let emailError = null;
    let whatsappError = null;

    // Enviar E-mail
    if (notificationType === 'email' || notificationType === 'both') {
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
              <p style="margin: 10px 0 0 0; font-size: 16px;">Sua viagem está confirmada!</p>
            </div>
            
            <div class="content">
              ${bookingData.booking_number ? `<div class="booking-number">Reserva: ${bookingData.booking_number}</div>` : ''}

              <p>Olá <strong>${bookingData.customer_name}</strong>,</p>
              <p>Temos o prazer de informar que seu motorista já foi designado! Confira os detalhes abaixo:</p>

              <div class="driver-card">
                <h2 style="margin: 0 0 15px 0; font-size: 24px; text-align: center;">👨‍✈️ Seu Motorista</h2>
                <div class="driver-info">
                  <div class="driver-info-item">
                    <span class="driver-info-label">👤 Nome:</span>
                    <span class="driver-info-value"><strong>${bookingData.driver_name}</strong></span>
                  </div>
                  <div class="driver-info-item">
                    <span class="driver-info-label">📱 Telefone:</span>
                    <span class="driver-info-value"><strong>${bookingData.driver_phone}</strong></span>
                  </div>
                  <div class="driver-info-item">
                    <span class="driver-info-label">🚗 Veículo:</span>
                    <span class="driver-info-value"><strong>${bookingData.vehicle_model}</strong></span>
                  </div>
                  <div class="driver-info-item">
                    <span class="driver-info-label">🔢 Placa:</span>
                    <span class="driver-info-value"><strong>${bookingData.vehicle_plate}</strong></span>
                  </div>
                </div>
              </div>

              <div class="section">
                <h2>📍 Detalhes da Viagem</h2>
                <div class="info-row">
                  <span class="info-label">Origem:</span>
                  <span class="info-value">${bookingData.origin || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Destino:</span>
                  <span class="info-value">${bookingData.destination || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Data:</span>
                  <span class="info-value">${formatDate(bookingData.date)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Horário:</span>
                  <span class="info-value">${bookingData.time || '-'}</span>
                </div>
              </div>

              ${bookingData.has_return ? `
              <div class="section">
                <h2>🔄 Viagem de Retorno</h2>
                <div class="info-row">
                  <span class="info-label">Data:</span>
                  <span class="info-value">${formatDate(bookingData.return_date)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Horário:</span>
                  <span class="info-value">${bookingData.return_time || '-'}</span>
                </div>
              </div>
              ` : ''}

              <div class="highlight">
                <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 20px;">📱 Contato Direto</h3>
                <p style="margin: 0; color: #1e3a8a; font-size: 16px;">
                  Você pode entrar em contato diretamente com o motorista através do telefone <strong>${bookingData.driver_phone}</strong>
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
        console.log("Enviando e-mail para:", bookingData.customer_email);
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'TransferOnline',
          to: bookingData.customer_email,
          subject: `🚗 Seu Motorista - Reserva ${bookingData.booking_number || ''}`,
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
    if (notificationType === 'whatsapp' || notificationType === 'both') {
      console.log("Tentando enviar WhatsApp...");
      
      const apiUrl = Deno.env.get('EVOLUTION_API_URL');
      const token = Deno.env.get('EVOLUTION_API_KEY');
      const instanceId = Deno.env.get('EVOLUTION_INSTANCE_NAME');
      const clientToken = Deno.env.get('EVOLUTION_CLIENT_TOKEN');

      console.log("Verificando credenciais Z-API (Debug):", {
        hasUrl: !!apiUrl,
        hasKey: !!token,
        hasInstance: !!instanceId,
        hasClientToken: !!clientToken
      });

      if (apiUrl && token && instanceId) {
        const originalPhone = bookingData.customer_phone || '';
        let phoneNumber = originalPhone.replace(/\D/g, '');
        console.log("Número de telefone do cliente (raw):", phoneNumber);
        
        // Lógica inteligente para internacionalização
        if (!originalPhone.includes('+') && !phoneNumber.startsWith('55')) {
            phoneNumber = '55' + phoneNumber;
        }
        console.log("Número de telefone do cliente (formatado):", phoneNumber);
        
        if (phoneNumber && phoneNumber.length >= 10) {
          let message = `🚗 *INFORMAÇÕES DO SEU MOTORISTA*\n\n`;
          message += `Olá *${bookingData.customer_name}*!\n\n`;
          message += `Sua viagem está confirmada! Confira os dados do motorista designado:\n\n`;
          message += `━━━━━━━━━━━━━━━━━━━\n`;
          message += `📋 *Reserva:* ${bookingData.booking_number || 'N/A'}\n`;
          message += `━━━━━━━━━━━━━━━━━━━\n\n`;
          
          message += `👨‍✈️ *SEU MOTORISTA*\n`;
          message += `• Nome: *${bookingData.driver_name}*\n`;
          message += `• Telefone: *${bookingData.driver_phone}*\n`;
          message += `• Veículo: *${bookingData.vehicle_model} ${bookingData.vehicle_color ? `(${bookingData.vehicle_color})` : ''}*\n`;
          message += `• Placa: *${bookingData.vehicle_plate}*\n\n`;

          message += `📍 *DETALHES DA VIAGEM*\n`;
          message += `• Origem: ${bookingData.origin || '-'}\n`;
          message += `• Destino: ${bookingData.destination || '-'}\n`;
          message += `• Data: ${formatDate(bookingData.date)}\n`;
          message += `• Horário: ${bookingData.time || '-'}\n`;

          if (bookingData.has_return) {
            message += `\n🔄 *RETORNO*\n`;
            message += `• Data: ${formatDate(bookingData.return_date)}\n`;
            message += `• Horário: ${bookingData.return_time || '-'}\n`;
          }

          message += `\nTenha uma excelente viagem! ✈️`;

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

            // Using Z-API format: /instances/{instanceId}/token/{token}/send-text
            const zApiUrl = `${baseUrl}/instances/${instanceId}/token/${token}/send-text`;
            console.log("Z-API URL:", zApiUrl);
            
            const headers = {
                'Content-Type': 'application/json'
            };
            if (clientToken) {
                headers['Client-Token'] = clientToken;
            }

            // Payload format for Z-API: { phone, message }
            const payload = {
              phone: phoneNumber,
              message: message
            };

            const whatsappResponse = await fetch(zApiUrl, {
              method: 'POST',
              headers: headers,
              body: JSON.stringify(payload)
            });

            const responseText = await whatsappResponse.text();
            console.log("Z-API Response Status:", whatsappResponse.status);
            console.log("Z-API Response Body:", responseText);

            if (whatsappResponse.ok) {
              whatsappSent = true;
              console.log("WhatsApp enviado com sucesso!");
            } else {
              console.error('Erro ao enviar WhatsApp via Z-API');
              let errorDetail = responseText;
              try {
                  const jsonError = JSON.parse(responseText);
                  if (jsonError.error) {
                      if (typeof jsonError.error === 'string') errorDetail = jsonError.error;
                      else if (jsonError.error.message) errorDetail = jsonError.error.message;
                  } else if (jsonError.message) {
                      errorDetail = jsonError.message;
                  }
              } catch(e) {}
              whatsappError = `Erro ${whatsappResponse.status}: ${errorDetail}`;
            }
          } catch (error) {
            console.error('Erro ao enviar WhatsApp:', error);
            whatsappError = error.message || 'Erro desconhecido ao enviar WhatsApp';
          }
        } else {
          console.warn("Número de telefone do cliente inválido:", phoneNumber);
          whatsappError = "Número de telefone inválido ou muito curto";
        }
      } else {
        console.warn("Credenciais da Z-API não configuradas");
        whatsappError = "Credenciais Z-API não configuradas completamente";
      }
    }

    // Atualizar data de compartilhamento apenas se pelo menos um canal foi bem-sucedido
    if (emailSent || whatsappSent) {
      try {
        console.log("Atualizando data de compartilhamento...");
        await base44.asServiceRole.entities.Booking.update(bookingId, {
          driver_info_shared_at: new Date().toISOString()
        });
        console.log("Data de compartilhamento atualizada com sucesso");
      } catch (updateError) {
        console.error('Erro ao atualizar data de compartilhamento:', updateError);
      }
    }

    const results = {
      success: emailSent || whatsappSent,
      message: emailSent || whatsappSent ? 'Informações do motorista compartilhadas com sucesso' : 'Não foi possível enviar notificações',
      emailSent,
      whatsappSent,
      emailError,
      whatsappError
    };

    console.log("Resultado final:", results);

    // Sempre retornar status 200 se chegou até aqui
    return Response.json(results);

  } catch (error) {
    console.error('ERRO CRÍTICO na função:', error);
    console.error('Stack trace completo:', error.stack);
    
    return Response.json(
      { 
        success: false, 
        error: error.message || 'Erro ao enviar informações',
        errorType: error.constructor.name,
        details: error.stack 
      },
      { status: 500 }
    );
  }
});