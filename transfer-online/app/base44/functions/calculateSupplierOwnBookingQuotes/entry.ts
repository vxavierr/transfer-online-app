import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      client_id, 
      supplier_id,
      service_type, 
      origin, 
      destination, 
      date,
      time,
      return_date,
      return_time,
      hours,
      driver_language 
    } = await req.json();

    if (!client_id || !supplier_id) {
      return Response.json({ error: 'Client ID and Supplier ID are required' }, { status: 400 });
    }

    // Fetch all active vehicle types for the supplier
    const vehicles = await base44.entities.SupplierVehicleType.filter({ 
      supplier_id: supplier_id, 
      active: true 
    });

    if (vehicles.length === 0) {
      return Response.json({ success: true, quotes: [] });
    }

    // Fetch supplier name for the quote
    const supplier = await base44.entities.Supplier.get(supplier_id);

    // Calculate price for each vehicle type
    const quotesPromises = vehicles.map(async (vehicle) => {
      try {
        // We reuse the logic by calling the existing function internally via invoke
        // Alternatively we could duplicate the logic, but invoke ensures consistency.
        const priceResponse = await base44.functions.invoke('calculateSupplierOwnBookingPrice', {
          client_id,
          vehicle_type_id: vehicle.id,
          service_type,
          origin,
          destination,
          hours,
          driver_language
        });

        if (priceResponse.data && priceResponse.data.success) {
          return {
            supplier_id: supplier.id,
            supplier_name: supplier.name, // Or branding_company_name
            vehicle_type_id: vehicle.id,
            vehicle_name: vehicle.name,
            vehicle_description: vehicle.description,
            max_passengers: vehicle.max_passengers,
            max_luggage: vehicle.max_luggage,
            client_price: priceResponse.data.price,
            supplier_cost: 0, // Not relevant for own booking
            margin_amount: 0,
            calculation_details: priceResponse.data.calculation_details,
            pricing_source: priceResponse.data.pricing_source
          };
        }
        return null;
      } catch (e) {
        console.error(`Error calculating price for vehicle ${vehicle.id}:`, e);
        return null;
      }
    });

    const quotes = (await Promise.all(quotesPromises)).filter(q => q !== null);

    return Response.json({ success: true, quotes });

  } catch (error) {
    console.error('Error in calculateSupplierOwnBookingQuotes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});