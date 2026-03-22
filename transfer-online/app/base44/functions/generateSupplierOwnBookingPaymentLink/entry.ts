import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@^14.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const client = base44.asServiceRole;

    const { bookingId } = await req.json();

    if (!bookingId) {
      return Response.json({ error: 'ID da viagem (bookingId) é obrigatório.' }, { status: 400 });
    }

    const booking = await client.entities.SupplierOwnBooking.get(bookingId);
    if (!booking) {
      return Response.json({ error: 'Viagem não encontrada.' }, { status: 404 });
    }

    if (!booking.price || booking.price <= 0) {
      return Response.json({ error: 'O preço da viagem é inválido para gerar um link de pagamento.' }, { status: 400 });
    }

    // Crie um produto e um preço no Stripe dinamicamente para cada link de pagamento
    // Isso permite ter descrições específicas para cada booking
    const productName = `Viagem #${booking.booking_number} - ${booking.origin} > ${booking.destination}`;
    const productDescription = `Transfer: ${booking.passenger_name} em ${booking.date} às ${booking.time}`;

    const product = await stripe.products.create({
      name: productName,
      description: productDescription,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(booking.price * 100), // Preço em centavos
      currency: 'brl',
      recurring: null, // Pagamento único
    });

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{
        price: price.id,
        quantity: 1,
      }],
      metadata: {
        supplier_own_booking_id: booking.id,
        booking_number: booking.booking_number,
        client_id: booking.client_id // Para rastreamento
      },
      // Configurações de redirecionamento após pagamento
      after_completion: {
        type: 'redirect',
        redirect: { url: `${Deno.env.get('BASE_URL')}/MinhasViagensProprias?payment_success=true&bookingId=${booking.id}` },
      },
      // Configurações para coletar email do cliente se não tivermos
      consent_collection: {
        terms_of_service: 'none',
        promotions: 'none'
      },
      custom_fields: [],
    });

    return Response.json({ paymentLinkUrl: paymentLink.url });

  } catch (error) {
    console.error('[generateSupplierOwnBookingPaymentLink] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});