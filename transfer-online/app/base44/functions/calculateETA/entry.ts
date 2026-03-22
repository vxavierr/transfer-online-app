import { createClientFromRequest } from 'npm:@base44/sdk@0.8.11';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse do body
    const body = await req.json();
    const { origin, destination } = body;

    // Validações
    if (!origin || !destination) {
      return Response.json({ 
        error: 'origin e destination são obrigatórios' 
      }, { status: 400 });
    }

    // Obter a chave da API do Google Maps
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!googleMapsApiKey) {
      return Response.json({ 
        error: 'Google Maps API Key não configurada' 
      }, { status: 500 });
    }

    // Fazer requisição para a API Distance Matrix do Google Maps
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.append('origins', origin);
    url.searchParams.append('destinations', destination);
    url.searchParams.append('mode', 'driving');
    url.searchParams.append('departure_time', 'now'); // Para considerar tráfego em tempo real
    url.searchParams.append('traffic_model', 'best_guess');
    url.searchParams.append('key', googleMapsApiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      return Response.json({ 
        error: `Erro ao calcular ETA: ${data.status}`,
        details: data.error_message 
      }, { status: 400 });
    }

    const element = data.rows[0]?.elements[0];

    if (!element || element.status !== 'OK') {
      return Response.json({ 
        error: 'Não foi possível calcular a rota',
        details: element?.status 
      }, { status: 400 });
    }

    // Extrair duração em segundos e converter para minutos
    const durationSeconds = element.duration_in_traffic?.value || element.duration?.value || 0;
    const durationMinutes = Math.ceil(durationSeconds / 60);

    // Distância em metros
    const distanceMeters = element.distance?.value || 0;
    const distanceKm = (distanceMeters / 1000).toFixed(2);

    // Calcular o horário de chegada previsto
    const now = new Date();
    const etaDate = new Date(now.getTime() + (durationSeconds * 1000));

    return Response.json({
      success: true,
      eta_minutes: durationMinutes,
      eta_seconds: durationSeconds,
      distance_km: parseFloat(distanceKm),
      distance_meters: distanceMeters,
      eta_timestamp: etaDate.toISOString(),
      duration_text: element.duration_in_traffic?.text || element.duration?.text || `${durationMinutes} mins`,
      distance_text: element.distance?.text || `${distanceKm} km`
    });

  } catch (error) {
    console.error('[calculateETA] Erro:', error);
    return Response.json({
      error: error.message || 'Erro ao calcular ETA'
    }, { status: 500 });
  }
});