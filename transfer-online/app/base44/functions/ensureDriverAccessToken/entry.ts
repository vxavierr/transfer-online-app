import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId, tripType } = await req.json();

    if (!tripId) {
      return Response.json({ error: 'Trip ID required' }, { status: 400 });
    }

    let trip = null;
    let entityName = '';

    if (tripType === 'own') {
      entityName = 'SupplierOwnBooking';
      trip = await base44.entities.SupplierOwnBooking.get(tripId);
    } else if (tripType === 'event') {
      entityName = 'EventTrip';
      trip = await base44.entities.EventTrip.get(tripId);
    } else if (tripType === 'booking') {
      entityName = 'Booking';
      trip = await base44.entities.Booking.get(tripId);
    } else {
      entityName = 'ServiceRequest';
      trip = await base44.entities.ServiceRequest.get(tripId);
    }

    if (!trip) {
      return Response.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Verify if user is the assigned driver or admin/supplier
    // Allow access if driver_id matches OR if phone_number matches (fallback for users without driver_id set)
    const normalize = (p) => p ? String(p).replace(/\D/g, '') : '';
    
    const matchesId = user.driver_id && trip.driver_id === user.driver_id;
    
    // Check phone match with robust normalization and DDI tolerance
    const userPhone = normalize(user.phone_number);
    const tripPhone = normalize(trip.driver_phone);
    
    const checkPhoneMatch = (p1, p2) => {
        if (!p1 || !p2) return false;
        if (p1 === p2) return true;
        // Remove Brazil DDI (55) if present to compare local numbers
        const p1_no55 = p1.startsWith('55') && p1.length > 10 ? p1.substring(2) : p1;
        const p2_no55 = p2.startsWith('55') && p2.length > 10 ? p2.substring(2) : p2;
        return p1_no55 === p2_no55;
    };

    const matchesPhone = checkPhoneMatch(userPhone, tripPhone);
    
    const isDriver = matchesId || matchesPhone;
    
    if (!isDriver && user.role !== 'admin' && trip.supplier_id !== user.supplier_id) {
       return Response.json({ error: 'Permission denied' }, { status: 403 });
    }

    if (trip.driver_access_token) {
      return Response.json({ token: trip.driver_access_token });
    }

    // Generate new token
    const newToken = crypto.randomUUID();
    
    if (tripType === 'own') {
      await base44.entities.SupplierOwnBooking.update(tripId, { driver_access_token: newToken });
    } else if (tripType === 'event') {
      await base44.entities.EventTrip.update(tripId, { driver_access_token: newToken });
    } else if (tripType === 'booking') {
      await base44.entities.Booking.update(tripId, { driver_access_token: newToken });
    } else {
      await base44.entities.ServiceRequest.update(tripId, { driver_access_token: newToken });
    }

    return Response.json({ token: newToken });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});