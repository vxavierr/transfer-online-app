import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.11.0';

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
    const { serviceType, vehicleTypeId, vehicleTypeName, formData, driverLanguage, bookingLanguage, priceFromFrontend, calculationDetailsFromFrontend } = body;

    if (!serviceType || !vehicleTypeId || !formData) {
      return Response.json({ error: 'Dados do checkout incompletos' }, { status: 400 });
    }

    const passengersCount = Math.max(Number(formData.passengers) || 1, 1);
    const passengersDetails = Array.isArray(formData.passengers_details) && formData.passengers_details.length > 0
      ? formData.passengers_details
          .map((passenger, index) => ({
            name: passenger?.name?.trim?.() || '',
            is_lead_passenger: index === 0 || Boolean(passenger?.is_lead_passenger),
          }))
          .filter((passenger) => passenger.name)
      : passengersCount === 1 && formData.customer_name
        ? [{ name: formData.customer_name.trim(), is_lead_passenger: true }]
        : [];

    if (!formData.customer_email || !formData.customer_phone || !formData.origin || !formData.date || !formData.time) {
      return Response.json({ error: 'Preencha os dados obrigatórios para continuar' }, { status: 400 });
    }

    if (passengersDetails.length !== passengersCount) {
      return Response.json({ error: 'Preencha o nome de todos os passageiros para continuar' }, { status: 400 });
    }

    let vehicle = null;

    try {
      vehicle = await base44.asServiceRole.entities.VehicleType.get(vehicleTypeId);
    } catch (_error) {
      vehicle = null;
    }

    if (!vehicle && vehicleTypeName) {
      const vehicles = await base44.asServiceRole.entities.VehicleType.filter({ name: vehicleTypeName });
      vehicle = vehicles[0] || null;
    }

    if (!vehicle) {
      return Response.json({ error: 'Veículo não encontrado' }, { status: 404 });
    }

    let calculatedPrice = Number(priceFromFrontend || 0);
    let calculationDetails = calculationDetailsFromFrontend || {};

    if (!calculatedPrice || calculatedPrice <= 0) {
      const priceResponse = await base44.asServiceRole.functions.invoke('calculateTransferPrice', {
        service_type: serviceType,
        vehicle_type_id: vehicle.id,
        origin: formData.origin,
        destination: formData.destination,
        date: formData.date,
        time: formData.time,
        return_date: formData.return_date,
        return_time: formData.return_time,
        hours: formData.hours,
        driver_language: driverLanguage,
        is_internal_call: true,
      });

      if (!priceResponse?.data?.success || !priceResponse?.data?.pricing) {
        return Response.json({ error: priceResponse?.data?.error || 'Não foi possível calcular o valor da viagem' }, { status: 400 });
      }

      calculatedPrice = Number(priceResponse.data.pricing.total_price || 0);
      calculationDetails = priceResponse.data.pricing.calculation_details || {};
    }

    if (!calculatedPrice || calculatedPrice <= 0) {
      return Response.json({ error: 'Valor do checkout inválido' }, { status: 400 });
    }

    const bookingNumber = await generateBookingNumber(base44);

    const bookingData = {
      booking_number: bookingNumber,
      service_type: serviceType,
      vehicle_type_id: vehicle.id,
      vehicle_type_name: vehicle.name,
      driver_language: driverLanguage || 'pt',
      booking_language: bookingLanguage || 'pt',
      origin: formData.origin,
      destination: formData.destination || formData.origin,
      date: formData.date,
      time: formData.time,
      passengers: passengersCount,
      customer_name: formData.customer_name || 'Cliente',
      customer_email: formData.customer_email,
      customer_phone: formData.customer_phone,
      passengers_details: passengersDetails,
      is_booking_for_other: false,
      notes: formData.notes || '',
      total_price: calculatedPrice,
      price_before_coupon: calculatedPrice,
      status: 'pendente',
      payment_status: 'aguardando',
      distance_km: parseFloat(calculationDetails.supplier_total_distance_km || 0),
      duration_minutes: parseInt(calculationDetails.supplier_duration_minutes || 0),
    };

    if (serviceType === 'round_trip') {
      bookingData.return_date = formData.return_date;
      bookingData.return_time = formData.return_time;
      if (formData.return_origin_flight_number) bookingData.return_origin_flight_number = formData.return_origin_flight_number;
      if (formData.return_destination_flight_number) bookingData.return_destination_flight_number = formData.return_destination_flight_number;
    }

    if (serviceType === 'hourly') {
      bookingData.hours = formData.hours;
    }

    if (formData.origin_flight_number) bookingData.origin_flight_number = formData.origin_flight_number;
    if (formData.destination_flight_number) bookingData.destination_flight_number = formData.destination_flight_number;

    const booking = await base44.asServiceRole.entities.Booking.create(bookingData);
    const appUrl = normalizeAppUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: formData.customer_email,
      success_url: `${appUrl}/BookingSuccessGuest?from_guest_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/NovaReserva`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: Math.round(calculatedPrice * 100),
            product_data: {
              name: `Transfer ${vehicle.name}`,
              description: `${formData.origin} → ${formData.destination || formData.origin}`,
            },
          },
        },
      ],
      metadata: {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        service_type: serviceType,
      },
      payment_intent_data: {
        metadata: {
          booking_id: booking.id,
          booking_number: booking.booking_number,
          service_type: serviceType,
        },
      },
    });

    await base44.asServiceRole.entities.Booking.update(booking.id, {
      stripe_checkout_session_id: session.id,
    });

    return Response.json({ url: session.url, booking_id: booking.id });
  } catch (error) {
    console.error('[createGuestBookingAndStripeCheckout] Error:', error);
    return Response.json({ error: error.message || 'Erro ao iniciar checkout' }, { status: 500 });
  }
});