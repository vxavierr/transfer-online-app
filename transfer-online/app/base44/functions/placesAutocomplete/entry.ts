Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { input } = body;

    if (!input || input.trim().length < 3) {
      return Response.json({ predictions: [] });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return Response.json(
        { error: 'Google Maps API Key não configurada' },
        { status: 500 }
      );
    }

    // Tentar Google Places Autocomplete (legado)
    let predictions = [];
    let lastError = null;

    try {
      const legacyUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
      legacyUrl.searchParams.append('input', input);
      legacyUrl.searchParams.append('key', apiKey);
      legacyUrl.searchParams.append('language', 'pt-BR');
      legacyUrl.searchParams.append('components', 'country:br');

      const legacyResponse = await fetch(legacyUrl.toString());
      const legacyData = await legacyResponse.json();

      if (legacyData.status === 'OK' || legacyData.status === 'ZERO_RESULTS') {
        predictions = (legacyData.predictions || []).map(pred => ({
          place_id: pred.place_id,
          description: pred.description,
          structured_formatting: pred.structured_formatting
        }));
      } else {
        lastError = legacyData;
      }
    } catch (error) {
      lastError = { message: error.message };
    }

    // Fallback para Geocoding quando Places não estiver disponível
    if (predictions.length === 0) {
      try {
        const geocodeUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
        geocodeUrl.searchParams.append('address', input);
        geocodeUrl.searchParams.append('key', apiKey);
        geocodeUrl.searchParams.append('language', 'pt-BR');
        geocodeUrl.searchParams.append('components', 'country:BR');

        const geocodeResponse = await fetch(geocodeUrl.toString());
        const geocodeData = await geocodeResponse.json();

        if (geocodeData.status === 'OK' || geocodeData.status === 'ZERO_RESULTS') {
          predictions = (geocodeData.results || []).slice(0, 5).map(result => ({
            place_id: result.place_id,
            description: result.formatted_address,
            structured_formatting: {
              main_text: result.address_components?.[0]?.long_name || result.formatted_address,
              secondary_text: result.formatted_address
                .replace(`${result.address_components?.[0]?.long_name || ''}, `, '')
            }
          }));
        } else {
          lastError = geocodeData;
        }
      } catch (error) {
        lastError = { message: error.message };
      }
    }

    if (!predictions.length && lastError && lastError.status && lastError.status !== 'ZERO_RESULTS') {
      console.error('Erro na busca de endereços:', lastError);
      return Response.json({ predictions: [] });
    }

    return Response.json({ predictions });

  } catch (error) {
    console.error('Erro ao buscar autocomplete:', error);
    return Response.json({ predictions: [] });
  }
});