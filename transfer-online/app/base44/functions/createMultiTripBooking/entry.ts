import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@^14.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

function normalizeAppUrl(req) {
  const baseUrl = Deno.env.get('BASE_URL');
  const origin = req.headers.get('origin');
  const originUrl = req.headers.get('x-origin-url');

  let appUrl = baseUrl || origin;

  if (!appUrl && originUrl) {
    appUrl = new URL(originUrl).origin;
  }

  if (!appUrl) {
    appUrl = 'https://app.transferonline.com.br';
  }

  if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
    appUrl = `https://${appUrl}`;
  }

  return appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
}

async function generateBookingNumber(base44) {
  const counters = await base44.asServiceRole.entities.BookingCounter.filter({ counter_name: 'main' });

  let nextNumber = 1;

  if (counters.length === 0) {
    await base44.asServiceRole.entities.BookingCounter.create({
      counter_name: 'main',
      last_number: 1,
    });
  } else {
    const counter = counters[0];
    nextNumber = (counter.last_number || 0) + 1;
    await base44.asServiceRole.entities.BookingCounter.update(counter.id, {
      last_number: nextNumber,
    });
  }

  return `TP-${String(nextNumber).padStart(4, '0')}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const { legs, driverLanguage, customerData, isGuest } = body;

    if (!legs || !Array.isArray(legs) || legs.length === 0) {
      return Response.json({ error: 'Pelo menos uma viagem é necessária' }, { status: 400 });
    }

    if (!customerData?.customer_email || !customerData?.customer_phone) {
      return Response.json({ error: 'Email e telefone são obrigatórios' }, { status: 400 });
    }

    let currentUser = null;
    if (!isGuest) {
      try {
        currentUser = await base44.auth.me();
      } catch (e) {
        console.log('Usuário não autenticado, prosseguindo como guest');
      }
    }

    // 1. Validar e consolidar preço de cada perna
    const validatedLegs = [];
    let totalPrice = 0;

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      
      if (!leg.origin || !leg.destination || !leg.date || !leg.time || !leg.vehicleTypeId) {
        return Response.json({ 
          error: `Viagem ${i + 1}: Dados incompletos (origem, destino, data, hora e veículo são obrigatórios)` 
        }, { status: 400 });
      }

      let legPrice = Number(leg.calculatedPrice || 0);
      let calculationDetails = leg.calculationDetails || {};
      let vehicleTypeName = leg.vehicleTypeName || '';

      if (!legPrice || legPrice <= 0) {
        const priceResponse = await base44.asServiceRole.functions.invoke('calculateTransferPrice', {
          service_type: 'one_way',
          vehicle_type_id: leg.vehicleTypeId,
          origin: leg.origin,
          destination: leg.destination,
          date: leg.date,
          time: leg.time,
          driver_language: driverLanguage,
          is_internal_call: true
        });

        if (!priceResponse.data?.success) {
          return Response.json({ 
            error: `Viagem ${i + 1}: ${priceResponse.data?.error || 'Erro ao calcular preço'}` 
          }, { status: 400 });
        }

        legPrice = Number(priceResponse.data.pricing.total_price || 0);
        calculationDetails = priceResponse.data.pricing.calculation_details || {};
      }

      if (!vehicleTypeName) {
        const vehicle = await base44.asServiceRole.entities.VehicleType.get(leg.vehicleTypeId).catch(() => null);
        vehicleTypeName = vehicle?.name || `Veículo ${i + 1}`;
      }

      validatedLegs.push({
        ...leg,
        calculatedPrice: legPrice,
        vehicleTypeName,
        calculationDetails
      });

      totalPrice += legPrice;
    }

    // 2. Gerar número da reserva
    const bookingNumber = await generateBookingNumber(base44);

    // 3. Criar reserva multi-viagem
    const bookingData = {
      booking_number: bookingNumber,
      service_type: 'multi_trip',
      is_multi_trip: true,
      multi_trip_legs: validatedLegs,
      driver_language: driverLanguage,
      origin: validatedLegs[0].origin,
      destination: validatedLegs[validatedLegs.length - 1].destination,
      date: validatedLegs[0].date,
      time: validatedLegs[0].time,
      passengers: customerData.passengers || 1,
      customer_name: customerData.customer_name,
      customer_email: customerData.customer_email,
      customer_phone: customerData.customer_phone,
      notes: customerData.notes || '',
      total_price: totalPrice,
      price_before_coupon: totalPrice,
      status: 'pendente',
      payment_status: 'aguardando',
      supplier_id: '690ceb8f1d259a877c7a1bc3'
    };

    const booking = await base44.asServiceRole.entities.Booking.create(bookingData);

    // 4. Criar sessão de pagamento Stripe
    const appUrl = normalizeAppUrl(req);

    const lineItems = validatedLegs.map((leg, i) => ({
      price_data: {
        currency: 'brl',
        product_data: {
          name: `Trecho ${i + 1} - ${leg.vehicleTypeName}`,
          description: `${leg.date} ${leg.time}`,
        },
        unit_amount: Math.round(Number(leg.calculatedPrice) * 100),
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customerData.customer_email,
      success_url: `${appUrl}/BookingSuccessGuest?from_guest_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/NovaReserva`,
      line_items: lineItems,
      metadata: {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        service_type: 'multi_trip',
        legs_count: String(legs.length)
      },
      payment_intent_data: {
        metadata: {
          booking_id: booking.id,
          booking_number: booking.booking_number,
          service_type: 'multi_trip',
          legs_count: String(legs.length)
        }
      },
    });

    return Response.json({ 
      url: session.url,
      booking_id: booking.id,
      total_price: totalPrice
    });

  } catch (error) {
    console.error('[createMultiTripBooking] Error:', error);
    return Response.json({ error: error.message || 'Erro ao iniciar checkout multi-trecho' }, { status: 500 });
  }
});