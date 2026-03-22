import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Calcula distância diretamente via Google Maps (sem depender de outra função)
async function calculateDistanceDirect({ origin, destination, waypoints }) {
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY não configurada');

  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.append('origin', origin);
  url.searchParams.append('destination', destination);
  if (waypoints && waypoints.length > 0) {
    url.searchParams.append('waypoints', waypoints.join('|'));
  }
  url.searchParams.append('key', apiKey);
  url.searchParams.append('language', 'pt-BR');
  url.searchParams.append('units', 'metric');

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== 'OK') throw new Error(`Google Maps erro: ${data.status}`);

  const route = data.routes[0];
  let totalDistanceMeters = 0;
  let totalDurationSeconds = 0;
  route.legs.forEach(leg => {
    totalDistanceMeters += leg.distance.value;
    totalDurationSeconds += leg.duration.value;
  });

  return {
    distance_km: (totalDistanceMeters / 1000).toFixed(2),
    duration_minutes: Math.ceil(totalDurationSeconds / 60),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const {
      supplier_id,
      vehicle_type_id,
      service_type,
      origin,
      destination,
      date,
      time,
      return_date,
      return_time,
      hours,
      additional_stops,
      driver_language = 'pt'
    } = body;

    console.log('[calculateSupplierPrice] Iniciando cálculo:', {
      supplier_id,
      vehicle_type_id,
      service_type,
      origin,
      destination
    });

    if (!supplier_id || !service_type) {
      console.error('[calculateSupplierPrice] Parâmetros obrigatórios faltando');
      return Response.json(
        { error: 'supplier_id e service_type são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar dados do fornecedor
    const suppliers = await base44.asServiceRole.entities.Supplier.list();
    const supplier = suppliers.find(p => p.id === supplier_id);

    if (!supplier || !supplier.active) {
      console.error('[calculateSupplierPrice] Fornecedor não encontrado ou inativo');
      return Response.json(
        { error: 'Fornecedor não encontrado ou inativo' },
        { status: 404 }
      );
    }

    console.log('[calculateSupplierPrice] Fornecedor encontrado:', supplier.name);

    // Buscar veículo específico ou todos os veículos do fornecedor
    let vehiclesToCalculate = [];
    
    if (vehicle_type_id) {
      const vehicle = await base44.asServiceRole.entities.SupplierVehicleType.get(vehicle_type_id);
      if (vehicle && vehicle.active && vehicle.approval_status === 'approved' && vehicle.supplier_id === supplier_id) {
        vehiclesToCalculate = [vehicle];
      }
    } else {
      vehiclesToCalculate = await base44.asServiceRole.entities.SupplierVehicleType.filter({
        supplier_id: supplier_id,
        active: true,
        approval_status: 'approved'
      });
    }

    if (!vehiclesToCalculate || vehiclesToCalculate.length === 0) {
      console.error('[calculateSupplierPrice] Nenhum veículo aprovado encontrado');
      return Response.json({
        success: false,
        error: 'Fornecedor não possui veículos aprovados e ativos'
      }, { status: 400 });
    }

    console.log('[calculateSupplierPrice] Veículos a calcular:', vehiclesToCalculate.length);

    // Buscar endereço base do fornecedor
    let baseAddress = supplier.base_address;
    
    if (!baseAddress) {
      const configs = await base44.asServiceRole.entities.AppConfig.filter({
        config_key: 'supplier_base_address'
      });
      baseAddress = configs.length > 0 ? configs[0].config_value : null;
    }

    if (!baseAddress) {
      console.error('[calculateSupplierPrice] Endereço base não configurado');
      return Response.json({
        success: false,
        error: 'Endereço base não configurado para o fornecedor'
      }, { status: 400 });
    }

    console.log('[calculateSupplierPrice] Endereço base:', baseAddress);

    // Calcular para o primeiro veículo (ou único veículo se vehicle_type_id foi especificado)
    const vehicle = vehiclesToCalculate[0];

    try {
      let distanceData = null;
      let totalDistanceKm = 0;
      let durationMinutes = 0;

      console.log('[calculateSupplierPrice] Calculando distância para veículo:', vehicle.name);

      // CALCULAR DISTÂNCIA CONFORME O TIPO DE SERVIÇO
      if (service_type === 'one_way') {
        // ONE_WAY: Base -> Origem -> Destino -> Base
        const distResult = await calculateDistanceDirect({
          origin: baseAddress,
          waypoints: [origin, destination],
          destination: baseAddress
        });
        console.log('[calculateSupplierPrice] Resultado distância (one_way):', distResult);
        totalDistanceKm = parseFloat(distResult.distance_km);
        durationMinutes = distResult.duration_minutes;
        distanceData = distResult;

      } else if (service_type === 'round_trip') {
        console.log('[calculateSupplierPrice] Calculando IDA e VOLTA separadamente...');
        const [outboundResult, returnResult] = await Promise.all([
          calculateDistanceDirect({ origin: baseAddress, waypoints: [origin, destination], destination: baseAddress }),
          calculateDistanceDirect({ origin: baseAddress, waypoints: [destination, origin], destination: baseAddress })
        ]);
        const outboundDistanceKm = parseFloat(outboundResult.distance_km);
        const returnDistanceKm = parseFloat(returnResult.distance_km);
        totalDistanceKm = outboundDistanceKm + returnDistanceKm;
        durationMinutes = outboundResult.duration_minutes + returnResult.duration_minutes;
        console.log('[calculateSupplierPrice] ✅ ROUND TRIP - IDA:', outboundDistanceKm, 'km + VOLTA:', returnDistanceKm, 'km = TOTAL:', totalDistanceKm, 'km');
        distanceData = {
          distance_km: totalDistanceKm,
          duration_minutes: durationMinutes,
          outbound_distance_km: outboundDistanceKm,
          return_distance_km: returnDistanceKm,
          outbound_duration_minutes: outboundResult.duration_minutes,
          return_duration_minutes: returnResult.duration_minutes
        };

      } else if (service_type === 'hourly') {
        const waypointsHourly = [origin];
        if (additional_stops && additional_stops.length > 0) waypointsHourly.push(...additional_stops);
        if (destination && destination.trim() !== '') waypointsHourly.push(destination);
        const distResult = await calculateDistanceDirect({
          origin: baseAddress,
          waypoints: waypointsHourly,
          destination: baseAddress
        });
        console.log('[calculateSupplierPrice] Resultado distância (hourly):', distResult);
        totalDistanceKm = parseFloat(distResult.distance_km);
        durationMinutes = distResult.duration_minutes;
        distanceData = distResult;
      }

      // CALCULAR PREÇO BASE
      let basePrice = 0;
      const calcDetails = {
        vehicle_id: vehicle.id,
        vehicle_name: vehicle.name,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        base_address: baseAddress,
        supplier_total_distance_km: totalDistanceKm,
        service_type: service_type
      };

      if (service_type === 'hourly') {
        // CÁLCULO POR HORA
        if (!hours || hours < 5) {
          console.error('[calculateSupplierPrice] Horas inválidas para serviço hourly');
          return Response.json({
            success: false,
            error: 'Quantidade de horas inválida (mínimo 5)'
          }, { status: 400 });
        }

        let packagePrice = 0;
        let kmAllowance = 0;

        // Determinar preço do pacote e franquia de KM
        if (hours === 5 && vehicle.hourly_5_hours_price > 0) {
          packagePrice = vehicle.hourly_5_hours_price;
          kmAllowance = vehicle.hourly_5_hours_km_allowance || 50;
          calcDetails.package_type = '5_hours';
        } else if (hours === 10 && vehicle.hourly_10_hours_price > 0) {
          packagePrice = vehicle.hourly_10_hours_price;
          kmAllowance = vehicle.hourly_10_hours_km_allowance || 100;
          calcDetails.package_type = '10_hours';
        } else {
          // Pacote customizado
          const hourlyRate = vehicle.base_price_per_hour || (vehicle.base_price_per_km * 50);
          packagePrice = hourlyRate * hours;
          kmAllowance = (vehicle.hourly_km_allowance_per_hour || 12) * hours;
          calcDetails.package_type = 'custom';
        }

        calcDetails.hours = hours;
        calcDetails.package_price = packagePrice;
        calcDetails.km_allowance = kmAllowance;
        calcDetails.total_distance_km = totalDistanceKm;

        // Calcular excedente de KM
        let kmExcess = 0;
        let kmExcessCharge = 0;

        if (totalDistanceKm > kmAllowance) {
          kmExcess = totalDistanceKm - kmAllowance;
          kmExcessCharge = kmExcess * (vehicle.additional_price_per_km || vehicle.base_price_per_km || 0);
          calcDetails.km_excess = kmExcess;
          calcDetails.km_excess_charge = kmExcessCharge;
          console.log('[calculateSupplierPrice] Excedente de KM:', kmExcess, 'km - Cobrança:', kmExcessCharge);
        }

        basePrice = packagePrice + kmExcessCharge;
        console.log('[calculateSupplierPrice] Preço base (hourly):', basePrice, '(Pacote:', packagePrice, '+ Excedente KM:', kmExcessCharge, ')');

      } else {
        // CÁLCULO POR DISTÂNCIA (one_way ou round_trip)
        if (totalDistanceKm === 0) {
          console.error('[calculateSupplierPrice] Distância zero, não pode calcular');
          return Response.json({
            success: false,
            error: 'Não foi possível calcular a distância'
          }, { status: 400 });
        }

        // Preço = KM total * valor por KM
        basePrice = totalDistanceKm * vehicle.base_price_per_km;
        calcDetails.total_distance_km = totalDistanceKm;
        calcDetails.duration_minutes = durationMinutes;
        calcDetails.base_price_per_km = vehicle.base_price_per_km;
        calcDetails.calculated_price = basePrice;
        
        if (service_type === 'round_trip' && distanceData) {
          calcDetails.outbound_distance_km = distanceData.outbound_distance_km;
          calcDetails.return_distance_km = distanceData.return_distance_km;
        }

        // CÁLCULO DE PEDÁGIOS
        let tollsCost = 0;
        try {
          console.log('[calculateSupplierPrice] Calculando pedágios...');
          let tollsWaypoints = [];
          
          if (service_type === 'one_way') {
            tollsWaypoints = [origin, destination];
          } else if (service_type === 'round_trip') {
            tollsWaypoints = [origin, destination, origin];
          }

          if (tollsWaypoints.length > 0) {
            // Usar rota completa base -> origem -> destino -> base para cobrir todo o custo operacional
            const tollsResponse = await base44.asServiceRole.functions.invoke('calculateTolls', {
              origin: baseAddress,
              destination: baseAddress,
              waypoints: tollsWaypoints,
              vehicle_type: vehicle.name,
              is_internal_call: true
            });

            if (tollsResponse.data && tollsResponse.data.success) {
              tollsCost = tollsResponse.data.tolls_cost || 0;
              calcDetails.tolls_included = true;
              calcDetails.tolls_cost = tollsCost;
              console.log('[calculateSupplierPrice] Pedágios calculados:', tollsCost);
            } else {
              console.warn('[calculateSupplierPrice] Falha ao calcular pedágios:', tollsResponse.data?.error);
              calcDetails.tolls_included = false;
              calcDetails.tolls_error = true;
            }
          }
        } catch (tollError) {
          console.error('[calculateSupplierPrice] Erro ao invocar calculateTolls:', tollError);
          calcDetails.tolls_included = false;
          calcDetails.tolls_error = true;
        }

        // Adicionar pedágios ao preço base
        basePrice += tollsCost;

        console.log('[calculateSupplierPrice] Preço calculado (', totalDistanceKm, 'km x', vehicle.base_price_per_km, ') + Pedágios (', tollsCost, '):', basePrice);

        // APLICAR FRANQUIA MÍNIMA (se KM total < franquia, usar preço mínimo da franquia)
        if (vehicle.min_km_franchise > 0 && vehicle.min_price_for_franchise > 0) {
          if (totalDistanceKm <= vehicle.min_km_franchise) {
            const franchisePrice = vehicle.min_price_for_franchise;
            console.log('[calculateSupplierPrice] KM total (', totalDistanceKm, ') <= franquia (', vehicle.min_km_franchise, ') - Aplicando preço franquia:', franchisePrice);
            basePrice = Math.max(basePrice, franchisePrice);
            calcDetails.franchise_applied = true;
            calcDetails.franchise_km = vehicle.min_km_franchise;
            calcDetails.franchise_price = franchisePrice;
          }
        }

        // APLICAR PREÇO MÍNIMO (caso ainda seja menor que o mínimo)
        if (service_type === 'one_way' && vehicle.min_price_one_way > 0) {
          if (basePrice < vehicle.min_price_one_way) {
            console.log('[calculateSupplierPrice] Preço menor que mínimo one_way (', vehicle.min_price_one_way, ') - Ajustando');
            basePrice = vehicle.min_price_one_way;
            calcDetails.min_price_applied = true;
          }
        } else if (service_type === 'round_trip' && vehicle.min_price_round_trip > 0) {
          if (basePrice < vehicle.min_price_round_trip) {
            console.log('[calculateSupplierPrice] Preço menor que mínimo round_trip (', vehicle.min_price_round_trip, ') - Ajustando');
            basePrice = vehicle.min_price_round_trip;
            calcDetails.min_price_applied = true;
          }
        }

        calcDetails.final_base_price = basePrice;

        // VERIFICAR RAIO DE ATUAÇÃO
        if (vehicle.operational_radius_km && vehicle.operational_radius_km > 0) {
          if (totalDistanceKm > vehicle.operational_radius_km) {
            calcDetails.outside_operational_radius = true;
            console.warn('[calculateSupplierPrice] Fora do raio de atuação');
            return Response.json({
              success: false,
              error: 'Rota fora do raio de atuação do fornecedor',
              calculation_details: calcDetails
            }, { status: 400 });
          }
        }
      }

      // SOBRETAXA DE IDIOMA
      let languageSurcharge = 0;
      if (driver_language === 'en' && vehicle.language_surcharge_en > 0) {
        if (vehicle.language_surcharge_en_type === 'percentage') {
          languageSurcharge = (basePrice * vehicle.language_surcharge_en) / 100;
        } else {
          languageSurcharge = vehicle.language_surcharge_en;
        }
        calcDetails.language_surcharge = languageSurcharge;
        calcDetails.language_surcharge_type = vehicle.language_surcharge_en_type;
        console.log('[calculateSupplierPrice] Sobretaxa idioma (EN):', languageSurcharge);
      } else if (driver_language === 'es' && vehicle.language_surcharge_es > 0) {
        if (vehicle.language_surcharge_es_type === 'percentage') {
          languageSurcharge = (basePrice * vehicle.language_surcharge_es) / 100;
        } else {
          languageSurcharge = vehicle.language_surcharge_es;
        }
        calcDetails.language_surcharge = languageSurcharge;
        calcDetails.language_surcharge_type = vehicle.language_surcharge_es_type;
        console.log('[calculateSupplierPrice] Sobretaxa idioma (ES):', languageSurcharge);
      }

      const supplierCost = Math.round((basePrice + languageSurcharge) * 100) / 100;
      console.log('[calculateSupplierPrice] ✅ Custo final do fornecedor:', supplierCost);

      return Response.json({
        success: true,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        vehicle_type_id: vehicle.id,
        vehicle_name: vehicle.name,
        max_passengers: vehicle.max_passengers,
        max_luggage: vehicle.max_luggage,
        total_supplier_cost: supplierCost,
        calculation_details: calcDetails
      });

    } catch (vehicleError) {
      console.error('[calculateSupplierPrice] Erro ao calcular preço:', vehicleError);
      return Response.json({
        success: false,
        error: vehicleError.message || 'Erro ao calcular preço'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[calculateSupplierPrice] Erro geral:', error);
    return Response.json({
      success: false,
      error: error.message || 'Erro ao calcular preço'
    }, { status: 500 });
  }
});