import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@14.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  console.log("=== Stripe Webhook Handler INICIADO ===");
  
  try {
    // Obter o corpo da requisição como texto (necessário para validação da assinatura)
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    console.log("Stripe Signature recebida:", signature ? "Presente" : "Ausente");

    if (!signature) {
      console.error("Assinatura do webhook ausente");
      return Response.json(
        { error: 'Assinatura do webhook ausente' },
        { status: 400 }
      );
    }

    // Validar a assinatura do webhook
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET não configurado");
      return Response.json(
        { error: 'Webhook secret não configurado' },
        { status: 500 }
      );
    }

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
      console.log("Evento do Stripe validado com sucesso:", event.type);
    } catch (err) {
      console.error('Erro ao validar assinatura do webhook:', err.message);
      return Response.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);

    // Processar evento de pagamento bem-sucedido
    if (event.type === 'checkout.session.completed' || event.type === 'payment_link.payment_completed') {
      console.log("Processando evento de pagamento concluído");
      
      const session = event.data.object;
      console.log("Sessão de pagamento:", session.id);
      console.log("Metadados:", session.metadata);

      // Verificar se é um pagamento de cotação
      if (session.metadata?.type === 'quote_payment') {
        const quoteRequestId = session.metadata.quote_request_id;
        const quoteNumber = session.metadata.quote_number;

        console.log("Pagamento de cotação detectado:", quoteNumber);

        if (!quoteRequestId) {
          console.error("quote_request_id não encontrado nos metadados");
          return Response.json({ received: true });
        }

        // Buscar a cotação
        const quoteRequests = await base44.asServiceRole.entities.QuoteRequest.list();
        const quoteRequest = quoteRequests.find(q => q.id === quoteRequestId);

        if (!quoteRequest) {
          console.error("Cotação não encontrada:", quoteRequestId);
          return Response.json({ received: true });
        }

        console.log("Cotação encontrada:", quoteRequest.quote_number);

        // Gerar número de reserva
        const bookingNumberResponse = await base44.asServiceRole.functions.invoke('generateBookingNumber');
        const bookingNumber = bookingNumberResponse.data.bookingNumber;

        console.log("Número de reserva gerado:", bookingNumber);

        // Criar a reserva a partir da cotação
        const bookingData = {
          booking_number: bookingNumber,
          service_type: quoteRequest.service_type,
          vehicle_type_id: quoteRequest.vehicle_type_id,
          vehicle_type_name: quoteRequest.vehicle_type_name,
          driver_language: quoteRequest.driver_language,
          origin: quoteRequest.origin,
          destination: quoteRequest.destination,
          date: quoteRequest.date,
          time: quoteRequest.time,
          return_date: quoteRequest.return_date,
          return_time: quoteRequest.return_time,
          hours: quoteRequest.hours,
          distance_km: quoteRequest.distance_km,
          duration_minutes: quoteRequest.duration_minutes,
          passengers: quoteRequest.passengers,
          customer_name: quoteRequest.customer_name,
          customer_email: quoteRequest.customer_email,
          customer_phone: quoteRequest.customer_phone,
          notes: quoteRequest.notes,
          total_price: quoteRequest.admin_quote_price,
          has_return: quoteRequest.service_type === 'round_trip',
          status: 'confirmada',
          payment_status: 'pago',
          payment_intent_id: session.payment_intent || session.id
        };

        console.log("Criando reserva com os dados da cotação...");
        const booking = await base44.asServiceRole.entities.Booking.create(bookingData);
        console.log("Reserva criada com sucesso:", booking.id);

        // Atualizar a cotação para status "convertido"
        await base44.asServiceRole.entities.QuoteRequest.update(quoteRequestId, {
          status: 'convertido',
          booking_id: booking.id,
          converted_at: new Date().toISOString()
        });
        console.log("Cotação atualizada para status 'convertido'");

        // Enviar notificações por e-mail
        try {
          console.log("Enviando e-mail de confirmação...");
          await base44.asServiceRole.functions.invoke('sendBookingEmail', {
            bookingId: booking.id
          });
          console.log("E-mail de confirmação enviado com sucesso");
        } catch (emailError) {
          console.error('Erro ao enviar e-mail de confirmação:', emailError);
        }

        // Enviar notificações por WhatsApp
        try {
          console.log("Enviando WhatsApp para o cliente...");
          await base44.asServiceRole.functions.invoke('sendWhatsAppBookingNotification', {
            bookingId: booking.id,
            recipientType: 'customer'
          });
          console.log("WhatsApp para cliente enviado");
        } catch (whatsappError) {
          console.error('Erro ao enviar WhatsApp para cliente:', whatsappError);
        }

        try {
          console.log("Enviando WhatsApp para o gestor via template...");
          await base44.asServiceRole.functions.invoke('sendAdminBookingWhatsAppTemplate', {
            bookingId: booking.id
          });
          console.log("WhatsApp para gestor enviado via template");
        } catch (whatsappError) {
          console.error('Erro ao enviar WhatsApp para gestor via template:', whatsappError);
        }

        console.log("Processamento da cotação concluído com sucesso!");
      }
      // Verificar se é um pagamento de reserva direta (NovaReserva)
      else if (session.metadata?.booking_id) {
        const bookingId = session.metadata.booking_id;
        const bookingNumber = session.metadata.booking_number;
        
        console.log("Pagamento de reserva direta detectado:", bookingNumber);
        
        // Buscar a reserva para garantir que existe e ter os dados atuais
        const bookings = await base44.asServiceRole.entities.Booking.list();
        const booking = bookings.find(b => b.id === bookingId);
        
        if (booking) {
            // Atualizar status da reserva (garantia via webhook)
            if (booking.status !== 'pendente' || booking.payment_status !== 'pago') {
                console.log("Atualizando status da reserva via webhook...");
                await base44.asServiceRole.entities.Booking.update(bookingId, {
                    status: 'pendente',
                    payment_status: 'pago',
                    payment_intent_id: session.payment_intent || session.id
                });
            }

            try {
                console.log("Processando notificações centralizadas da NovaReserva (via webhook)...");
                await base44.asServiceRole.functions.invoke('processNovaReservaPaidBooking', {
                    bookingId: bookingId,
                    paymentIntentId: session.payment_intent || session.id,
                    stripeCheckoutSessionId: session.id
                });
                console.log("Notificações da NovaReserva processadas com sucesso.");
            } catch (processingError) {
                console.error('Erro ao processar notificações centralizadas da NovaReserva:', processingError);
            }

        } else {
            console.error("Reserva não encontrada para o ID:", bookingId);
        }
      }
      // Verificar se é um pagamento de ServiceRequest (link gerado manualmente - individual ou agrupado)
      else if (session.metadata?.service_request_id || session.metadata?.bulk_payment === 'true' || session.payment_link || session.id) {
        console.log("Processando pagamento de ServiceRequest(s)...");

        let serviceRequestIdsToUpdate = [];
        let paymentLinkMetadata = null;

        // Se a session veio de um Payment Link, buscar os metadados do Payment Link
        if (session.payment_link) {
          try {
            console.log(`Session veio de Payment Link: ${session.payment_link}. Buscando metadados...`);
            const paymentLink = await stripe.paymentLinks.retrieve(session.payment_link);
            paymentLinkMetadata = paymentLink.metadata;
            console.log(`Metadados do Payment Link:`, paymentLinkMetadata);
          } catch (err) {
            console.warn(`Erro ao buscar Payment Link ${session.payment_link}:`, err.message);
          }
        }

        // Verificar metadados (session ou payment link)
        const metadata = paymentLinkMetadata || session.metadata || {};

        // Se for um pagamento em massa
        if (metadata.bulk_payment === 'true' && metadata.service_request_ids) {
          serviceRequestIdsToUpdate = metadata.service_request_ids.split(',');
          console.log(`Pagamento em massa detectado. IDs de ServiceRequest: ${serviceRequestIdsToUpdate.join(', ')}`);
        } else if (metadata.service_request_id) {
          // Se for um pagamento de ServiceRequest individual
          serviceRequestIdsToUpdate = [metadata.service_request_id];
          console.log(`Pagamento individual de ServiceRequest detectado: ${metadata.service_request_id}`);
        } else {
          // Fallback: tentar encontrar ServiceRequests pelo stripe_checkout_session_id
          const allServiceRequests = await base44.asServiceRole.entities.ServiceRequest.list();
          const linkedBySession = allServiceRequests.filter(sr => 
            sr.stripe_checkout_session_id === session.id
          );
          if (linkedBySession.length > 0) {
            serviceRequestIdsToUpdate = linkedBySession.map(sr => sr.id);
            console.log(`Encontradas ${linkedBySession.length} ServiceRequest(s) vinculadas pelo session.id: ${session.id}`);
          } else {
            console.warn(`Nenhum ServiceRequest encontrado para o session.id ${session.id} ou em metadata.`);
          }
        }
        
        if (serviceRequestIdsToUpdate.length > 0) {
          for (const serviceRequestId of serviceRequestIdsToUpdate) {
            try {
              const serviceRequest = await base44.asServiceRole.entities.ServiceRequest.get(serviceRequestId);
              if (serviceRequest && serviceRequest.stripe_payment_status !== 'paid') {
                console.log(`Atualizando ServiceRequest ${serviceRequest.request_number || serviceRequest.id}...`);
                await base44.asServiceRole.entities.ServiceRequest.update(serviceRequest.id, {
                  payment_status: 'pago',
                  stripe_payment_status: 'paid',
                  stripe_last_status_update: new Date().toISOString(),
                  payment_intent_id: session.payment_intent || session.id,
                  stripe_checkout_session_id: session.id
                });
                console.log(`ServiceRequest ${serviceRequest.request_number || serviceRequest.id} atualizada com sucesso.`);
              } else if (serviceRequest) {
                console.log(`ServiceRequest ${serviceRequest.request_number || serviceRequest.id} já estava marcada como paga.`);
              } else {
                console.warn(`ServiceRequest com ID ${serviceRequestId} não encontrada.`);
              }
            } catch (err) {
              console.error(`Erro ao atualizar ServiceRequest ${serviceRequestId}:`, err);
            }
          }
          console.log(`Todas as ServiceRequest(s) foram processadas.`);
        }
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const bookingId = paymentIntent?.metadata?.booking_id;

      if (bookingId) {
        try {
          console.log(`Processando payment_intent.succeeded para booking ${bookingId}...`);
          await base44.asServiceRole.functions.invoke('processNovaReservaPaidBooking', {
            bookingId,
            paymentIntentId: paymentIntent.id
          });
          console.log('payment_intent.succeeded processado com sucesso.');
        } catch (processingError) {
          console.error('Erro ao processar payment_intent.succeeded da NovaReserva:', processingError);
        }
      }
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('ERRO CRÍTICO no webhook handler:', error);
    console.error('Stack trace:', error.stack);
    return Response.json(
      { error: error.message || 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
});