import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const requestBody = await req.json();
    const { bookingId, recipientType } = requestBody;

    console.log("sendWhatsAppBookingNotification chamado com:", { bookingId, recipientType });

    if (!bookingId || !recipientType) {
      return Response.json(
        { success: false, error: 'Parâmetros obrigatórios: bookingId, recipientType' },
        { status: 400 }
      );
    }

    // Buscar dados da reserva usando service role
    const bookings = await base44.asServiceRole.entities.Booking.list();
    const bookingData = bookings.find(b => b.id === bookingId);

    if (!bookingData) {
      return Response.json(
        { success: false, error: 'Reserva não encontrada' },
        { status: 404 }
      );
    }

    // Determinar número do destinatário preservando o formato original
    let phoneNumber = '';

    if (recipientType === 'admin') {
      const configs = await base44.asServiceRole.entities.AppConfig.list();
      const adminWhatsAppConfig = configs.find(c => c.config_key === 'admin_whatsapp_number');

      if (!adminWhatsAppConfig || !adminWhatsAppConfig.config_value) {
        return Response.json(
          { success: false, error: 'WhatsApp do administrador não configurado no AppConfig.' }
        );
      }

      phoneNumber = adminWhatsAppConfig.config_value;
    } else if (recipientType === 'customer') {
      if (!bookingData.customer_phone) {
        return Response.json(
          { success: false, error: 'Telefone do cliente não encontrado.' },
          { status: 400 }
        );
      }
      phoneNumber = bookingData.customer_phone;
    } else {
      return Response.json(
        { success: false, error: 'Destinatário inválido.' },
        { status: 400 }
      );
    }

    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 10) {
      return Response.json(
        { success: false, error: 'Número de telefone inválido.' },
        { status: 400 }
      );
    }

    // ... (rest of message construction logic) ...
    // Função auxiliar para formatar preço
    const formatPrice = (price) => {
      if (!price || isNaN(price)) return 'R$ 0,00';
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
    };

    // Função auxiliar para formatar data
    const formatDate = (dateString, lang = 'pt') => {
      if (!dateString) return 'Data não informada';
      try {
        const date = new Date(dateString);
        const locales = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };
        return date.toLocaleDateString(locales[lang] || 'pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      } catch (e) { return dateString; }
    };

    // Dicionário de traduções para WhatsApp (Simplificado para brevidade no replace, mas mantendo a lógica)
    const translations = {
      pt: { confirmedTitle: '✅ *RESERVA CONFIRMADA*', hello: 'Olá', confirmedBody: 'Sua reserva de transfer foi confirmada com sucesso! 🚗', bookingLabel: 'Reserva', routeOutbound: '📍 *ROTA DE IDA*', routeReturn: '🔄 *ROTA DE RETORNO*', origin: 'Origem', destination: 'Destino', stops: '🛑 *PARADAS*', address: 'Endereço', date: 'Data', time: 'Horário', flight: 'Voo', passengers: 'Passageiros', paymentTitle: '💳 *PAGAMENTO*', status: 'Status', paid: '✅ *PAGO*', total: 'Valor Total', nextStepsTitle: '📱 *PRÓXIMOS PASOS:*', nextSteps1: 'Em breve você receberá as informações do motorista', nextSteps2: 'No dia da viagem, o motorista entrará em contato', nextSteps3: 'Guarde esta mensagem para referência', notesTitle: '📝 *Suas Observações:*', footer: 'Obrigado por escolher a TransferOnline! ✈️' },
      en: { confirmedTitle: '✅ *BOOKING CONFIRMED*', hello: 'Hello', confirmedBody: 'Your transfer booking has been confirmed successfully! 🚗', bookingLabel: 'Booking', routeOutbound: '📍 *OUTBOUND ROUTE*', routeReturn: '🔄 *RETURN ROUTE*', origin: 'Origin', destination: 'Destination', stops: '🛑 *STOPS*', address: 'Address', date: 'Date', time: 'Time', flight: 'Flight', passengers: 'Passengers', paymentTitle: '💳 *PAYMENT*', status: 'Status', paid: '✅ *PAID*', total: 'Total Amount', nextStepsTitle: '📱 *NEXT STEPS:*', nextSteps1: 'You will soon receive driver and vehicle information', nextSteps2: 'On the day of the trip, the driver will contact you', nextSteps3: 'Keep this message for reference', notesTitle: '📝 *Your Notes:*', footer: 'Thank you for choosing TransferOnline! ✈️' },
      es: { confirmedTitle: '✅ *RESERVA CONFIRMADA*', hello: 'Hola', confirmedBody: '¡Su reserva de traslado ha sido confirmada con éxito! 🚗', bookingLabel: 'Reserva', routeOutbound: '📍 *RUTA DE IDA*', routeReturn: '🔄 *RUTA DE REGRESO*', origin: 'Origen', destination: 'Destino', stops: '🛑 *PARADAS*', address: 'Dirección', date: 'Fecha', time: 'Horario', flight: 'Vuelo', passengers: 'Pasajeros', paymentTitle: '💳 *PAGO*', status: 'Estado', paid: '✅ *PAGADO*', total: 'Valor Total', nextStepsTitle: '📱 *PRÓXIMOS PASOS:*', nextSteps1: 'Pronto recibirá la información del conductor', nextSteps2: 'El día del viaje, el conductor se pondrá en contacto', nextSteps3: 'Guarde este mensaje para referencia', notesTitle: '📝 *Sus Observaciones:*', footer: '¡Gracias por elegir TransferOnline! ✈️' }
    };

    let message = '';
    const lang = bookingData.driver_language || 'pt';
    const t = translations[lang] || translations.pt;

    if (recipientType === 'customer') {
      message = `${t.confirmedTitle}\n\n${t.hello} *${bookingData.customer_name}*!\n\n${t.confirmedBody}\n\n━━━━━━━━━━━━━━━━━━━\n📋 *${t.bookingLabel}:* ${bookingData.booking_number || 'N/A'}\n━━━━━━━━━━━━━━━━━━━\n\n${t.routeOutbound}\n• ${t.origin}: ${bookingData.origin || '-'}\n`;
      
      if (bookingData.additional_stops && bookingData.additional_stops.length > 0) {
        message += `${t.stops || '🛑 *PARADAS*'}\n`;
        bookingData.additional_stops.forEach((stop, idx) => {
           const stopText = stop.address || stop.notes || '-';
           const stopNote = (stop.address && stop.notes) ? ` (${stop.notes})` : '';
           message += `• ${idx + 1}: ${stopText}${stopNote}\n`;
        });
      }
      
      message += `• ${t.destination}: ${bookingData.destination || '-'}\n`;
      if (bookingData.customer_address) message += `• ${t.address}: ${bookingData.customer_address}\n`;
      message += `• ${t.date}: ${formatDate(bookingData.date, lang)}\n• ${t.time}: ${bookingData.time || '-'}\n`;
      if (bookingData.flight_number) message += `• ${t.flight}: ${bookingData.flight_number}\n`;
      message += `• ${t.passengers}: ${bookingData.passengers || 1}\n\n`;

      if (bookingData.has_return) {
        message += `${t.routeReturn}\n• ${t.origin}: ${bookingData.return_origin || '-'}\n• ${t.destination}: ${bookingData.return_destination || '-'}\n• ${t.date}: ${formatDate(bookingData.return_date, lang)}\n• ${t.time}: ${bookingData.return_time || '-'}\n`;
        if (bookingData.return_flight_number) message += `• ${t.flight}: ${bookingData.return_flight_number}\n`;
        message += `\n`;
      }
      message += `${t.paymentTitle}\n• ${t.status}: ${t.paid}\n• ${t.total}: *${formatPrice(bookingData.total_price)}*\n\n${t.nextStepsTitle}\n• ${t.nextSteps1}\n• ${t.nextSteps2}\n• ${t.nextSteps3}\n\n`;
      if (bookingData.notes) message += `${t.notesTitle}\n${bookingData.notes}\n\n`;
      message += t.footer;
    } else if (recipientType === 'admin') {
      message = `🆕 *NOVA RESERVA RECEBIDA*\n\n━━━━━━━━━━━━━━━━━━━\n📋 *Reserva:* ${bookingData.booking_number || 'N/A'}\n━━━━━━━━━━━━━━━━━━━\n\n⚠️ *AÇÃO NECESSÁRIA:* Alocar motorista e veículo\n\n👤 *CLIENTE*\n• Nome: ${bookingData.customer_name || '-'}\n• Email: ${bookingData.customer_email || '-'}\n• Telefone: ${bookingData.customer_phone || '-'}\n• Passageiros: ${bookingData.passengers || 1}\n\n📍 *ROTA DE IDA*\n• Origem: ${bookingData.origin || '-'}\n`;
      
      // Adicionar paradas adicionais se existirem
      if (bookingData.additional_stops && bookingData.additional_stops.length > 0) {
        message += `🛑 *PARADAS INTERMEDIÁRIAS*\n`;
        bookingData.additional_stops.forEach((stop, idx) => {
           const stopText = stop.address || stop.notes || '-';
           const stopNote = (stop.address && stop.notes) ? ` (${stop.notes})` : '';
           message += `• ${idx + 1}: ${stopText}${stopNote}\n`;
        });
      }

      message += `• Destino: ${bookingData.destination || '-'}\n`;
      if (bookingData.customer_address) message += `• Endereço: ${bookingData.customer_address}\n`;
      message += `• Data: ${formatDate(bookingData.date)}\n• Horário: ${bookingData.time || '-'}\n`;
      if (bookingData.flight_number) message += `• Voo: ${bookingData.flight_number}\n`;
      message += `\n`;
      if (bookingData.has_return) {
        message += `🔄 *ROTA DE RETORNO*\n• Origem: ${bookingData.return_origin || '-'}\n• Destino: ${bookingData.return_destination || '-'}\n• Data: ${formatDate(bookingData.return_date)}\n• Horário: ${bookingData.return_time || '-'}\n`;
        if (bookingData.return_flight_number) message += `• Voo: ${bookingData.return_flight_number}\n`;
        message += `\n`;
      }
      if (bookingData.notes) message += `📝 *Observações do Cliente:*\n${bookingData.notes}\n\n`;
      message += `💰 *VALOR DA RESERVA*\n• Total: *${formatPrice(bookingData.total_price)}*\n• Status: ✅ *PAGO*`;
    }

    console.log("Enviando WhatsApp para:", phoneNumber);

    const whatsappResponse = await base44.asServiceRole.functions.invoke('sendWhatsAppMessage', {
      to: phoneNumber,
      message
    });
    const whatsappData = whatsappResponse?.data || whatsappResponse || {};

    if (whatsappData.success === false) {
      return Response.json(
        {
          success: false,
          error: whatsappData.error || 'Erro ao enviar WhatsApp',
          original_phone: whatsappData.original_phone || phoneNumber,
          normalized_phone: whatsappData.normalized_phone || null,
          e164_phone: whatsappData.e164_phone || null,
          provider_status: whatsappData.provider_status || null,
          provider_response: whatsappData.provider_response || null,
          attempt_count: whatsappData.attempt_count || null
        },
        { status: whatsappData.provider_status || 500 }
      );
    }

    return Response.json({ 
      success: true, 
      message: 'WhatsApp enviado com sucesso',
      original_phone: whatsappData.original_phone || phoneNumber,
      normalized_phone: whatsappData.normalized_phone || null,
      e164_phone: whatsappData.e164_phone || null,
      attempt_count: whatsappData.attempt_count || null
    });

  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
    return Response.json(
      {
        success: false,
        error: error?.response?.data?.error || error.message || 'Erro ao enviar WhatsApp',
        original_phone: error?.response?.data?.original_phone || null,
        normalized_phone: error?.response?.data?.normalized_phone || null,
        e164_phone: error?.response?.data?.e164_phone || null,
        provider_status: error?.response?.data?.provider_status || null,
        provider_response: error?.response?.data?.provider_response || null,
        attempt_count: error?.response?.data?.attempt_count || null
      },
      { status: error?.response?.data?.provider_status || 500 }
    );
  }
});