import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingData = await req.json();

    // Generate Booking Number
    // Get the count of existing bookings for this supplier to generate the next number
    // We'll use a simple approach: count all bookings for the supplier
    const { supplier_id } = bookingData;
    if (!supplier_id) {
        return Response.json({ error: 'Supplier ID is required' }, { status: 400 });
    }

    // Note: filter returns a list. Getting all might be heavy if there are many.
    // But for now this is the standard way unless we maintain a counter.
    // We can use a limit to check existence but for count we need all or a count endpoint.
    // The SDK doesn't expose count() directly usually, so we might need to fetch keys only if possible, 
    // but filter returns objects.
    // Let's assume the load is manageable or we should use a counter entity.
    // The existing code in MinhasViagensProprias uses bookings.length.
    // We will use a Counter entity if available, or just list.
    // Let's use list with a large limit and just count? Or better, fetch the *last* created booking to parse its number.
    
    const lastBookings = await base44.entities.SupplierOwnBooking.filter({ supplier_id }, '-created_date', 1);
    let nextNum = 1;
    if (lastBookings.length > 0) {
        const lastNumStr = lastBookings[0].booking_number;
        // Expected format VG-0001
        const parts = lastNumStr.split('-');
        if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
            nextNum = parseInt(parts[1]) + 1;
        }
    }

    const bookingNumber = `VG-${String(nextNum).padStart(4, '0')}`;

    const newBooking = await base44.entities.SupplierOwnBooking.create({
        ...bookingData,
        booking_number: bookingNumber,
        status: 'pendente',
        created_by: user.email
    });

    // LOG DE HISTÓRICO
    try {
        await base44.asServiceRole.entities.TripHistory.create({
            trip_id: newBooking.id,
            trip_type: 'SupplierOwnBooking',
            event_type: 'Viagem Criada',
            user_id: user.id,
            user_name: user.full_name || user.email,
            details: {
                origin: newBooking.origin,
                destination: newBooking.destination,
                date: newBooking.date,
                time: newBooking.time
            },
            comment: 'Viagem própria criada pelo fornecedor'
        });
    } catch (historyError) {
        console.error('[createSupplierOwnBooking] Erro ao salvar histórico:', historyError);
    }

    // Track usage if applicable
    try {
        await base44.functions.invoke('trackSupplierBookingUsage', { booking_id: newBooking.id });
    } catch (e) {
        console.error('Error tracking usage:', e);
    }

    return Response.json({ success: true, booking: newBooking });

  } catch (error) {
    console.error('Error creating supplier own booking:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});