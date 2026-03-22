import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

function getPaymentIntentId(paymentIntent) {
  if (!paymentIntent) return null;
  if (typeof paymentIntent === 'string') return paymentIntent;
  return paymentIntent.id || null;
}

async function findBooking(base44, session) {
  const bookingIdFromMetadata = session?.metadata?.booking_id;

  if (bookingIdFromMetadata) {
    try {
      const bookingByMetadata = await base44.asServiceRole.entities.Booking.get(bookingIdFromMetadata);
      if (bookingByMetadata) return bookingByMetadata;
    } catch (_error) {
      console.warn('[handleGuestStripeCheckoutSuccess] Reserva não encontrada via metadata.');
    }
  }

  const bookingsBySession = await base44.asServiceRole.entities.Booking.filter({
    stripe_checkout_session_id: session.id,
  });
  if (bookingsBySession.length > 0) return bookingsBySession[0];

  const paymentIntentId = getPaymentIntentId(session.payment_intent);
  if (!paymentIntentId) return null;

  const bookingsByPaymentIntent = await base44.asServiceRole.entities.Booking.filter({
    payment_intent_id: paymentIntentId,
  });

  return bookingsByPaymentIntent[0] || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { session_id } = body;

    if (!session_id) {
      return Response.json({ success: false, error: 'Session ID required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return Response.json({
        success: false,
        error: 'Pagamento ainda não foi confirmado.',
        payment_status: session.payment_status,
      });
    }

    const booking = await findBooking(base44, session);
    if (!booking) {
      return Response.json({
        success: false,
        error: 'Reserva não encontrada para esta sessão de pagamento.',
      });
    }

    const paymentIntentId = getPaymentIntentId(session.payment_intent);
    let finalBooking = booking;

    if (
      booking.payment_status !== 'pago' ||
      booking.status !== 'pendente' ||
      booking.stripe_checkout_session_id !== session.id ||
      (paymentIntentId && booking.payment_intent_id !== paymentIntentId)
    ) {
      finalBooking = await base44.asServiceRole.entities.Booking.update(booking.id, {
        status: 'pendente',
        payment_status: 'pago',
        payment_intent_id: paymentIntentId,
        stripe_checkout_session_id: session.id,
      });
    }

    try {
      await base44.asServiceRole.functions.invoke('processNovaReservaPaidBooking', {
        bookingId: booking.id,
        paymentIntentId,
        stripeCheckoutSessionId: session.id,
      });
    } catch (notificationError) {
      console.error('[handleGuestStripeCheckoutSuccess] Error processing paid booking notifications:', notificationError);
    }

    return Response.json({
      success: true,
      booking: {
        booking_number: finalBooking.booking_number,
        origin: finalBooking.origin,
        destination: finalBooking.destination,
        date: finalBooking.date,
        time: finalBooking.time,
        customer_email: finalBooking.customer_email,
      },
    });
  } catch (error) {
    console.error('[handleGuestStripeCheckoutSuccess] Error:', error);

    const isInvalidSession =
      error?.type === 'StripeInvalidRequestError' ||
      String(error?.message || '').includes('No such checkout.session');

    return Response.json(
      {
        success: false,
        error: isInvalidSession ? 'Sessão de pagamento inválida ou expirada.' : (error.message || 'Erro ao confirmar pagamento.'),
      },
      { status: isInvalidSession ? 200 : 500 },
    );
  }
});