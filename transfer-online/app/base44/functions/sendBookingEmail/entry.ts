import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Resend } from 'npm:resend';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const requestBody = await req.json();
    const { bookingId, recipientType, emailType, refundReason, paymentUrl } = requestBody;

    console.log("sendBookingEmail chamado com:", { bookingId, recipientType, emailType, refundReason, paymentUrl });

    if (!bookingId || !recipientType || !emailType) {
      console.error("Parâmetros faltando:", { bookingId, recipientType, emailType });
      return Response.json(
        { error: 'Parâmetros obrigatórios: bookingId, recipientType, emailType' },
        { status: 400 }
      );
    }

    // Buscar dados da reserva usando service role
    console.log("Buscando reserva com ID:", bookingId);
    const bookings = await base44.asServiceRole.entities.Booking.list();
    const bookingData = bookings.find(b => b.id === bookingId);

    if (!bookingData) {
      console.error("Reserva não encontrada:", bookingId);
      return Response.json(
        { error: 'Reserva não encontrada' },
        { status: 404 }
      );
    }

    console.log("Reserva encontrada:", bookingData.booking_number);

    // Buscar configurações do app
    const configs = await base44.asServiceRole.entities.AppConfig.list();
    const adminEmailConfig = configs.find(c => c.config_key === 'admin_notification_email');
    const adminEmail = adminEmailConfig?.config_value;

    console.log("Admin email configurado:", adminEmail);

    // Função auxiliar para formatar preço
    const formatPrice = (price) => {
      if (!price || isNaN(price)) return 'R$ 0,00';
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(price);
    };

    // Função auxiliar para formatar data
    const formatDate = (dateString, lang = 'pt') => {
      if (!dateString) return 'Data não informada';
      try {
        const date = new Date(dateString);
        const locales = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };
        return date.toLocaleDateString(locales[lang] || 'pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
      } catch (e) {
        return dateString;
      }
    };

    // Dicionário de Traduções
    const translations = {
      pt: {
        confirmedTitle: '✓ Reserva Confirmada!',
        confirmedSubtitle: 'Seu transfer foi agendado com sucesso',
        bookingLabel: 'Reserva',
        hello: 'Olá',
        confirmedBody: 'Sua reserva de transfer foi confirmada e o pagamento processado com sucesso! Abaixo seguem os detalhes da sua viagem:',
        routeOutbound: '📍 Rota de Ida',
        routeReturn: '🔄 Rota de Retorno',
        origin: 'Origem',
        destination: 'Destino',
        address: 'Endereço',
        date: 'Data',
        time: 'Horário',
        flight: 'Voo',
        passengers: 'Passageiros',
        paymentDetails: '💳 Detalhes do Pagamento',
        status: 'Status',
        paid: '✓ PAGO',
        total: 'Total',
        nextStepsTitle: '📱 Próximos Passos:',
        nextSteps1: 'Em breve você receberá as informações do motorista e do veículo (incluindo modelo, cor e placa)',
        nextSteps2: 'No dia da viagem, o motorista entrará em contato através do número',
        nextSteps3: 'Guarde este e-mail para referência',
        nextSteps4: 'Possíveis alterações podem ser realizadas através do WhatsApp +55 (11) 5102-3892',
        notesTitle: '📝 Suas Observações',
        footerText: 'Obrigado por escolher a TransferOnline!<br>Tenha uma excelente viagem! ✈️',
        cancelledTitle: '❌ Reserva Cancelada',
        cancelledSubtitle: 'Sua reserva foi cancelada e o valor será reembolsado',
        cancelledBody: 'Informamos que sua reserva de transfer foi cancelada.',
        reason: 'Motivo',
        refundText: 'Pedimos desculpas pelo transtorno e o valor pago será reembolsado integralmente.',
        refundProcessed: '💳 Reembolso Processado',
        refundNote: 'O valor será estornado no seu cartão de crédito em até 5-10 dias úteis',
        cancelledDetails: '📋 Detalhes da Reserva Cancelada',
        type: 'Tipo',
        roundTrip: 'Ida e Volta',
        importantInfo: 'ℹ️ Informações Importantes:',
        refundInfo1: 'O reembolso foi processado com sucesso na operadora de cartão',
        refundInfo2: 'O prazo para o estorno aparecer na sua fatura é de 5 a 10 dias úteis',
        refundInfo3: 'Caso tenha dúvidas, entre em contato conosco',
        refundInfo4: 'Você pode fazer uma nova reserva a qualquer momento em nosso site',
        cancelledFooter: 'Agradecemos a compreensão e esperamos servi-lo novamente em breve.<br>Equipe TransferOnline 🚗',
        paymentPendingTitle: '⏳ Pagamento Pendente',
        paymentPendingSubtitle: 'Finalize sua reserva em poucos cliques',
        paymentPendingBody: 'Notamos que você iniciou uma reserva conosco, mas o pagamento ainda não foi concluído. Não se preocupe, sua reserva está guardada e você pode finalizar o pagamento agora mesmo!',
        payNow: '💳 Finalizar Pagamento Agora',
        paymentAction: '⚡ Ação Necessária:',
        paymentActionText: 'Para garantir sua reserva, por favor complete o pagamento o mais breve possível. Após o pagamento, você receberá um e-mail de confirmação com todos os detalhes.',
        bookingDetails: '📋 Detalhes da Sua Reserva',
        totalValue: '💰 Valor Total',
        paymentLinkNote: 'Caso o botão acima não funcione, copie e cole este link no seu navegador:',
        supportText: 'Estamos à disposição para qualquer dúvida!<br>Equipe TransferOnline 🚗'
      },
      en: {
        confirmedTitle: '✓ Booking Confirmed!',
        confirmedSubtitle: 'Your transfer has been scheduled successfully',
        bookingLabel: 'Booking',
        hello: 'Hello',
        confirmedBody: 'Your transfer booking has been confirmed and the payment processed successfully! Below are your trip details:',
        routeOutbound: '📍 Outbound Route',
        routeReturn: '🔄 Return Route',
        origin: 'Origin',
        destination: 'Destination',
        address: 'Address',
        date: 'Date',
        time: 'Time',
        flight: 'Flight',
        passengers: 'Passengers',
        paymentDetails: '💳 Payment Details',
        status: 'Status',
        paid: '✓ PAID',
        total: 'Total',
        nextStepsTitle: '📱 Next Steps:',
        nextSteps1: 'You will soon receive driver and vehicle information (including model, color, and plate)',
        nextSteps2: 'On the day of the trip, the driver will contact you via the number',
        nextSteps3: 'Keep this email for reference',
        nextSteps4: 'Possible changes can be made via WhatsApp +55 (11) 5102-3892',
        notesTitle: '📝 Your Notes',
        footerText: 'Thank you for choosing TransferOnline!<br>Have a great trip! ✈️',
        cancelledTitle: '❌ Booking Cancelled',
        cancelledSubtitle: 'Your booking has been cancelled and the amount will be refunded',
        cancelledBody: 'We inform you that your transfer booking has been cancelled.',
        reason: 'Reason',
        refundText: 'We apologize for the inconvenience and the amount paid will be fully refunded.',
        refundProcessed: '💳 Refund Processed',
        refundNote: 'The amount will be refunded to your credit card within 5-10 business days',
        cancelledDetails: '📋 Cancelled Booking Details',
        type: 'Type',
        roundTrip: 'Round Trip',
        importantInfo: 'ℹ️ Important Information:',
        refundInfo1: 'The refund was successfully processed with the card operator',
        refundInfo2: 'The deadline for the refund to appear on your invoice is 5 to 10 business days',
        refundInfo3: 'If you have questions, please contact us',
        refundInfo4: 'You can make a new booking at any time on our website',
        cancelledFooter: 'We appreciate your understanding and hope to serve you again soon.<br>TransferOnline Team 🚗',
        paymentPendingTitle: '⏳ Payment Pending',
        paymentPendingSubtitle: 'Finish your booking in a few clicks',
        paymentPendingBody: 'We noticed you started a booking with us, but the payment has not yet been completed. Don\'t worry, your booking is saved and you can finish the payment right now!',
        payNow: '💳 Finish Payment Now',
        paymentAction: '⚡ Action Required:',
        paymentActionText: 'To guarantee your booking, please complete the payment as soon as possible. After payment, you will receive a confirmation email with all details.',
        bookingDetails: '📋 Your Booking Details',
        totalValue: '💰 Total Value',
        paymentLinkNote: 'If the button above does not work, copy and paste this link into your browser:',
        supportText: 'We are available for any questions!<br>TransferOnline Team 🚗'
      },
      es: {
        confirmedTitle: '✓ ¡Reserva Confirmada!',
        confirmedSubtitle: 'Su traslado ha sido programado con éxito',
        bookingLabel: 'Reserva',
        hello: 'Hola',
        confirmedBody: '¡Su reserva de traslado ha sido confirmada y el pago procesado con éxito! A continuación, los detalles de su viaje:',
        routeOutbound: '📍 Ruta de Ida',
        routeReturn: '🔄 Ruta de Regreso',
        origin: 'Origen',
        destination: 'Destino',
        address: 'Dirección',
        date: 'Fecha',
        time: 'Horario',
        flight: 'Vuelo',
        passengers: 'Pasajeros',
        paymentDetails: '💳 Detalles del Pago',
        status: 'Estado',
        paid: '✓ PAGADO',
        total: 'Total',
        nextStepsTitle: '📱 Próximos Pasos:',
        nextSteps1: 'Pronto recibirá la información del conductor y del vehículo (incluyendo modelo, color y placa)',
        nextSteps2: 'El día del viaje, el conductor se pondrá en contacto a través del número',
        nextSteps3: 'Guarde este correo electrónico para referencia',
        nextSteps4: 'Los posibles cambios pueden realizarse a través de WhatsApp +55 (11) 5102-3892',
        notesTitle: '📝 Sus Observaciones',
        footerText: '¡Gracias por elegir TransferOnline!<br>¡Tenga un excelente viaje! ✈️',
        cancelledTitle: '❌ Reserva Cancelada',
        cancelledSubtitle: 'Su reserva ha sido cancelada y el valor será reembolsado',
        cancelledBody: 'Le informamos que su reserva de traslado ha sido cancelada.',
        reason: 'Motivo',
        refundText: 'Pedimos disculpas por las molestias y el valor pagado será reembolsado integralmente.',
        refundProcessed: '💳 Reembolso Procesado',
        refundNote: 'El valor será reembolsado en su tarjeta de crédito dentro de 5-10 días hábiles',
        cancelledDetails: '📋 Detalles de la Reserva Cancelada',
        type: 'Tipo',
        roundTrip: 'Ida y Vuelta',
        importantInfo: 'ℹ️ Información Importante:',
        refundInfo1: 'El reembolso fue procesado con éxito en la operadora de tarjeta',
        refundInfo2: 'El plazo para que el reembolso aparezca en su factura es de 5 a 10 días hábiles',
        refundInfo3: 'Si tiene dudas, contáctenos',
        refundInfo4: 'Puede hacer una nueva reserva en cualquier momento en nuestro sitio web',
        cancelledFooter: 'Agradecemos su comprensión y esperamos servirle nuevamente pronto.<br>Equipo TransferOnline 🚗',
        paymentPendingTitle: '⏳ Pago Pendiente',
        paymentPendingSubtitle: 'Finalice su reserva en pocos clics',
        paymentPendingBody: 'Notamos que inició una reserva con nosotros, pero el pago aún no se ha completado. ¡No se preocupe, su reserva está guardada y puede finalizar el pago ahora mismo!',
        payNow: '💳 Finalizar Pago Ahora',
        paymentAction: '⚡ Acción Necesaria:',
        paymentActionText: 'Para garantizar su reserva, por favor complete el pago lo antes posible. Después del pago, recibirá un correo electrónico de confirmación con todos los detalles.',
        bookingDetails: '📋 Detalles de Su Reserva',
        totalValue: '💰 Valor Total',
        paymentLinkNote: 'Si el botón de arriba no funciona, copie y pegue este enlace en su navegador:',
        supportText: '¡Estamos a disposición para cualquier duda!<br>Equipo TransferOnline 🚗'
      }
    };

    let subject = '';
    let emailBody = '';
    let toEmail = '';

    // Definir idioma do cliente
    const rawLanguage = bookingData.booking_language || bookingData.customer_language || bookingData.driver_language || 'pt';
    const lang = rawLanguage === 'pt-BR' ? 'pt' : rawLanguage;
    const t = translations[lang] || translations.pt;

    // Construir e-mail baseado no tipo
    if (recipientType === 'customer' && emailType === 'confirmation') {
      toEmail = bookingData.customer_email;
      
      if (!toEmail) {
        console.error("E-mail do cliente não encontrado na reserva");
        return Response.json(
          { error: 'E-mail do cliente não encontrado na reserva' },
          { status: 400 }
        );
      }

      subject = `${t.confirmedTitle} ${bookingData.booking_number || ''} - TransferOnline`;
      
      emailBody = `
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
            .section { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
            .section h2 { color: #2563eb; margin-top: 0; font-size: 18px; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .info-label { font-weight: bold; color: #6b7280; }
            .info-value { color: #111827; }
            .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
            .total-price { font-size: 32px; color: #2563eb; font-weight: bold; text-align: center; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${t.confirmedTitle}</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">${t.confirmedSubtitle}</p>
            </div>
            
            <div class="content">
              ${bookingData.booking_number ? `<div class="booking-number">${t.bookingLabel}: ${bookingData.booking_number}</div>` : ''}

              <p>${t.hello} <strong>${bookingData.customer_name || 'Cliente'}</strong>,</p>
              <p>${t.confirmedBody}</p>

              <div class="section">
                <h2>${t.routeOutbound}</h2>
                <div class="info-row">
                  <span class="info-label">${t.origin}:</span>
                  <span class="info-value">${bookingData.origin || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">${t.destination}:</span>
                  <span class="info-value">${bookingData.destination || '-'}</span>
                </div>
                ${bookingData.customer_address ? `
                <div class="info-row">
                  <span class="info-label">${t.address}:</span>
                  <span class="info-value">${bookingData.customer_address}</span>
                </div>
                ` : ''}
                <div class="info-row">
                  <span class="info-label">${t.date}:</span>
                  <span class="info-value">${formatDate(bookingData.date, lang)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">${t.time}:</span>
                  <span class="info-value">${bookingData.time || '-'}</span>
                </div>
                ${bookingData.flight_number ? `
                <div class="info-row">
                  <span class="info-label">${t.flight}:</span>
                  <span class="info-value">${bookingData.flight_number}</span>
                </div>
                ` : ''}
                <div class="info-row">
                  <span class="info-label">${t.passengers}:</span>
                  <span class="info-value">${bookingData.passengers || 1}</span>
                </div>
              </div>

              ${bookingData.has_return ? `
              <div class="section">
                <h2>${t.routeReturn}</h2>
                <div class="info-row">
                  <span class="info-label">${t.origin}:</span>
                  <span class="info-value">${bookingData.return_origin || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">${t.destination}:</span>
                  <span class="info-value">${bookingData.return_destination || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">${t.date}:</span>
                  <span class="info-value">${formatDate(bookingData.return_date, lang)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">${t.time}:</span>
                  <span class="info-value">${bookingData.return_time || '-'}</span>
                </div>
                ${bookingData.return_flight_number ? `
                <div class="info-row">
                  <span class="info-label">${t.flight}:</span>
                  <span class="info-value">${bookingData.return_flight_number}</span>
                </div>
                ` : ''}
              </div>
              ` : ''}

              <div class="section">
                <h2>${t.paymentDetails}</h2>
                <div class="info-row">
                  <span class="info-label">${t.status}:</span>
                  <span class="info-value" style="color: #10b981; font-weight: bold;">${t.paid}</span>
                </div>
                <div class="total-price">
                  ${t.total}: ${formatPrice(bookingData.total_price)}
                </div>
              </div>

              <div class="highlight">
                <strong>${t.nextStepsTitle}</strong>
                <ul style="margin: 10px 0;">
                  <li>${t.nextSteps1}</li>
                  <li>${t.nextSteps2} ${bookingData.customer_phone || '-'}</li>
                  <li>${t.nextSteps3}</li>
                  <li>${t.nextSteps4}</li>
                </ul>
              </div>

              ${bookingData.notes ? `
              <div class="section">
                <h2>${t.notesTitle}</h2>
                <p>${bookingData.notes}</p>
              </div>
              ` : ''}

              <p style="text-align: center; margin-top: 30px;">
                ${t.footerText}
              </p>
            </div>

            <div class="footer">
              <p>TransferOnline - Sistema de Reservas de Transfer</p>
              <p>Este é um e-mail automático, não responda.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if ((recipientType === 'admin' || recipientType === 'supplier') && emailType === 'new_booking_notification') {
      let supplierData = null;

      if (recipientType === 'admin') {
        if (!adminEmail) {
          console.warn("E-mail do administrador não configurado, pulando envio");
          return Response.json(
            { success: true, message: 'E-mail do administrador não configurado, envio pulado' }
          );
        }
        toEmail = adminEmail;
      } else {
        if (!bookingData.supplier_id) {
          return Response.json(
            { error: 'Reserva sem fornecedor vinculado para notificação' },
            { status: 400 }
          );
        }

        const suppliers = await base44.asServiceRole.entities.Supplier.list();
        supplierData = suppliers.find((supplier) => supplier.id === bookingData.supplier_id);

        if (!supplierData?.email) {
          return Response.json(
            { error: 'E-mail do fornecedor não encontrado' },
            { status: 400 }
          );
        }

        toEmail = supplierData.email;
      }

      const notificationTitle = recipientType === 'admin' ? '🆕 Nova Reserva Recebida' : '🆕 Nova Reserva Direcionada ao Fornecedor';
      const notificationSubtitle = recipientType === 'admin'
        ? 'Uma nova reserva foi confirmada no sistema'
        : 'Uma nova reserva da NovaReserva foi associada ao seu fornecedor';
      const actionText = recipientType === 'admin'
        ? 'Uma nova reserva foi confirmada e paga. Providencie a alocação de motorista e veículo.'
        : 'Uma nova reserva foi confirmada e vinculada ao seu fornecedor. Revise os dados e prepare a operação.';
      const footerText = recipientType === 'admin'
        ? 'Acesse o painel administrativo para gerenciar esta reserva'
        : 'Acesse o portal do fornecedor para revisar a nova reserva';

      subject = `${recipientType === 'admin' ? '🆕 Nova Reserva' : '🆕 Nova Reserva para Operação'} ${bookingData.booking_number || ''} - TransferOnline`;
      
      emailBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .booking-number { background: #10b981; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; border-radius: 8px; margin: 20px 0; }
            .section { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #f59e0b; }
            .section h2 { color: #f59e0b; margin-top: 0; font-size: 18px; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .info-label { font-weight: bold; color: #6b7280; }
            .info-value { color: #111827; }
            .total-price { font-size: 32px; color: #f59e0b; font-weight: bold; text-align: center; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .alert { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${notificationTitle}</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">${notificationSubtitle}</p>
            </div>
            
            <div class="content">
              ${bookingData.booking_number ? `<div class="booking-number">Reserva: ${bookingData.booking_number}</div>` : ''}

              <div class="alert">
                <strong>⏰ Ação Necessária:</strong> ${actionText}
              </div>

              ${recipientType === 'supplier' && supplierData ? `
              <div class="section">
                <h2>🏢 Dados do Fornecedor</h2>
                <div class="info-row">
                  <span class="info-label">Fornecedor:</span>
                  <span class="info-value">${supplierData.name || supplierData.company_name || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Contato:</span>
                  <span class="info-value">${supplierData.contact_name || '-'}</span>
                </div>
              </div>
              ` : ''}

              <div class="section">
                <h2>👤 Dados do Cliente</h2>
                <div class="info-row">
                  <span class="info-label">Nome:</span>
                  <span class="info-value">${bookingData.customer_name || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">E-mail:</span>
                  <span class="info-value">${bookingData.customer_email || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Telefone:</span>
                  <span class="info-value">${bookingData.customer_phone || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Passageiros:</span>
                  <span class="info-value">${bookingData.passengers || 1}</span>
                </div>
              </div>

              <div class="section">
                <h2>📍 Rota de Ida</h2>
                <div class="info-row">
                  <span class="info-label">Origem:</span>
                  <span class="info-value">${bookingData.origin || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Destino:</span>
                  <span class="info-value">${bookingData.destination || '-'}</span>
                </div>
                ${bookingData.customer_address ? `
                <div class="info-row">
                  <span class="info-label">Endereço:</span>
                  <span class="info-value">${bookingData.customer_address}</span>
                </div>
                ` : ''}
                <div class="info-row">
                  <span class="info-label">Data:</span>
                  <span class="info-value">${formatDate(bookingData.date)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Horário:</span>
                  <span class="info-value">${bookingData.time || '-'}</span>
                </div>
                ${bookingData.flight_number ? `
                <div class="info-row">
                  <span class="info-label">Voo:</span>
                  <span class="info-value">${bookingData.flight_number}</span>
                </div>
                ` : ''}
              </div>

              ${bookingData.has_return ? `
              <div class="section">
                <h2>🔄 Rota de Retorno</h2>
                <div class="info-row">
                  <span class="info-label">Origem:</span>
                  <span class="info-value">${bookingData.return_origin || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Destino:</span>
                  <span class="info-value">${bookingData.return_destination || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Data:</span>
                  <span class="info-value">${formatDate(bookingData.return_date)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Horário:</span>
                  <span class="info-value">${bookingData.return_time || '-'}</span>
                </div>
                ${bookingData.return_flight_number ? `
                <div class="info-row">
                  <span class="info-label">Voo:</span>
                  <span class="info-value">${bookingData.return_flight_number}</span>
                </div>
                ` : ''}
              </div>
              ` : ''}

              ${bookingData.notes ? `
              <div class="section">
                <h2>📝 Observações do Cliente</h2>
                <p>${bookingData.notes}</p>
              </div>
              ` : ''}

              <div class="section">
                <h2>💰 Valor da Reserva</h2>
                <div class="total-price">
                  ${formatPrice(bookingData.total_price)}
                </div>
                <div class="info-row">
                  <span class="info-label">Status do Pagamento:</span>
                  <span class="info-value" style="color: #10b981; font-weight: bold;">✓ PAGO</span>
                </div>
              </div>

              <p style="text-align: center; margin-top: 30px; color: #6b7280;">
                ${footerText}
              </p>
            </div>

            <div class="footer">
              <p>TransferOnline - Sistema de Reservas de Transfer</p>
              <p>Este é um e-mail automático de notificação operacional.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (recipientType === 'customer' && emailType === 'cancellation_refund') {
      // NOVO: E-mail de cancelamento com reembolso
      toEmail = bookingData.customer_email;
      
      if (!toEmail) {
        console.error("E-mail do cliente não encontrado na reserva");
        return Response.json(
          { error: 'E-mail do cliente não encontrado na reserva' },
          { status: 400 }
        );
      }

      subject = `${t.cancelledTitle} - ${bookingData.booking_number || ''} - TransferOnline`;
      
      emailBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .booking-number { background: #ef4444; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; border-radius: 8px; margin: 20px 0; }
            .section { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #ef4444; }
            .section h2 { color: #ef4444; margin-top: 0; font-size: 18px; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .info-label { font-weight: bold; color: #6b7280; }
            .info-value { color: #111827; }
            .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
            .refund-box { background: #dcfce7; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; text-align: center; }
            .refund-amount { font-size: 32px; color: #10b981; font-weight: bold; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${t.cancelledTitle}</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">${t.cancelledSubtitle}</p>
            </div>
            
            <div class="content">
              ${bookingData.booking_number ? `<div class="booking-number">${t.bookingLabel}: ${bookingData.booking_number}</div>` : ''}

              <p>${t.hello} <strong>${bookingData.customer_name || 'Cliente'}</strong>,</p>
              <p>${t.cancelledBody} ${refundReason ? `<strong>${t.reason}:</strong> ${refundReason}` : ''}</p>
              <p>${t.refundText}</p>

              <div class="refund-box">
                <h3 style="margin: 0 0 10px 0; color: #10b981;">${t.refundProcessed}</h3>
                <div class="refund-amount">
                  ${formatPrice(bookingData.total_price)}
                </div>
                <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
                  ${t.refundNote}
                </p>
              </div>

              <div class="section">
                <h2>${t.cancelledDetails}</h2>
                <div class="info-row">
                  <span class="info-label">${t.origin}:</span>
                  <span class="info-value">${bookingData.origin || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">${t.destination}:</span>
                  <span class="info-value">${bookingData.destination || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">${t.date}:</span>
                  <span class="info-value">${formatDate(bookingData.date, lang)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">${t.time}:</span>
                  <span class="info-value">${bookingData.time || '-'}</span>
                </div>
                ${bookingData.has_return ? `
                <div class="info-row">
                  <span class="info-label">${t.type}:</span>
                  <span class="info-value">${t.roundTrip}</span>
                </div>
                ` : ''}
              </div>

              <div class="highlight">
                <strong>${t.importantInfo}</strong>
                <ul style="margin: 10px 0;">
                  <li>${t.refundInfo1}</li>
                  <li>${t.refundInfo2}</li>
                  <li>${t.refundInfo3}</li>
                  <li>${t.refundInfo4}</li>
                </ul>
              </div>

              <p style="text-align: center; margin-top: 30px;">
                ${t.cancelledFooter}
              </p>
            </div>

            <div class="footer">
              <p>TransferOnline - Sistema de Reservas de Transfer</p>
              <p>Este é um e-mail automático, mas você pode responder caso tenha dúvidas.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (recipientType === 'customer' && emailType === 'payment_link_resend') {
      // NOVO: E-mail de reenvio de link de pagamento
      toEmail = bookingData.customer_email;
      
      if (!toEmail) {
        console.error("E-mail do cliente não encontrado na reserva");
        return Response.json(
          { error: 'E-mail do cliente não encontrado na reserva' },
          { status: 400 }
        );
      }

      if (!paymentUrl) {
        console.error("URL de pagamento não fornecida");
        return Response.json(
          { error: 'URL de pagamento é obrigatória para este tipo de e-mail' },
          { status: 400 }
        );
      }

      subject = `${t.paymentPendingTitle} - ${bookingData.booking_number || ''} - TransferOnline`;
      
      emailBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .booking-number { background: #3b82f6; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; border-radius: 8px; margin: 20px 0; }
            .section { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #f59e0b; }
            .section h2 { color: #f59e0b; margin-top: 0; font-size: 18px; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .info-label { font-weight: bold; color: #6b7280; }
            .info-value { color: #111827; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 18px 40px; border-radius: 12px; font-weight: bold; font-size: 18px; margin: 20px 0; text-align: center; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3); }
            .cta-button:hover { background: linear-gradient(135deg, #059669 0%, #047857 100%); }
            .total-price { font-size: 32px; color: #3b82f6; font-weight: bold; text-align: center; margin: 20px 0; }
            .alert { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${t.paymentPendingTitle}</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">${t.paymentPendingSubtitle}</p>
            </div>
            
            <div class="content">
              ${bookingData.booking_number ? `<div class="booking-number">${t.bookingLabel}: ${bookingData.booking_number}</div>` : ''}

              <p>${t.hello} <strong>${bookingData.customer_name || 'Cliente'}</strong>,</p>
              <p>${t.paymentPendingBody}</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${paymentUrl}" class="cta-button">
                  ${t.payNow}
                </a>
              </div>

              <div class="alert">
                <strong>${t.paymentAction}</strong> ${t.paymentActionText}
              </div>

              <div class="section">
                <h2>${t.bookingDetails}</h2>
                <div class="info-row">
                  <span class="info-label">${t.origin}:</span>
                  <span class="info-value">${bookingData.origin || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">${t.destination}:</span>
                  <span class="info-value">${bookingData.destination || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">${t.date}:</span>
                  <span class="info-value">${formatDate(bookingData.date, lang)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">${t.time}:</span>
                  <span class="info-value">${bookingData.time || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">${t.passengers}:</span>
                  <span class="info-value">${bookingData.passengers || 1}</span>
                </div>
                ${bookingData.has_return ? `
                <div class="info-row">
                  <span class="info-label">${t.type}:</span>
                  <span class="info-value">${t.roundTrip}</span>
                </div>
                ` : ''}
              </div>

              <div class="section">
                <h2>${t.totalValue}</h2>
                <div class="total-price">
                  ${formatPrice(bookingData.total_price)}
                </div>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <p style="font-size: 14px; color: #6b7280;">
                  ${t.paymentLinkNote}
                </p>
                <p style="font-size: 12px; color: #9ca3af; word-break: break-all;">
                  ${paymentUrl}
                </p>
              </div>

              <p style="text-align: center; margin-top: 30px; color: #6b7280;">
                ${t.supportText}
              </p>
            </div>

            <div class="footer">
              <p>TransferOnline - Sistema de Reservas de Transfer</p>
              <p>Este é um e-mail automático, mas você pode responder caso tenha dúvidas.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      console.error("Combinação inválida:", { recipientType, emailType });
      return Response.json(
        { error: 'Combinação inválida de recipientType e emailType' },
        { status: 400 }
      );
    }

    // Enviar e-mail usando Resend com domínio verificado
    console.log("Enviando e-mail para:", toEmail);
    
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        const fromAddress = Deno.env.get('RESEND_FROM') || 'TransferOnline <nao-responda@enviotransferonline.com.br>';
        
        await resend.emails.send({
            from: fromAddress,
            to: [toEmail],
            subject: subject,
            html: emailBody
        });
        console.log("E-mail enviado com sucesso via Resend!");
    } else {
        console.warn("RESEND_API_KEY não configurada, usando integração Core (fallback)");
        await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'TransferOnline',
            to: toEmail,
            subject: subject,
            body: emailBody
        });
        console.log("E-mail enviado com sucesso via Core!");
    }

    // Enviar WhatsApp após e-mail
    if (recipientType === 'customer' && emailType === 'confirmation') {
      try {
        console.log("Tentando enviar WhatsApp para o cliente também...");
        await base44.asServiceRole.functions.invoke('sendWhatsAppBookingNotification', {
          bookingId: bookingId,
          recipientType: recipientType
        });
        console.log("WhatsApp do cliente enviado com sucesso!");
      } catch (whatsappError) {
        console.error('Erro ao enviar WhatsApp do cliente (não crítico):', whatsappError);
      }
    }

    if (recipientType === 'admin' && emailType === 'new_booking_notification') {
      try {
        console.log("Enviando WhatsApp do gestor via template...");
        await base44.asServiceRole.functions.invoke('sendAdminBookingWhatsAppTemplate', {
          bookingId: bookingId
        });
        console.log("WhatsApp do gestor enviado com sucesso via template!");
      } catch (whatsappError) {
        console.error('Erro ao enviar WhatsApp do gestor via template (não crítico):', whatsappError);
      }
    }

    return Response.json({ 
      success: true, 
      message: 'E-mail enviado com sucesso',
      sentTo: toEmail 
    });

  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    console.error('Stack trace:', error.stack);
    return Response.json(
      { error: error.message || 'Erro ao enviar e-mail', details: error.stack },
      { status: 500 }
    );
  }
});