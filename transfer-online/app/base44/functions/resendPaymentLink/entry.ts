import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@14.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação do administrador
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Acesso negado. Apenas administradores podem reenviar links de pagamento.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { bookingId } = body;

    if (!bookingId) {
      return Response.json(
        { error: 'ID da reserva é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar dados da reserva usando service role
    console.log('Buscando reserva:', bookingId);
    const bookings = await base44.asServiceRole.entities.Booking.list();
    const booking = bookings.find(b => b.id === bookingId);

    if (!booking) {
      return Response.json(
        { error: 'Reserva não encontrada' },
        { status: 404 }
      );
    }

    // Validar se a reserva pode receber um novo link de pagamento
    if (booking.payment_status === 'pago') {
      return Response.json(
        { error: 'Esta reserva já foi paga. Não é possível reenviar o link de pagamento.' },
        { status: 400 }
      );
    }

    if (booking.payment_status === 'reembolsado' || booking.status === 'cancelada') {
      return Response.json(
        { error: 'Esta reserva está cancelada ou reembolsada. Não é possível reenviar o link de pagamento.' },
        { status: 400 }
      );
    }

    console.log('Criando novo PaymentIntent para a reserva:', booking.booking_number);

    // Criar novo PaymentIntent no Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.total_price * 100), // Stripe usa centavos
      currency: 'brl',
      metadata: {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        customer_email: booking.customer_email,
        customer_name: booking.customer_name,
        is_resent: 'true'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('Novo PaymentIntent criado:', paymentIntent.id);

    // Atualizar a reserva com o novo payment_intent_id
    await base44.asServiceRole.entities.Booking.update(bookingId, {
      payment_intent_id: paymentIntent.id,
      payment_status: 'aguardando'
    });

    // Construir a URL de pagamento usando BASE_URL
    const baseUrl = Deno.env.get('BASE_URL') || 'https://transfer-online-booking-f3f66b8f.base44.app';
    const paymentUrl = `${baseUrl}/retomar-pagamento?bookingId=${booking.id}&clientSecret=${paymentIntent.client_secret}`;

    console.log('URL de pagamento gerada:', paymentUrl);

    // Enviar e-mail com o link de pagamento
    try {
      await base44.asServiceRole.functions.invoke('sendBookingEmail', {
        bookingId: booking.id,
        recipientType: 'customer',
        emailType: 'payment_link_resend',
        paymentUrl: paymentUrl
      });
      console.log('E-mail de link de pagamento enviado ao cliente');
    } catch (emailError) {
      console.error('Erro ao enviar e-mail:', emailError);
      // Não falhar a operação inteira se o e-mail falhar
      // Mas vamos retornar um aviso
      return Response.json({
        success: true,
        warning: 'Link gerado com sucesso, mas houve um erro ao enviar o e-mail',
        paymentUrl: paymentUrl,
        clientSecret: paymentIntent.client_secret
      });
    }

    return Response.json({
      success: true,
      message: 'Link de pagamento enviado com sucesso',
      paymentUrl: paymentUrl,
      clientSecret: paymentIntent.client_secret
    });

  } catch (error) {
    console.error('Erro ao reenviar link de pagamento:', error);
    return Response.json(
      { 
        error: error.message || 'Erro ao reenviar link de pagamento',
        details: error.type || 'unknown_error'
      },
      { status: 500 }
    );
  }
});