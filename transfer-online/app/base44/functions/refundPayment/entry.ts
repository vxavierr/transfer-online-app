import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

async function resolvePaymentIntentId(trip) {
  if (trip.payment_intent_id) {
    return trip.payment_intent_id;
  }

  if (!trip.stripe_checkout_session_id) {
    return null;
  }

  const session = await stripe.checkout.sessions.retrieve(trip.stripe_checkout_session_id, {
    expand: ['payment_intent'],
  });

  if (typeof session.payment_intent === 'string') {
    return session.payment_intent;
  }

  return session.payment_intent?.id || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.email?.toLowerCase().trim() || '';
    const isSuperAdmin = email === 'fernandotransferonline@gmail.com';
    const isAdmin = user.role === 'admin';
    const isMaster = user.client_corporate_role === 'master' || user.client_corporate_role === 'admin_client';
    const isSupplierAdmin = user.supplier_role === 'manager' || user.supplier_role === 'admin';

    if (!isAdmin && !isSuperAdmin && !isMaster && !isSupplierAdmin) {
      return Response.json(
        { error: 'Acesso negado. Permissão insuficiente para processar reembolsos.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { bookingId, tripId, tripType = 'Booking', refundReason } = body;
    const targetId = bookingId || tripId;

    if (!targetId) {
      return Response.json({ error: 'ID da viagem é obrigatório' }, { status: 400 });
    }

    const Entity = tripType === 'ServiceRequest'
      ? base44.asServiceRole.entities.ServiceRequest
      : base44.asServiceRole.entities.Booking;

    const trip = await Entity.get(targetId);

    if (!trip) {
      return Response.json({ error: 'Viagem não encontrada' }, { status: 404 });
    }

    if (trip.payment_status !== 'pago') {
      return Response.json(
        { error: `Esta viagem não pode ser reembolsada. Status do pagamento: ${trip.payment_status}` },
        { status: 400 }
      );
    }

    if (trip.payment_status === 'reembolsado') {
      return Response.json({ error: 'Esta viagem já foi reembolsada.' }, { status: 400 });
    }

    const paymentIntentId = await resolvePaymentIntentId(trip);

    if (!paymentIntentId) {
      return Response.json(
        { error: 'ID do pagamento não encontrado na viagem.' },
        { status: 400 }
      );
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer',
      metadata: {
        trip_id: targetId,
        trip_type: tripType,
        request_number: trip.request_number || trip.booking_number || '',
        refund_reason: refundReason || 'Cancelamento pelo administrador'
      }
    });

    await Entity.update(targetId, {
      status: 'cancelada',
      payment_status: 'reembolsado',
      payment_intent_id: paymentIntentId,
      refund_id: refund.id,
      refund_date: new Date().toISOString(),
      refund_reason: refundReason || 'Cancelamento pelo administrador'
    });

    try {
      await base44.asServiceRole.entities.TripHistory.create({
        trip_id: targetId,
        trip_type: tripType,
        event_type: 'Reembolso e Cancelamento',
        user_id: user.id,
        user_name: user.full_name || email,
        comment: `Viagem cancelada e reembolsada. Motivo: ${refundReason || 'Não informado'}`,
        details: {
          refund_id: refund.id,
          amount_refunded: refund.amount / 100,
          reason: refundReason || 'Cancelamento pelo administrador'
        }
      });
    } catch (histError) {
      console.error('Erro ao registrar histórico:', histError);
    }

    if (tripType === 'Booking') {
      try {
        await base44.asServiceRole.functions.invoke('sendBookingEmail', {
          bookingId: targetId,
          recipientType: 'customer',
          emailType: 'cancellation_refund',
          refundReason
        });
      } catch (emailError) {
        console.error('Erro ao enviar e-mail:', emailError);
      }
    }

    return Response.json({
      success: true,
      message: 'Reembolso processado com sucesso',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      }
    });
  } catch (error) {
    console.error('Erro ao processar reembolso:', error);
    return Response.json(
      {
        error: error.message || 'Erro ao processar reembolso',
        details: error.type || 'unknown_error'
      },
      { status: 500 }
    );
  }
});