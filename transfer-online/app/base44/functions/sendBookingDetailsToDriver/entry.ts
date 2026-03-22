import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { Resend } from 'npm:resend';

Deno.serve(async (req) => {
  console.log("=== sendBookingDetailsToDriver INICIADO ===");
  
  try {
    const base44 = createClientFromRequest(req);
    console.log("Cliente Base44 criado com sucesso");
    
    // Verificar autenticação de admin
    const user = await base44.auth.me();
    if (!user) {
      return Response.json(
        { success: false, error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }
    
    if (user.role !== 'admin') {
      return Response.json(
        { success: false, error: 'Acesso negado. Apenas administradores podem enviar dados ao motorista.' },
        { status: 403 }
      );
    }
    
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
      console.error("bookingId não fornecido");
      return Response.json(
        { success: false, error: 'bookingId é obrigatório' },
        { status: 400 }
      );
    }

    console.log("Buscando reserva com ID:", bookingId);
    
    // Buscar dados da reserva usando service role
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

    // Verificar se o telefone do motorista foi preenchido
    if (!bookingData.driver_phone) {
      console.error("Telefone do motorista não preenchido");
      return Response.json(
        { success: false, error: 'Telefone do motorista não foi preenchido. Por favor, preencha antes de enviar.' },
        { status: 400 }
      );
    }

    // Obter credenciais da Z-API
    const apiUrl = Deno.env.get('EVOLUTION_API_URL');
    const token = Deno.env.get('EVOLUTION_API_KEY');
    const instanceId = Deno.env.get('EVOLUTION_INSTANCE_NAME');
    const clientToken = Deno.env.get('EVOLUTION_CLIENT_TOKEN');

    console.log("Verificando credenciais Z-API:", {
      hasUrl: !!apiUrl,
      url: apiUrl,
      hasKey: !!token,
      hasInstance: !!instanceId,
      instance: instanceId
    });

    if (!apiUrl || !token || !instanceId) {
      console.error("Credenciais da Z-API não configuradas completamente");
      return Response.json(
        { success: false, error: 'Credenciais da Z-API não configuradas. Verifique EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME' },
        { status: 500 }
      );
    }

    // Processar número do motorista
    let phoneNumber = bookingData.driver_phone.replace(/\D/g, '');
    // Ensure BR number format 55...
    if (phoneNumber.length <= 11 && !phoneNumber.startsWith('55')) {
        phoneNumber = '55' + phoneNumber;
    }
    console.log("Número de telefone do motorista processado:", phoneNumber);

    if (!phoneNumber || phoneNumber.length < 10) {
      console.error("Número de telefone do motorista inválido:", phoneNumber);
      return Response.json(
        { success: false, error: 'Número de telefone do motorista inválido' },
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

    // Construir mensagem para o motorista
    let message = `🚗 *NOVA CORRIDA ATRIBUÍDA*\n\n`;
    message += `Olá *${bookingData.driver_name || 'Motorista'}*!\n\n`;
    message += `Você foi designado para a seguinte viagem:\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n`;
    message += `📋 *Reserva:* ${bookingData.booking_number || 'N/A'}\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `👤 *PASSAGEIRO*\n`;
    message += `• Nome: *${bookingData.customer_name}*\n`;
    message += `• Telefone: *${bookingData.customer_phone}*\n`;
    if (bookingData.customer_email) {
      message += `• Email: ${bookingData.customer_email}\n`;
    }
    message += `• Passageiros: ${bookingData.passengers || 1}\n\n`;

    message += `📍 *ROTA DE IDA*\n`;
    message += `• Origem: ${bookingData.origin || '-'}\n`;
    
    // Adicionar paradas adicionais se existirem
    if (bookingData.additional_stops && bookingData.additional_stops.length > 0) {
      message += `\n🛑 *PARADAS INTERMEDIÁRIAS*\n`;
      bookingData.additional_stops.forEach((stop, idx) => {
          const stopText = stop.address || stop.notes || '-';
          const stopNote = (stop.address && stop.notes) ? ` (${stop.notes})` : '';
          message += `• ${idx + 1}: ${stopText}${stopNote}\n`;
      });
      message += `\n`;
    }

    message += `• Destino: ${bookingData.destination || '-'}\n`;
    if (bookingData.customer_address) {
      message += `• Endereço: ${bookingData.customer_address}\n`;
    }
    message += `• Data: ${formatDate(bookingData.date)}\n`;
    message += `• Horário: *${bookingData.time || '-'}*\n`;
    
    // Adicionar número do voo de origem se existir
    if (bookingData.origin_flight_number) {
      message += `• ✈️ Voo de Origem: *${bookingData.origin_flight_number}*\n`;
    }
    
    // Adicionar número do voo de destino se existir
    if (bookingData.destination_flight_number) {
      message += `• ✈️ Voo de Destino: *${bookingData.destination_flight_number}*\n`;
    }
    
    // Manter compatibilidade com campo antigo
    if (bookingData.flight_number && !bookingData.origin_flight_number && !bookingData.destination_flight_number) {
      message += `• ✈️ Voo: *${bookingData.flight_number}*\n`;
    }
    
    if (bookingData.transfer_type) {
      const transferTypeLabel = bookingData.transfer_type === 'arrival' ? 'Chegada no Aeroporto' : 'Saída do Aeroporto';
      message += `• Tipo: ${transferTypeLabel}\n`;
    }
    message += `\n`;

    if (bookingData.has_return) {
      message += `🔄 *ROTA DE RETORNO*\n`;
      message += `• Origem: ${bookingData.return_origin || '-'}\n`;
      message += `• Destino: ${bookingData.return_destination || '-'}\n`;
      message += `• Data: ${formatDate(bookingData.return_date)}\n`;
      message += `• Horário: *${bookingData.return_time || '-'}*\n`;
      
      // Adicionar número do voo de retorno (origem) se existir
      if (bookingData.return_origin_flight_number) {
        message += `• ✈️ Voo de Origem (Volta): *${bookingData.return_origin_flight_number}*\n`;
      }
      
      // Adicionar número do voo de retorno (destino) se existir
      if (bookingData.return_destination_flight_number) {
        message += `• ✈️ Voo de Destino (Volta): *${bookingData.return_destination_flight_number}*\n`;
      }
      
      // Manter compatibilidade com campo antigo
      if (bookingData.return_flight_number && !bookingData.return_origin_flight_number && !bookingData.return_destination_flight_number) {
        message += `• ✈️ Voo: *${bookingData.return_flight_number}*\n`;
      }
      
      if (bookingData.return_transfer_type) {
        const returnTransferTypeLabel = bookingData.return_transfer_type === 'arrival' ? 'Chegada no Aeroporto' : 'Saída do Aeroporto';
        message += `• Tipo: ${returnTransferTypeLabel}\n`;
      }
      message += `\n`;
    }

    message += `🚗 *SEU VEÍCULO*\n`;
    if (bookingData.vehicle_model) {
      message += `• Modelo: *${bookingData.vehicle_model}*\n`;
    }
    if (bookingData.vehicle_plate) {
      message += `• Placa: *${bookingData.vehicle_plate}*\n`;
    }
    if (bookingData.vehicle_type_name) {
      message += `• Categoria: ${bookingData.vehicle_type_name}\n`;
    }
    message += `\n`;

    if (bookingData.driver_language && bookingData.driver_language !== 'pt') {
      const languageLabels = {
        'en': 'Inglês',
        'es': 'Espanhol'
      };
      message += `🗣️ *IDIOMA SOLICITADO*\n`;
      message += `• ${languageLabels[bookingData.driver_language] || bookingData.driver_language}\n\n`;
    }

    if (bookingData.notes) {
      message += `📝 *OBSERVAÇÕES DO PASSAGEIRO*\n`;
      message += `${bookingData.notes}\n\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━━\n`;
    message += `⚠️ *INSTRUÇÕES*\n`;
    message += `• Confirme o local exato de embarque\n`;
    message += `• Chegue com 10-15 minutos de antecedência\n`;
    message += `• Mantenha o veículo limpo e em boas condições\n\n`;
    
    // --- Gerar Link do Google Calendar ---
    let calendarUrl = '';
    try {
        const title = `🚗 Viagem ${bookingData.booking_number} - ${bookingData.customer_name}`;
        
        const descriptionLines = [
          `📋 Res: ${bookingData.booking_number}`,
          `👤 ${bookingData.customer_name}`,
          'Ver detalhes no App'
        ];
        
        const description = descriptionLines.join('\n');
        
        // Parse date carefully to avoid timezone issues
        // Date is YYYY-MM-DD, Time is HH:MM
        const [year, month, day] = bookingData.date.split('-');
        const [hours, minutes] = (bookingData.time || '00:00').split(':');
        
        // Create date in local time components
        const startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
        const endDate = new Date(startDate.getTime() + (bookingData.duration_minutes || 120) * 60000);
        
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
            location: bookingData.origin,
            dates: dates
        });
        
        calendarUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
    } catch (e) {
        console.error('[sendBookingDetailsToDriver] Erro ao gerar link do Google Calendar:', e);
    }

    if (calendarUrl) {
      message += `\n📅 *Adicionar ao Google Calendar:*\n${calendarUrl}\n`;
    }

    message += `\nBoa viagem e dirija com segurança! 🚗✨`;

    // Enviar email para o motorista
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey && bookingData.driver_email) {
      try {
        const resend = new Resend(resendApiKey);
        const fromAddress = Deno.env.get('RESEND_FROM') || 'TransferOnline <nao-responda@enviotransferonline.com.br>';
        
        const emailSubject = `Nova Viagem Atribuída: ${bookingData.booking_number} - ${bookingData.customer_name}`;
        
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
                <p>Olá <strong>${bookingData.driver_name || 'Motorista'}</strong>,</p>
                <p>Você recebeu uma nova atribuição de viagem. Confira os detalhes:</p>
                
                <div class="section">
                  <div class="info-row"><span class="info-label">Reserva:</span> <span class="info-value">${bookingData.booking_number || 'N/A'}</span></div>
                  <div class="info-row"><span class="info-label">Passageiro:</span> <span class="info-value">${bookingData.customer_name}</span></div>
                  <div class="info-row"><span class="info-label">Telefone:</span> <span class="info-value">${bookingData.customer_phone}</span></div>
                  <div class="info-row"><span class="info-label">Data:</span> <span class="info-value">${formatDate(bookingData.date)}</span></div>
                  <div class="info-row"><span class="info-label">Horário:</span> <span class="info-value">${bookingData.time || '-'}</span></div>
                  <div class="info-row"><span class="info-label">Origem:</span> <span class="info-value">${bookingData.origin || '-'}</span></div>
                  <div class="info-row"><span class="info-label">Destino:</span> <span class="info-value">${bookingData.destination || '-'}</span></div>
                  ${bookingData.vehicle_model ? `<div class="info-row"><span class="info-label">Veículo:</span> <span class="info-value">${bookingData.vehicle_model}</span></div>` : ''}
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
          to: [bookingData.driver_email],
          subject: emailSubject,
          html: emailBody
        });
        console.log("Email enviado para motorista via Resend");
      } catch (err) {
        console.error("Erro ao enviar email para motorista:", err);
      }
    }

    // Enviar mensagem via Z-API
    console.log("Enviando WhatsApp para o motorista:", phoneNumber);
    console.log("Mensagem (primeiros 200 chars):", message.substring(0, 200));
    
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
    
    console.log("Z-API URL:", zApiUrl);

    const headers = {
        'Content-Type': 'application/json'
    };
    if (clientToken) {
        headers['Client-Token'] = clientToken;
    }
    
    const evolutionResponse = await fetch(zApiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        phone: phoneNumber,
        message: message
      })
    });

    const responseText = await evolutionResponse.text();
    console.log("Z-API Response Status:", evolutionResponse.status);
    console.log("Z-API Response Body:", responseText);

    if (!evolutionResponse.ok) {
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
      throw new Error(`Erro Z-API (${evolutionResponse.status}): ${errorDetail}`);
    }

    let evolutionData;
    try {
      evolutionData = JSON.parse(responseText);
    } catch (e) {
      evolutionData = { raw: responseText };
    }
    
    console.log("WhatsApp enviado com sucesso para o motorista!");

    // Atualizar timestamp de envio na reserva
    try {
      await base44.asServiceRole.entities.Booking.update(bookingId, {
        driver_booking_info_sent_at: new Date().toISOString()
      });
      console.log("Timestamp de envio atualizado na reserva");
    } catch (updateError) {
      console.warn("Erro ao atualizar timestamp (não crítico):", updateError);
    }

    return Response.json({ 
      success: true, 
      message: 'Dados da viagem enviados com sucesso ao motorista',
      sentTo: phoneNumber,
      driverName: bookingData.driver_name,
      evolutionResponse: evolutionData
    });

  } catch (error) {
    console.error('ERRO CRÍTICO na função:', error);
    console.error('Stack trace completo:', error.stack);
    
    return Response.json(
      { 
        success: false, 
        error: error.message || 'Erro ao enviar dados ao motorista',
        errorType: error.constructor.name,
        details: error.stack 
      },
      { status: 500 }
    );
  }
});