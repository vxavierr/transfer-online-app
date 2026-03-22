Deno.serve(async (req) => {
  try {
    // Tratamento básico de CORS para garantir acesso público
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const body = await req.json();
    const { origin, destination, waypoints } = body;

    if (!origin || !destination) {
      return Response.json(
        { error: 'Origem e destino são obrigatórios' },
        { status: 400 }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return Response.json(
        { error: 'Google Maps API Key não configurada' },
        { status: 500 }
      );
    }

    // Se houver waypoints (pontos intermediários), usar Directions API
    // Caso contrário, usar Distance Matrix API (mais simples)
    if (waypoints && waypoints.length > 0) {
      // Usar Directions API para rotas com múltiplos pontos
      const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
      url.searchParams.append('origin', origin);
      url.searchParams.append('destination', destination);
      url.searchParams.append('waypoints', waypoints.join('|'));
      url.searchParams.append('key', apiKey);
      url.searchParams.append('language', 'pt-BR');
      url.searchParams.append('units', 'metric');

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status !== 'OK') {
        return Response.json(
          { error: 'Erro ao calcular rota', details: data },
          { status: 400 }
        );
      }

      const route = data.routes[0];
      if (!route) {
        return Response.json(
          { error: 'Rota não encontrada' },
          { status: 404 }
        );
      }

      // Somar todas as distâncias e durações dos legs (segmentos)
      let totalDistanceMeters = 0;
      let totalDurationSeconds = 0;

      route.legs.forEach(leg => {
        totalDistanceMeters += leg.distance.value;
        totalDurationSeconds += leg.duration.value;
      });

      return Response.json({
        origin_address: route.legs[0].start_address,
        destination_address: route.legs[route.legs.length - 1].end_address,
        waypoints_addresses: route.legs.slice(0, -1).map(leg => leg.end_address),
        distance: {
          text: `${(totalDistanceMeters / 1000).toFixed(2)} km`,
          value: totalDistanceMeters
        },
        duration: {
          text: `${Math.ceil(totalDurationSeconds / 60)} min`,
          value: totalDurationSeconds
        },
        distance_km: (totalDistanceMeters / 1000).toFixed(2),
        duration_minutes: Math.ceil(totalDurationSeconds / 60),
        legs: route.legs.map(leg => ({
          start_address: leg.start_address,
          end_address: leg.end_address,
          distance_km: (leg.distance.value / 1000).toFixed(2),
          duration_minutes: Math.ceil(leg.duration.value / 60)
        }))
      });
    } else {
      // Usar Distance Matrix API para rotas simples (origem → destino)
      const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
      url.searchParams.append('origins', origin);
      url.searchParams.append('destinations', destination);
      url.searchParams.append('key', apiKey);
      url.searchParams.append('language', 'pt-BR');
      url.searchParams.append('units', 'metric');

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status !== 'OK') {
        return Response.json(
          { error: 'Erro ao calcular rota', details: data },
          { status: 400 }
        );
      }

      const element = data.rows[0]?.elements[0];
      
      if (!element || element.status !== 'OK') {
        return Response.json(
          { error: 'Rota não encontrada entre origem e destino', details: element },
          { status: 404 }
        );
      }

      return Response.json({
        origin_address: data.origin_addresses[0],
        destination_address: data.destination_addresses[0],
        distance: {
          text: element.distance.text,
          value: element.distance.value
        },
        duration: {
          text: element.duration.text,
          value: element.duration.value
        },
        distance_km: (element.distance.value / 1000).toFixed(2),
        duration_minutes: Math.ceil(element.duration.value / 60)
      });
    }

  } catch (error) {
    console.error('Erro ao calcular distância:', error);
    return Response.json(
      { error: error.message || 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
});