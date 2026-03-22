import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function calculateRouteDistance(apiKey, origin, destination, waypoints = []) {
  if (waypoints && waypoints.length > 0) {
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.append('origin', origin);
    url.searchParams.append('destination', destination);
    url.searchParams.append('waypoints', waypoints.join('|'));
    url.searchParams.append('key', apiKey);
    url.searchParams.append('language', 'pt-BR');
    url.searchParams.append('units', 'metric');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' || !data.routes?.[0]) {
      throw new Error(data.error_message || 'Erro ao calcular rota');
    }

    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;

    data.routes[0].legs.forEach((leg) => {
      totalDistanceMeters += leg.distance.value;
      totalDurationSeconds += leg.duration.value;
    });

    return {
      distance_km: Number((totalDistanceMeters / 1000).toFixed(2)),
      duration_minutes: Math.ceil(totalDurationSeconds / 60),
    };
  }

  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
  url.searchParams.append('origins', origin);
  url.searchParams.append('destinations', destination);
  url.searchParams.append('key', apiKey);
  url.searchParams.append('language', 'pt-BR');
  url.searchParams.append('units', 'metric');

  const response = await fetch(url.toString());
  const data = await response.json();
  const element = data.rows?.[0]?.elements?.[0];

  if (data.status !== 'OK' || !element || element.status !== 'OK') {
    throw new Error(data.error_message || 'Rota não encontrada entre origem e destino');
  }

  return {
    distance_km: Number((element.distance.value / 1000).toFixed(2)),
    duration_minutes: Math.ceil(element.duration.value / 60),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const { 
      service_type, 
      vehicle_type_id, 
      origin, 
      destination, 
      date, 
      time, 
      return_date, 
      return_time, 
      hours,
      driver_language = 'pt',
      is_internal_call
    } = body;

    // Preços públicos liberados nesta tela, sem exigir login.
    // is_internal_call continua disponível apenas para chamadas internas entre funções.

    if (!service_type || !vehicle_type_id) {
      return Response.json(
        { error: 'Tipo de serviço e tipo de veículo são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar configuração do endereço base do fornecedor
    const configs = await base44.asServiceRole.entities.AppConfig.filter({ 
      config_key: 'supplier_base_address' 
    });
    
    if (!configs || configs.length === 0) {
      return Response.json(
        { error: 'Endereço base do fornecedor não configurado no sistema' },
        { status: 400 }
      );
    }

    const supplierBaseAddress = configs[0].config_value;
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

    if (!apiKey) {
      return Response.json(
        { error: 'Google Maps API Key não configurada' },
        { status: 500 }
      );
    }

    // Buscar dados do veículo
    const vehicles = await base44.asServiceRole.entities.VehicleType.list();
    const vehicle = vehicles.find(v => v.id === vehicle_type_id);

    if (!vehicle) {
      return Response.json(
        { error: 'Tipo de veículo não encontrado' },
        { status: 404 }
      );
    }

    if (!vehicle.active) {
      return Response.json(
        { error: 'Tipo de veículo não está ativo' },
        { status: 400 }
      );
    }

    // Buscar configuração de desconto para ida e volta
    const discountConfigs = await base44.asServiceRole.entities.AppConfig.filter({
      config_key: 'round_trip_discount_percentage'
    });
    const roundTripDiscountPercentage = discountConfigs.length > 0 
      ? parseFloat(discountConfigs[0].config_value) || 0 
      : 0;

    let pricing = {
      total_price: 0,
      calculation_details: {}
    };

    const calculation_details = pricing.calculation_details;

    // Cálculo para ONE_WAY
    if (service_type === 'one_way') {
      if (!origin || !destination) {
        return Response.json(
          { error: 'Origem e destino são obrigatórios para one_way' },
          { status: 400 }
        );
      }

      console.log(`[calculateTransferPrice] Calculando distância para one_way: { base: '${supplierBaseAddress}', origin: '${origin}', destination: '${destination}' }`);

      let distanceResult;
      try {
        distanceResult = await calculateRouteDistance(apiKey, supplierBaseAddress, supplierBaseAddress, [origin, destination]);
      } catch (distErr) {
        console.error('[calculateTransferPrice] Erro no cálculo de distância:', distErr);
        return Response.json({ error: `Falha ao calcular rota: ${distErr.message}` }, { status: 500 });
      }

      const supplierTotalDistanceKm = distanceResult.distance_km;
      const supplierDurationMinutes = distanceResult.duration_minutes;

      calculation_details.supplier_base_address = supplierBaseAddress;
      calculation_details.supplier_total_distance_km = supplierTotalDistanceKm;
      calculation_details.supplier_duration_minutes = supplierDurationMinutes;
      calculation_details.customer_origin = origin;
      calculation_details.customer_destination = destination;

      // Cálculo do preço base
      let basePrice = supplierTotalDistanceKm * vehicle.base_price_per_km;

      // Cálculo de Pedágios (ONE_WAY)
      let tollsCost = 0;
      try {
        // Tentar calcular pedágios, mas não falhar a cotação inteira se falhar (especialmente por auth)
        // Passar flag is_internal_call no corpo para tentar contornar auth se a função suportar
        const tollsResponse = await base44.asServiceRole.functions.invoke('calculateTolls', {
          origin: supplierBaseAddress,
          destination: supplierBaseAddress,
          waypoints: [origin, destination],
          vehicle_type: vehicle.name,
          is_internal_call: true 
        });

        if (tollsResponse.data && tollsResponse.data.success) {
          tollsCost = tollsResponse.data.tolls_cost || 0;
          calculation_details.tolls_included = true;
          calculation_details.tolls_cost = tollsCost;
        } else {
          calculation_details.tolls_included = false;
          calculation_details.tolls_error = true;
        }
      } catch (tollError) {
        console.error('[calculateTransferPrice] Error invoking calculateTolls:', tollError);
        calculation_details.tolls_included = false;
        calculation_details.tolls_error = true;
      }

      basePrice += tollsCost;

      calculation_details.distance_based_price = basePrice;
      calculation_details.base_price_per_km = vehicle.base_price_per_km;

      // Aplicar franquia mínima se configurada
      if (vehicle.min_km_franchise > 0 && vehicle.min_price_for_franchise > 0) {
        calculation_details.min_km_franchise = vehicle.min_km_franchise;
        calculation_details.min_price_for_franchise = vehicle.min_price_for_franchise;

        if (supplierTotalDistanceKm <= vehicle.min_km_franchise) {
          // Dentro da franquia: cobrar o maior valor entre o calculado e o preço da franquia
          basePrice = Math.max(basePrice, vehicle.min_price_for_franchise);
          calculation_details.franchise_applied = true;
        } else {
          // Fora da franquia: garantir que não seja menor que o preço da franquia
          basePrice = Math.max(basePrice, vehicle.min_price_for_franchise);
          calculation_details.franchise_applied = false;
        }
      }

      // Aplicar preço mínimo
      if (vehicle.min_price_one_way && basePrice < vehicle.min_price_one_way) {
        basePrice = vehicle.min_price_one_way;
        calculation_details.min_price_applied = true;
        calculation_details.min_price_one_way = vehicle.min_price_one_way;
      }

      let finalPrice = basePrice;

      // Sobretaxa de idioma
      let languageSurcharge = 0;
      if (driver_language === 'en' && vehicle.language_surcharge_en > 0) {
        if (vehicle.language_surcharge_en_type === 'percentage') {
          languageSurcharge = (finalPrice * vehicle.language_surcharge_en) / 100;
        } else {
          languageSurcharge = vehicle.language_surcharge_en;
        }
        calculation_details.language_surcharge_en = languageSurcharge;
        calculation_details.language_surcharge_en_type = vehicle.language_surcharge_en_type;
      } else if (driver_language === 'es' && vehicle.language_surcharge_es > 0) {
        if (vehicle.language_surcharge_es_type === 'percentage') {
          languageSurcharge = (finalPrice * vehicle.language_surcharge_es) / 100;
        } else {
          languageSurcharge = vehicle.language_surcharge_es;
        }
        calculation_details.language_surcharge_es = languageSurcharge;
        calculation_details.language_surcharge_es_type = vehicle.language_surcharge_es_type;
      }

      finalPrice += languageSurcharge;
      calculation_details.driver_language = driver_language;

      pricing.total_price = Math.round(finalPrice * 100) / 100;

      // CORREÇÃO: Verificar raio de atuação comparando o ciclo completo
      if (vehicle.operational_radius_km && vehicle.operational_radius_km > 0) {
        calculation_details.operational_radius_km = vehicle.operational_radius_km;
        calculation_details.outside_operational_radius = supplierTotalDistanceKm > vehicle.operational_radius_km;
      }

    } 
    // Cálculo para ROUND_TRIP
    else if (service_type === 'round_trip') {
      if (!origin || !destination) {
        return Response.json(
          { error: 'Origem e destino são obrigatórios para round_trip' },
          { status: 400 }
        );
      }

      console.log(`[calculateTransferPrice] Calculando round_trip como 2 viagens independentes (Ida + Volta). Base: ${supplierBaseAddress}`);

      let leg1Result, leg2Result;
      
      try {
        [leg1Result, leg2Result] = await Promise.all([
          calculateRouteDistance(apiKey, supplierBaseAddress, supplierBaseAddress, [origin, destination]),
          calculateRouteDistance(apiKey, supplierBaseAddress, supplierBaseAddress, [destination, origin])
        ]);
      } catch (distErr) {
         console.error('[calculateTransferPrice] Erro no cálculo de distância (RT):', distErr);
         return Response.json({ error: `Falha ao calcular rota (RT): ${distErr.message}` }, { status: 500 });
      }

      const dist1 = parseFloat(leg1Result.distance_km);
      const dist2 = parseFloat(leg2Result.distance_km);
      const dur1 = leg1Result.duration_minutes;
      const dur2 = leg2Result.duration_minutes;

      const supplierTotalDistanceKm = dist1 + dist2;
      const supplierDurationMinutes = dur1 + dur2;

      calculation_details.supplier_base_address = supplierBaseAddress;
      calculation_details.supplier_total_distance_km = supplierTotalDistanceKm;
      calculation_details.supplier_duration_minutes = supplierDurationMinutes;
      calculation_details.customer_origin = origin;
      calculation_details.customer_destination = destination;
      calculation_details.breakdown = { leg1_km: dist1, leg2_km: dist2 };

      // Cálculo separado por perna para garantir aplicação correta de mínimos
      let priceLeg1 = dist1 * vehicle.base_price_per_km;
      let priceLeg2 = dist2 * vehicle.base_price_per_km;

      calculation_details.leg1_base_price = priceLeg1;
      calculation_details.leg2_base_price = priceLeg2;

      // Aplicar franquia mínima por perna (se configurada e aplicável)
      // Nota: Se a franquia for "por viagem", aplicamos a cada perna como uma viagem independente
      if (vehicle.min_km_franchise > 0 && vehicle.min_price_for_franchise > 0) {
        calculation_details.min_km_franchise = vehicle.min_km_franchise;
        calculation_details.min_price_for_franchise = vehicle.min_price_for_franchise;

        if (dist1 <= vehicle.min_km_franchise) priceLeg1 = Math.max(priceLeg1, vehicle.min_price_for_franchise);
        if (dist2 <= vehicle.min_km_franchise) priceLeg2 = Math.max(priceLeg2, vehicle.min_price_for_franchise);
      }

      // Aplicar preço mínimo de One Way para cada perna (para garantir valor justo)
      // Isso resolve o problema de viagens curtas ida e volta ficarem baratas demais
      if (vehicle.min_price_one_way > 0) {
         priceLeg1 = Math.max(priceLeg1, vehicle.min_price_one_way);
         priceLeg2 = Math.max(priceLeg2, vehicle.min_price_one_way);
         calculation_details.min_price_per_leg_applied = true;
      }

      let basePrice = priceLeg1 + priceLeg2;

      // Cálculo de Pedágios (ROUND_TRIP - 2 Legs)
      let tollsCost = 0;
      let tollsIncluded = true;
      let tollsError = false;

      try {
        const [tolls1, tolls2] = await Promise.all([
          base44.asServiceRole.functions.invoke('calculateTolls', {
            origin: supplierBaseAddress,
            destination: supplierBaseAddress,
            waypoints: [origin, destination],
            vehicle_type: vehicle.name,
            is_internal_call: true
          }),
          base44.asServiceRole.functions.invoke('calculateTolls', {
            origin: supplierBaseAddress,
            destination: supplierBaseAddress,
            waypoints: [destination, origin],
            vehicle_type: vehicle.name,
            is_internal_call: true
          })
        ]);

        if (tolls1.data?.success) tollsCost += (tolls1.data.tolls_cost || 0);
        else if (tolls1.data?.tolls_cost === undefined) { tollsIncluded = false; tollsError = true; }

        if (tolls2.data?.success) tollsCost += (tolls2.data.tolls_cost || 0);
        else if (tolls2.data?.tolls_cost === undefined) { tollsIncluded = false; tollsError = true; }

      } catch (tollError) {
        console.error('[calculateTransferPrice] Error invoking calculateTolls (RT):', tollError);
        tollsIncluded = false;
        tollsError = true;
      }

      calculation_details.tolls_included = tollsIncluded;
      calculation_details.tolls_error = tollsError;
      calculation_details.tolls_cost = tollsCost;

      basePrice += tollsCost;

      calculation_details.distance_based_price = basePrice;
      calculation_details.base_price_per_km = vehicle.base_price_per_km;

      // Aplicar preço mínimo global de Ida e Volta (se configurado e for maior que a soma das pernas)
      if (vehicle.min_price_round_trip && basePrice < vehicle.min_price_round_trip) {
        basePrice = vehicle.min_price_round_trip;
        calculation_details.min_price_applied = true;
        calculation_details.min_price_round_trip = vehicle.min_price_round_trip;
      }

      // Aplicar desconto de ida e volta
      let discountAmount = 0;
      if (roundTripDiscountPercentage > 0) {
        discountAmount = (basePrice * roundTripDiscountPercentage) / 100;
        calculation_details.round_trip_discount_percentage = roundTripDiscountPercentage;
        calculation_details.round_trip_discount_amount = discountAmount;
      }

      let finalPrice = basePrice - discountAmount;

      // Sobretaxa de idioma
      let languageSurcharge = 0;
      if (driver_language === 'en' && vehicle.language_surcharge_en > 0) {
        if (vehicle.language_surcharge_en_type === 'percentage') {
          languageSurcharge = (finalPrice * vehicle.language_surcharge_en) / 100;
        } else {
          languageSurcharge = vehicle.language_surcharge_en;
        }
        calculation_details.language_surcharge_en = languageSurcharge;
        calculation_details.language_surcharge_en_type = vehicle.language_surcharge_en_type;
      } else if (driver_language === 'es' && vehicle.language_surcharge_es > 0) {
        if (vehicle.language_surcharge_es_type === 'percentage') {
          languageSurcharge = (finalPrice * vehicle.language_surcharge_es) / 100;
        } else {
          languageSurcharge = vehicle.language_surcharge_es;
        }
        calculation_details.language_surcharge_es = languageSurcharge;
        calculation_details.language_surcharge_es_type = vehicle.language_surcharge_es_type;
      }

      finalPrice += languageSurcharge;
      calculation_details.driver_language = driver_language;

      pricing.total_price = Math.round(finalPrice * 100) / 100;

      // CORREÇÃO: Verificar raio de atuação comparando o ciclo completo
      if (vehicle.operational_radius_km && vehicle.operational_radius_km > 0) {
        calculation_details.operational_radius_km = vehicle.operational_radius_km;
        calculation_details.outside_operational_radius = supplierTotalDistanceKm > vehicle.operational_radius_km;
      }

    } 
    // Cálculo para HOURLY
    else if (service_type === 'hourly') {
      if (!hours || hours < 5) {
        return Response.json(
          { error: 'Número de horas deve ser no mínimo 5' },
          { status: 400 }
        );
      }

      calculation_details.hours = hours;

      let hourlyPrice = 0;
      let kmAllowance = 0;

      // Pacotes fixos
      if (hours === 5 && vehicle.hourly_5_hours_price > 0) {
        hourlyPrice = vehicle.hourly_5_hours_price;
        kmAllowance = vehicle.hourly_5_hours_km_allowance || 50;
        calculation_details.package_type = '5_hours';
      } else if (hours === 10 && vehicle.hourly_10_hours_price > 0) {
        hourlyPrice = vehicle.hourly_10_hours_price;
        kmAllowance = vehicle.hourly_10_hours_km_allowance || 100;
        calculation_details.package_type = '10_hours';
      } else {
        // Cálculo customizado baseado em hora
        const baseHourlyRate = vehicle.base_price_per_hour || (vehicle.base_price_per_km * 50);
        hourlyPrice = baseHourlyRate * hours;
        kmAllowance = (vehicle.hourly_km_allowance_per_hour || 12) * hours;
        calculation_details.package_type = 'custom';
        calculation_details.base_hourly_rate = baseHourlyRate;
      }

      calculation_details.hourly_price = hourlyPrice;
      calculation_details.km_allowance = kmAllowance;

      let finalPrice = hourlyPrice;

      // Sobretaxa de idioma
      let languageSurcharge = 0;
      if (driver_language === 'en' && vehicle.language_surcharge_en > 0) {
        if (vehicle.language_surcharge_en_type === 'percentage') {
          languageSurcharge = (finalPrice * vehicle.language_surcharge_en) / 100;
        } else {
          languageSurcharge = vehicle.language_surcharge_en;
        }
        calculation_details.language_surcharge_en = languageSurcharge;
        calculation_details.language_surcharge_en_type = vehicle.language_surcharge_en_type;
      } else if (driver_language === 'es' && vehicle.language_surcharge_es > 0) {
        if (vehicle.language_surcharge_es_type === 'percentage') {
          languageSurcharge = (finalPrice * vehicle.language_surcharge_es) / 100;
        } else {
          languageSurcharge = vehicle.language_surcharge_es;
        }
        calculation_details.language_surcharge_es = languageSurcharge;
        calculation_details.language_surcharge_es_type = vehicle.language_surcharge_es_type;
      }

      finalPrice += languageSurcharge;
      calculation_details.driver_language = driver_language;

      pricing.total_price = Math.round(finalPrice * 100) / 100;

      // Para serviço por hora, não aplicamos verificação de raio de atuação
      // pois é um serviço local com km limitado
    } 
    else {
      return Response.json(
        { error: 'Tipo de serviço inválido' },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      pricing: pricing
    });

  } catch (error) {
    console.error('[calculateTransferPrice] Erro:', error);
    return Response.json(
      { error: error.message || 'Erro ao calcular preço' },
      { status: 500 }
    );
  }
});