import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    const body = await req.json();
    const { origin, destination, vehicle_type, waypoints, is_internal_call } = body;

    // Permitir chamada interna (via header ou body param) ou usuário autenticado
    if (!user && !req.headers.get('x-internal-call') && !is_internal_call) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!apiKey) {
      console.warn('[calculateTolls] GOOGLE_MAPS_API_KEY not configured.');
      return Response.json({ 
        success: false, 
        error: 'Chave GOOGLE_MAPS_API_KEY não configurada',
        tolls_cost: 0 
      });
    }

    // Prepare Intermediates (waypoints)
    const intermediates = [];
    if (waypoints && Array.isArray(waypoints)) {
      waypoints.forEach(wp => {
        if (wp && typeof wp === 'string' && wp.trim() !== '') {
          intermediates.push({ address: wp });
        }
      });
    }

    // Google Routes API URL
    const apiUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';

    // Construct Body for Google Routes API
    // Documentation: https://developers.google.com/maps/documentation/routes/compute_routes
    const requestBody = {
      origin: { address: origin },
      destination: { address: destination },
      travelMode: "DRIVE",
      extraComputations: ["TOLLS"],
      routeModifiers: {
        avoidTolls: false,
        vehicleInfo: {
          emissionType: "GASOLINE"
        }
      }
    };

    if (intermediates.length > 0) {
      requestBody.intermediates = intermediates;
    }

    // Field Mask is required to get toll info
    const fieldMask = 'routes.travelAdvisory.tollInfo,routes.distanceMeters,routes.duration';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[calculateTolls] Google API Error:', response.status, errorText);
      return Response.json({ 
        success: false, 
        error: 'Erro na requisição à API do Google Maps',
        details: errorText,
        tolls_cost: 0 
      });
    }

    const data = await response.json();
    
    let totalTollCost = 0;
    let currency = 'BRL';

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      if (route.travelAdvisory && route.travelAdvisory.tollInfo && route.travelAdvisory.tollInfo.estimatedPrice) {
        // estimatedPrice is an array of currency amounts
        const priceInfo = route.travelAdvisory.tollInfo.estimatedPrice[0];
        if (priceInfo) {
          const units = parseInt(priceInfo.units || '0', 10);
          const nanos = priceInfo.nanos || 0;
          totalTollCost = units + (nanos / 1000000000);
          currency = priceInfo.currencyCode;
        }
      }
    }

    return Response.json({
      success: true,
      tolls_cost: parseFloat(totalTollCost.toFixed(2)),
      currency: currency,
      provider: 'google_routes_api',
      // Useful for debugging if needed
      // raw_data: data 
    });

  } catch (error) {
    console.error('[calculateTolls] Internal Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message,
      tolls_cost: 0 
    }, { status: 500 });
  }
});