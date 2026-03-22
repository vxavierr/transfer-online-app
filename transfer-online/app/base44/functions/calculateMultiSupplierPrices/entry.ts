import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function calculateRouteDistance(apiKey, origin, destination, waypoints = []) {
  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.append('origin', origin);
  url.searchParams.append('destination', destination);
  if (waypoints.length > 0) {
    url.searchParams.append('waypoints', waypoints.join('|'));
  }
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

function applyLanguageSurcharge(price, vehicle, driverLanguage, details) {
  let surcharge = 0;

  if (driverLanguage === 'en' && vehicle.language_surcharge_en > 0) {
    surcharge = vehicle.language_surcharge_en_type === 'percentage'
      ? (price * vehicle.language_surcharge_en) / 100
      : vehicle.language_surcharge_en;
    details.language_surcharge_en = surcharge;
    details.language_surcharge_en_type = vehicle.language_surcharge_en_type;
  }

  if (driverLanguage === 'es' && vehicle.language_surcharge_es > 0) {
    surcharge = vehicle.language_surcharge_es_type === 'percentage'
      ? (price * vehicle.language_surcharge_es) / 100
      : vehicle.language_surcharge_es;
    details.language_surcharge_es = surcharge;
    details.language_surcharge_es_type = vehicle.language_surcharge_es_type;
  }

  details.driver_language = driverLanguage;
  return price + surcharge;
}

function calculateHourlyPrice(vehicle, hours, driverLanguage) {
  const details = { hours };
  let price = 0;

  if (hours === 5 && vehicle.hourly_5_hours_price > 0) {
    price = vehicle.hourly_5_hours_price;
    details.package_type = '5_hours';
    details.km_allowance = vehicle.hourly_5_hours_km_allowance || 50;
  } else if (hours === 10 && vehicle.hourly_10_hours_price > 0) {
    price = vehicle.hourly_10_hours_price;
    details.package_type = '10_hours';
    details.km_allowance = vehicle.hourly_10_hours_km_allowance || 100;
  } else {
    const baseHourlyRate = vehicle.base_price_per_hour || (vehicle.base_price_per_km * 50);
    price = baseHourlyRate * hours;
    details.package_type = 'custom';
    details.base_hourly_rate = baseHourlyRate;
    details.km_allowance = (vehicle.hourly_km_allowance_per_hour || 12) * hours;
  }

  price = applyLanguageSurcharge(price, vehicle, driverLanguage, details);

  return {
    supplier_cost: Math.round(price * 100) / 100,
    calculation_details: details,
  };
}

async function calculateOneWayPrice(apiKey, supplierBaseAddress, vehicle, origin, destination, driverLanguage) {
  const route = await calculateRouteDistance(apiKey, supplierBaseAddress, supplierBaseAddress, [origin, destination]);
  const details = {
    supplier_base_address: supplierBaseAddress,
    supplier_total_distance_km: route.distance_km,
    supplier_duration_minutes: route.duration_minutes,
    customer_origin: origin,
    customer_destination: destination,
    tolls_included: false,
    tolls_error: true,
    base_price_per_km: vehicle.base_price_per_km,
  };

  let price = route.distance_km * vehicle.base_price_per_km;
  details.distance_based_price = price;

  if (vehicle.min_km_franchise > 0 && vehicle.min_price_for_franchise > 0) {
    details.min_km_franchise = vehicle.min_km_franchise;
    details.min_price_for_franchise = vehicle.min_price_for_franchise;
    if (route.distance_km <= vehicle.min_km_franchise) {
      price = Math.max(price, vehicle.min_price_for_franchise);
      details.franchise_applied = true;
    }
  }

  if (vehicle.min_price_one_way && price < vehicle.min_price_one_way) {
    price = vehicle.min_price_one_way;
    details.min_price_applied = true;
    details.min_price_one_way = vehicle.min_price_one_way;
  }

  price = applyLanguageSurcharge(price, vehicle, driverLanguage, details);

  if (vehicle.operational_radius_km && vehicle.operational_radius_km > 0) {
    details.operational_radius_km = vehicle.operational_radius_km;
    details.outside_operational_radius = route.distance_km > vehicle.operational_radius_km;
  }

  return {
    supplier_cost: Math.round(price * 100) / 100,
    calculation_details: details,
  };
}

async function calculateRoundTripPrice(apiKey, supplierBaseAddress, vehicle, origin, destination, driverLanguage) {
  const outbound = await calculateOneWayPrice(apiKey, supplierBaseAddress, vehicle, origin, destination, driverLanguage);
  const inbound = await calculateOneWayPrice(apiKey, supplierBaseAddress, vehicle, destination, origin, driverLanguage);

  const totalPrice = outbound.supplier_cost + inbound.supplier_cost;
  return {
    supplier_cost: Math.round(totalPrice * 100) / 100,
    calculation_details: {
      supplier_base_address: supplierBaseAddress,
      supplier_total_distance_km: (outbound.calculation_details.supplier_total_distance_km || 0) + (inbound.calculation_details.supplier_total_distance_km || 0),
      supplier_duration_minutes: (outbound.calculation_details.supplier_duration_minutes || 0) + (inbound.calculation_details.supplier_duration_minutes || 0),
      breakdown: {
        outbound: outbound.calculation_details,
        inbound: inbound.calculation_details,
      },
      tolls_included: false,
      tolls_error: true,
      driver_language: driverLanguage,
    },
  };
}

function buildOneWayPriceFromRoute(route, supplierBaseAddress, vehicle, origin, destination, driverLanguage) {
  const details = {
    supplier_base_address: supplierBaseAddress,
    supplier_total_distance_km: route.distance_km,
    supplier_duration_minutes: route.duration_minutes,
    customer_origin: origin,
    customer_destination: destination,
    tolls_included: false,
    tolls_error: true,
    base_price_per_km: vehicle.base_price_per_km,
  };

  let price = route.distance_km * vehicle.base_price_per_km;
  details.distance_based_price = price;

  if (vehicle.min_km_franchise > 0 && vehicle.min_price_for_franchise > 0) {
    details.min_km_franchise = vehicle.min_km_franchise;
    details.min_price_for_franchise = vehicle.min_price_for_franchise;
    if (route.distance_km <= vehicle.min_km_franchise) {
      price = Math.max(price, vehicle.min_price_for_franchise);
      details.franchise_applied = true;
    }
  }

  if (vehicle.min_price_one_way && price < vehicle.min_price_one_way) {
    price = vehicle.min_price_one_way;
    details.min_price_applied = true;
    details.min_price_one_way = vehicle.min_price_one_way;
  }

  price = applyLanguageSurcharge(price, vehicle, driverLanguage, details);

  if (vehicle.operational_radius_km && vehicle.operational_radius_km > 0) {
    details.operational_radius_km = vehicle.operational_radius_km;
    details.outside_operational_radius = route.distance_km > vehicle.operational_radius_km;
  }

  return {
    supplier_cost: Math.round(price * 100) / 100,
    calculation_details: details,
  };
}

function buildRoundTripPriceFromRoutes(outboundRoute, inboundRoute, supplierBaseAddress, vehicle, origin, destination, driverLanguage) {
  const outbound = buildOneWayPriceFromRoute(outboundRoute, supplierBaseAddress, vehicle, origin, destination, driverLanguage);
  const inbound = buildOneWayPriceFromRoute(inboundRoute, supplierBaseAddress, vehicle, destination, origin, driverLanguage);

  const totalPrice = outbound.supplier_cost + inbound.supplier_cost;
  return {
    supplier_cost: Math.round(totalPrice * 100) / 100,
    calculation_details: {
      supplier_base_address: supplierBaseAddress,
      supplier_total_distance_km: (outbound.calculation_details.supplier_total_distance_km || 0) + (inbound.calculation_details.supplier_total_distance_km || 0),
      supplier_duration_minutes: (outbound.calculation_details.supplier_duration_minutes || 0) + (inbound.calculation_details.supplier_duration_minutes || 0),
      breakdown: {
        outbound: outbound.calculation_details,
        inbound: inbound.calculation_details,
      },
      tolls_included: false,
      tolls_error: true,
      driver_language: driverLanguage,
    },
  };
}

async function fetchWithRetry(fetcher, retries = 2, delayMs = 400) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }

  throw lastError;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const {
      client_id,
      service_type,
      origin,
      destination,
      date,
      time,
      return_date,
      return_time,
      hours,
      driver_language = 'pt',
    } = await req.json();

    if (!client_id || !service_type) {
      return Response.json({ success: false, error: 'Cliente e tipo de serviço são obrigatórios' }, { status: 400 });
    }

    if (user.role !== 'admin' && user.client_id !== client_id) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return Response.json({ success: false, error: 'Google Maps API Key não configurada' }, { status: 500 });
    }

    const clients = await fetchWithRetry(() => base44.asServiceRole.entities.Client.filter({ id: client_id }));
    const client = clients[0];

    if (!client) {
      return Response.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
    }

    const supplierIds = client.associated_supplier_ids || [];
    if (supplierIds.length === 0) {
      return Response.json({ success: false, error: 'Nenhum fornecedor associado a este cliente', error_type: 'no_suppliers_associated' }, { status: 400 });
    }

    const supplierGroups = await Promise.all(
      supplierIds.map((supplierId) => fetchWithRetry(() => base44.asServiceRole.entities.Supplier.filter({ id: supplierId })))
    );
    const activeSuppliers = supplierGroups.flat().filter((supplier) => supplier?.active);
    if (activeSuppliers.length === 0) {
      return Response.json({ success: false, error: 'Nenhum fornecedor ativo disponível para este cliente', error_type: 'no_active_suppliers' }, { status: 400 });
    }

    const supplierVehicleGroups = await Promise.all(
      activeSuppliers.map((supplier) =>
        fetchWithRetry(() => base44.asServiceRole.entities.SupplierVehicleType.filter({ supplier_id: supplier.id, active: true }))
      )
    );

    const quoteGroups = await Promise.all(
      activeSuppliers.map(async (supplier, index) => {
        try {
          const supplierVehicles = supplierVehicleGroups[index] || [];
          if (supplierVehicles.length === 0) {
            return [];
          }

          const supplierBaseAddress = supplier.base_address || supplier.address || origin;
          let outboundRoute = null;
          let inboundRoute = null;

          if (service_type === 'one_way') {
            outboundRoute = await calculateRouteDistance(apiKey, supplierBaseAddress, supplierBaseAddress, [origin, destination]);
          } else if (service_type === 'round_trip') {
            outboundRoute = await calculateRouteDistance(apiKey, supplierBaseAddress, supplierBaseAddress, [origin, destination]);
            inboundRoute = await calculateRouteDistance(apiKey, supplierBaseAddress, supplierBaseAddress, [destination, origin]);
          }

          return supplierVehicles.flatMap((vehicle) => {
            try {
              let pricing;

              if (service_type === 'one_way') {
                pricing = buildOneWayPriceFromRoute(outboundRoute, supplierBaseAddress, vehicle, origin, destination, driver_language);
              } else if (service_type === 'round_trip') {
                pricing = buildRoundTripPriceFromRoutes(outboundRoute, inboundRoute, supplierBaseAddress, vehicle, origin, destination, driver_language);
              } else if (service_type === 'hourly') {
                pricing = calculateHourlyPrice(vehicle, Number(hours || 0), driver_language);
              } else {
                return [];
              }

              const marginPercentage = Number(supplier.default_margin_percentage || 0);
              const clientPrice = pricing.supplier_cost * (1 + (marginPercentage / 100));

              return [{
                supplier_id: supplier.id,
                supplier_name: supplier.name,
                vehicle_type_id: vehicle.id,
                vehicle_name: vehicle.name,
                max_passengers: vehicle.max_passengers || 4,
                max_luggage: vehicle.max_luggage || 2,
                supplier_cost: Math.round(pricing.supplier_cost * 100) / 100,
                client_price: Math.round(clientPrice * 100) / 100,
                margin_amount: Math.round((clientPrice - pricing.supplier_cost) * 100) / 100,
                pricing_source: service_type === 'hourly' ? 'hourly_package' : 'manual_quote',
                calculation_details: pricing.calculation_details,
              }];
            } catch (error) {
              console.error(`[calculateMultiSupplierPrices] Erro ao calcular ${supplier.name} / ${vehicle.name}:`, error);
              return [];
            }
          });
        } catch (error) {
          console.error(`[calculateMultiSupplierPrices] Erro ao preparar fornecedor ${supplier.name}:`, error);
          return [];
        }
      })
    );

    const quotes = quoteGroups.flat();
    quotes.sort((a, b) => a.client_price - b.client_price);

    return Response.json({
      success: true,
      supplier_quotes: quotes,
    });
  } catch (error) {
    console.error('[calculateMultiSupplierPrices] Error:', error);
    return Response.json({ success: false, error: error.message || 'Erro ao calcular preços' }, { status: 500 });
  }
});