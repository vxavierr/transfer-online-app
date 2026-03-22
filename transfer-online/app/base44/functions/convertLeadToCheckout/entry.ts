import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@^14.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const client = base44.asServiceRole;

    const { leadId } = await req.json();

    if (!leadId) {
      console.error('[convertLeadToCheckout] Lead ID is missing in payload');
      return Response.json({ error: 'Link inválido (ID não encontrado).' }, { status: 400 });
    }

    const lead = await client.entities.BookingLead.get(leadId);
    if (!lead) {
      console.error('[convertLeadToCheckout] Lead not found:', leadId);
      return Response.json({ error: 'Reserva não encontrada ou expirada.' }, { status: 404 });
    }

    let bookingId = lead.converted_booking_id;
    let booking;

    if (bookingId) {
        booking = await client.entities.Booking.get(bookingId);
        if (booking && booking.payment_status === 'pago') {
             return Response.json({ error: 'Reserva já paga', booking_id: booking.id, paid: true }, { status: 400 });
        }
        
        // Check if existing booking has invalid price (0) from previous failed attempt
        if (booking && (booking.total_price === 0 || booking.total_price === null)) {
             console.log('[convertLeadToCheckout] Existing booking has 0 price, deleting to recreate...');
             try {
                 await client.entities.Booking.delete(bookingId);
                 booking = null;
                 // Reset lead to allow recreation
                 await client.entities.BookingLead.update(lead.id, {
                     converted_booking_id: null,
                     status: 'booking_started'
                 });
             } catch (delErr) {
                 console.error('[convertLeadToCheckout] Failed to delete invalid booking:', delErr);
             }
        }
    }

    // Use BASE_URL
    let appUrl = Deno.env.get('BASE_URL');
    if (!appUrl && req.headers.get('origin')) appUrl = req.headers.get('origin');
    if (!appUrl) appUrl = 'https://app.transferonline.com.br';
    if (appUrl.endsWith('/')) appUrl = appUrl.slice(0, -1);
    if (!appUrl.startsWith('http')) appUrl = 'https://' + appUrl;

    if (!booking) {
        // Create Booking
        const bookingNumberResponse = await client.functions.invoke('generateBookingNumber');
        const bookingNumber = bookingNumberResponse.data.bookingNumber;

        let vehicle = null;
        try {
            vehicle = await client.entities.VehicleType.get(lead.vehicle_type_id);
        } catch (e) {
            console.error('[convertLeadToCheckout] Vehicle not found:', lead.vehicle_type_id);
        }
        
        let vehicleName = vehicle ? vehicle.name : (lead.vehicle_type_name || 'Veículo Executivo');
        let vehicleId = vehicle ? vehicle.id : (lead.vehicle_type_id || 'unknown_vehicle');

        // Fallback crítico: Se não temos o veículo original E não temos preço salvo (leads antigos),
        // precisamos encontrar QUALQUER veículo ativo para recalcular o preço e salvar a venda.
        if (!vehicle && (!lead.calculated_price || Number(lead.calculated_price) <= 0)) {
            console.log('[convertLeadToCheckout] Veículo não encontrado e sem preço salvo. Buscando veículo padrão para recálculo...');
            try {
                // Buscar lista de veículos ativos
                const allVehicles = await client.entities.VehicleType.list();
                
                // Prioridade: Sedan/Executivo -> Qualquer Ativo -> Primeiro da lista
                const fallbackVehicle = allVehicles.find(v => v.active && (v.name.toLowerCase().includes('sedan') || v.name.toLowerCase().includes('executivo'))) || 
                                      allVehicles.find(v => v.active) || 
                                      allVehicles[0];
                
                if (fallbackVehicle) {
                    console.log('[convertLeadToCheckout] Veículo fallback encontrado:', fallbackVehicle.name);
                    vehicle = fallbackVehicle;
                    vehicleId = fallbackVehicle.id;
                    vehicleName = fallbackVehicle.name;
                    // vehicle agora existe, permitindo que o recálculo de preço (linhas abaixo) funcione
                }
            } catch (fallbackErr) {
                console.error('[convertLeadToCheckout] Falha ao buscar veículo fallback:', fallbackErr);
            }
        }

        if (!vehicle && !lead.calculated_price) {
            // Se mesmo após tentar fallback não tivermos veículo nem preço
            console.error('[convertLeadToCheckout] Vehicle not found and no stored price:', lead.vehicle_type_id);
            return Response.json({ error: 'Não foi possível recuperar os dados do veículo ou preço. Por favor faça uma nova cotação.' }, { status: 400 });
        }

        // Validate and ensure number for price
        let totalPrice = Number(lead.calculated_price) || 0;

        // Fallback: If price is 0 or missing, try to recalculate it (requires vehicle entity)
        if (totalPrice <= 0 && vehicle) {
            console.log('[convertLeadToCheckout] Price missing or 0, attempting to recalculate...');
            try {
                const calcResponse = await client.functions.invoke('calculateTransferPrice', {
                    service_type: lead.service_type,
                    vehicle_type_id: vehicle.id,
                    origin: lead.origin,
                    destination: lead.destination || lead.origin,
                    date: lead.date,
                    time: lead.time,
                    return_date: lead.return_date,
                    return_time: lead.return_time,
                    hours: lead.hours,
                    driver_language: lead.driver_language,
                    is_internal_call: true
                });

                if (calcResponse.data && calcResponse.data.pricing) {
                    totalPrice = Number(calcResponse.data.pricing.total_price) || 0;
                    console.log('[convertLeadToCheckout] Recalculated price:', totalPrice);
                    
                    // Optional: Update lead with calculated price for future
                    await client.entities.BookingLead.update(lead.id, {
                        calculated_price: totalPrice
                    });
                }
            } catch (calcErr) {
                console.error('[convertLeadToCheckout] Failed to recalculate price:', calcErr);
            }
        }

        let priceBeforeCoupon = totalPrice;
        let couponApplied = null;

        // Apply Coupon if exists in lead
        if (lead.recovery_coupon_code) {
             try {
                 const coupons = await client.entities.Coupon.list();
                 const coupon = coupons.find(c => c.code.toUpperCase() === lead.recovery_coupon_code.toUpperCase());
                 if (coupon && coupon.active) {
                     let discount = 0;
                     if (coupon.discount_type === 'percentage') {
                         discount = (totalPrice * coupon.discount_value) / 100;
                     } else {
                         discount = coupon.discount_value;
                     }
                     // Keep track of discount
                     const newTotal = Math.max(0, totalPrice - discount);
                     console.log(`[convertLeadToCheckout] Coupon ${coupon.code} applied. Old: ${totalPrice}, New: ${newTotal}`);
                     totalPrice = newTotal;
                     couponApplied = coupon;
                 }
             } catch (couponErr) {
                 console.warn('[convertLeadToCheckout] Failed to apply coupon:', couponErr);
             }
        }

        const bookingData = {
            booking_number: bookingNumber,
            service_type: lead.service_type,
            vehicle_type_id: vehicleId,
            vehicle_type_name: vehicleName,
            driver_language: lead.driver_language,
            origin: lead.origin,
            destination: lead.destination || lead.origin,
            date: lead.date,
            time: lead.time,
            passengers: 1, 
            customer_name: 'Cliente (Recuperação)',
            customer_email: lead.email,
            customer_phone: lead.phone,
            is_booking_for_other: false,
            total_price: totalPrice,
            price_before_coupon: priceBeforeCoupon,
            status: 'pendente',
            payment_status: 'aguardando',
            distance_km: lead.distance_km,
            duration_minutes: lead.duration_minutes
        };

        if (couponApplied) {
            bookingData.coupon_code = couponApplied.code;
            bookingData.coupon_id = couponApplied.id;
            bookingData.coupon_discount_type = couponApplied.discount_type;
            bookingData.coupon_discount_value = couponApplied.discount_value;
            bookingData.coupon_discount_amount = priceBeforeCoupon - totalPrice;
        }

        if (lead.service_type === 'round_trip') {
            bookingData.return_date = lead.return_date;
            bookingData.return_time = lead.return_time;
            bookingData.return_origin_flight_number = lead.return_origin_flight_number;
            bookingData.return_destination_flight_number = lead.return_destination_flight_number;
        } else if (lead.service_type === 'hourly') {
            bookingData.hours = lead.hours;
        }

        bookingData.origin_flight_number = lead.origin_flight_number;
        bookingData.destination_flight_number = lead.destination_flight_number;

        booking = await client.entities.Booking.create(bookingData);
        bookingId = booking.id;

        // Update Lead
        await client.entities.BookingLead.update(lead.id, {
            converted_booking_id: bookingId,
            status: 'converted'
        });
    }

    if (booking.total_price === null || booking.total_price === undefined || isNaN(booking.total_price)) {
         console.error('[convertLeadToCheckout] Invalid total_price:', booking.total_price);
         return Response.json({ error: 'Preço da reserva inválido' }, { status: 500 });
    }

    const unitAmount = Math.round(booking.total_price * 100);
    
    // Stripe requires at least 50 cents (approx) for many currencies. 
    // For BRL, let's ensure it's at least 100 (R$ 1,00) to be safe.
    if (unitAmount < 100) {
         console.error('[convertLeadToCheckout] Invalid unit_amount for Stripe (too low):', unitAmount, 'Total Price:', booking.total_price);
         return Response.json({ error: 'Não foi possível calcular o valor corretamente. Por favor, inicie uma nova reserva.' }, { status: 400 });
    }

    console.log('[convertLeadToCheckout] Creating Stripe session for:', unitAmount);

    // Create Stripe Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `Transfer: ${booking.service_type}`,
              description: `${booking.vehicle_type_name} - ${booking.origin} -> ${booking.destination}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/BookingSuccessGuest?from_guest_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/NovaReserva`, 
      customer_email: booking.customer_email || undefined,
      metadata: {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        service_type: booking.service_type,
        lead_id: lead.id
      },
    });

    return Response.json({ url: session.url });

  } catch (error) {
    console.error('[convertLeadToCheckout] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});