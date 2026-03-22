import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const { driver_id, driver_ids, date, fetch_all_drivers } = await req.json();

    if (!date) {
      return Response.json({ error: 'Date is required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let targetDriverIds = null; // null indicates "fetch all assigned trips"

    if (driver_ids && Array.isArray(driver_ids) && driver_ids.length > 0) {
        targetDriverIds = driver_ids;
    } else if (driver_id) {
        targetDriverIds = [driver_id];
    } else if (fetch_all_drivers) {
        // Do not restrict by driver IDs immediately. We want to discover drivers from trips.
        targetDriverIds = null;
    } else {
         if (driver_ids && Array.isArray(driver_ids)) {
             targetDriverIds = []; // Explicitly empty list passed
         } else {
             return Response.json({ error: 'Driver ID(s) or fetch_all_drivers=true required' }, { status: 400 });
         }
    }

    // Only return empty if specific IDs were requested and the list is empty
    if (targetDriverIds !== null && targetDriverIds.length === 0) {
        return Response.json({ trips: [] });
    }

    const fetchSafe = (promise) => promise.catch(err => {
        console.error("Error fetching entity:", err);
        return [];
    });

    const dateFilter = { date };

    const [serviceRequests, ownBookings, bookings, eventTrips, allActiveDrivers, allDriverVehicles] = await Promise.all([
      fetchSafe(base44.entities.ServiceRequest.filter(dateFilter)),
      fetchSafe(base44.entities.SupplierOwnBooking.filter(dateFilter)),
      fetchSafe(base44.entities.Booking.filter(dateFilter)),
      fetchSafe(base44.entities.EventTrip.filter(dateFilter)),
      fetchSafe(base44.entities.Driver.filter({ active: true }, undefined, 1000)),
      fetchSafe(base44.entities.DriverVehicle.filter({ active: true }, undefined, 1000))
    ]);

    const targetDriverIdSet = targetDriverIds ? new Set(targetDriverIds) : null;

    const formatTrip = (trip, type) => {
      let effectiveDriverId = trip.driver_id;
      let driverName = null;

      if (type === 'EventTrip') {
          if (trip.is_casual_driver) {
              if (trip.event_casual_driver_id) {
                  effectiveDriverId = trip.event_casual_driver_id;
              } else if (trip.casual_driver_name) {
                  // Fallback ID for name-only casual drivers
                  effectiveDriverId = `casual_name:${trip.casual_driver_name}`;
                  driverName = trip.casual_driver_name;
              }
          }
      }
      
      // Also check for subcontractor drivers (might want to show them too)
      if (!effectiveDriverId && trip.subcontractor_driver_name) {
           effectiveDriverId = `sub_driver:${trip.subcontractor_driver_name}`;
           driverName = trip.subcontractor_driver_name;
      }

      return {
        id: trip.id,
        type,
        driver_id: effectiveDriverId,
        driver_name: driverName, // Optional, for discovery
        start_time: trip.time || trip.start_time,
        time: trip.time || trip.start_time,
        name: trip.name || trip.customer_name || trip.passenger_name || 'Viagem',
        origin: trip.origin,
        destination: trip.destination,
        status: trip.status,
        duration_minutes: trip.duration_minutes || 60,
        trip_code: trip.trip_code || trip.request_number || trip.booking_number,
        display_id: trip.request_number || trip.booking_number || trip.name,
        vehicle_plate: trip.vehicle_plate || trip.casual_driver_vehicle_plate || trip.subcontractor_vehicle_plate
      };
    };

    let trips = [
        ...serviceRequests.map(t => formatTrip(t, 'ServiceRequest')),
        ...ownBookings.map(t => formatTrip(t, 'SupplierOwnBooking')),
        ...bookings.map(t => formatTrip(t, 'Booking')),
        ...eventTrips.map(t => formatTrip(t, 'EventTrip'))
    ];
    
    if (targetDriverIdSet) {
        trips = trips.filter(t => t.driver_id && targetDriverIdSet.has(t.driver_id));
    } else {
        // Return all trips that have ANY driver associated
        trips = trips.filter(t => t.driver_id);
    }

    // Filter out cancelled trips and sort by time
    const activeTrips = trips
      .filter(t => !['cancelada', 'cancelled', 'cancelado'].includes(t.status))
      .sort((a, b) => {
        const timeA = a.time || '00:00';
        const timeB = b.time || '00:00';
        return timeA.localeCompare(timeB);
      });

    // Map drivers to their vehicles
    const driversInfo = allActiveDrivers.map(driver => {
        const vehicles = allDriverVehicles.filter(v => v.driver_id === driver.id);
        const defaultVehicle = vehicles.find(v => v.is_default) || vehicles[0];
        return {
            id: driver.id,
            name: driver.name,
            default_plate: defaultVehicle ? defaultVehicle.vehicle_plate : null
        };
    });

    return Response.json({ trips: activeTrips, drivers_info: driversInfo });

  } catch (error) {
    console.error('Error fetching driver schedule:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});