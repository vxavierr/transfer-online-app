import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || !user.supplier_id) {
      return Response.json({ error: 'Unauthorized - Supplier access required' }, { status: 401 });
    }

    const { 
      client_id, 
      vehicle_type_id, 
      service_type, 
      origin, 
      destination, 
      hours,
      driver_language 
    } = await req.json();

    console.log('[calculateSupplierOwnBookingPrice] Iniciando:', {
      client_id,
      vehicle_type_id,
      service_type,
      origin,
      destination,
      hours,
      driver_language
    });

    if (!client_id || !vehicle_type_id || !service_type) {
      return Response.json({ 
        error: 'client_id, vehicle_type_id e service_type são obrigatórios' 
      }, { status: 400 });
    }

    // Buscar precificação específica do cliente
    const clientPricings = await base44.entities.SupplierClientPricing.filter({
      supplier_id: user.supplier_id,
      client_id: client_id,
      vehicle_type_id: vehicle_type_id,
      active: true
    });

    let pricing;
    let pricingSource = 'vehicle_default';
    
    if (clientPricings && clientPricings.length > 0) {
      pricing = clientPricings[0];
      pricingSource = 'client_specific';
      console.log('[calculateSupplierOwnBookingPrice] Usando precificação específica do cliente');
    } else {
      const vehicleType = await base44.entities.SupplierVehicleType.get(vehicle_type_id);
      if (!vehicleType || vehicleType.supplier_id !== user.supplier_id) {
        return Response.json({ error: 'Tipo de veículo não encontrado' }, { status: 404 });
      }
      pricing = vehicleType;
      console.log('[calculateSupplierOwnBookingPrice] Usando precificação padrão do veículo');
    }

    console.log('[calculateSupplierOwnBookingPrice] Pricing:', {
      base_price_per_km: pricing.base_price_per_km,
      min_price_one_way: pricing.min_price_one_way,
      min_price_round_trip: pricing.min_price_round_trip,
      min_km_franchise: pricing.min_km_franchise,
      min_price_for_franchise: pricing.min_price_for_franchise
    });

    // Buscar fornecedor para obter base_address
    const supplier = await base44.entities.Supplier.get(user.supplier_id);
    const supplierBase = supplier.base_address;

    if (!supplierBase) {
      return Response.json({ 
        error: 'Endereço base do fornecedor não configurado' 
      }, { status: 400 });
    }

    console.log('[calculateSupplierOwnBookingPrice] Base address:', supplierBase);

    let totalDistanceKm = 0;
    let calculation_details = {
      service_type,
      base_address: supplierBase
    };

    // Calcular distância (MESMO MÉTODO DO MÓDULO CORPORATIVO)
    if (service_type !== 'hourly' && origin && destination) {
      try {
        if (service_type === 'one_way') {
          // ONE_WAY: Base -> Origem -> Destino -> Base
          const distResult = await base44.functions.invoke('calculateDistance', {
            origin: supplierBase,
            waypoints: [origin, destination],
            destination: supplierBase
          });
          
          console.log('[calculateSupplierOwnBookingPrice] Distância one_way:', distResult.data);
          
          if (distResult.data) {
            totalDistanceKm = parseFloat(distResult.data.distance_km);
          }
        } else if (service_type === 'round_trip') {
          // ROUND_TRIP: IDA + VOLTA
          const outboundResult = await base44.functions.invoke('calculateDistance', {
            origin: supplierBase,
            waypoints: [origin, destination],
            destination: supplierBase
          });
          
          const returnResult = await base44.functions.invoke('calculateDistance', {
            origin: supplierBase,
            waypoints: [destination, origin],
            destination: supplierBase
          });
          
          console.log('[calculateSupplierOwnBookingPrice] IDA:', outboundResult.data);
          console.log('[calculateSupplierOwnBookingPrice] VOLTA:', returnResult.data);
          
          if (outboundResult.data && returnResult.data) {
            const outboundDistanceKm = parseFloat(outboundResult.data.distance_km);
            const returnDistanceKm = parseFloat(returnResult.data.distance_km);
            totalDistanceKm = outboundDistanceKm + returnDistanceKm;
            
            calculation_details.distance_breakdown = {
              outbound_distance_km: outboundDistanceKm,
              return_distance_km: returnDistanceKm
            };
            
            console.log('[calculateSupplierOwnBookingPrice] Total round_trip:', totalDistanceKm, 'km');
          }
        }
      } catch (err) {
        console.error('[calculateSupplierOwnBookingPrice] Erro ao calcular distância:', err);
        return Response.json({ error: 'Erro ao calcular distância: ' + err.message }, { status: 500 });
      }
    }

    calculation_details.total_distance_km = totalDistanceKm;

    // Calcular preço (MESMO MÉTODO DO MÓDULO CORPORATIVO)
    let basePrice = 0;

    if (service_type === 'hourly') {
      const requestedHours = hours || 5;
      let packagePrice = 0;
      let kmAllowance = 0;
      
      if (requestedHours === 5 && pricing.hourly_5_hours_price > 0) {
        packagePrice = pricing.hourly_5_hours_price;
        kmAllowance = pricing.hourly_5_hours_km_allowance || 50;
        calculation_details.package_type = '5_hours';
      } else if (requestedHours === 10 && pricing.hourly_10_hours_price > 0) {
        packagePrice = pricing.hourly_10_hours_price;
        kmAllowance = pricing.hourly_10_hours_km_allowance || 100;
        calculation_details.package_type = '10_hours';
      } else {
        const hourlyRate = pricing.additional_price_per_hour || (pricing.base_price_per_km * 50);
        packagePrice = hourlyRate * requestedHours;
        kmAllowance = (pricing.hourly_km_allowance_per_hour || 12) * requestedHours;
        calculation_details.package_type = 'custom';
      }
      
      calculation_details.hours = requestedHours;
      calculation_details.package_price = packagePrice;
      calculation_details.km_allowance = kmAllowance;
      
      basePrice = packagePrice;
      console.log('[calculateSupplierOwnBookingPrice] Preço hourly:', basePrice);
      
    } else {
      // POR DISTÂNCIA
      if (totalDistanceKm === 0) {
        return Response.json({ 
          error: 'Não foi possível calcular a distância' 
        }, { status: 400 });
      }

      const pricePerKm = pricing.base_price_per_km || 0;
      basePrice = totalDistanceKm * pricePerKm;
      
      calculation_details.price_per_km = pricePerKm;
      calculation_details.calculated_price_before_min = basePrice;
      
      console.log('[calculateSupplierOwnBookingPrice] Preço por KM:', basePrice, '(', totalDistanceKm, 'km x', pricePerKm, ')');

      // APLICAR FRANQUIA MÍNIMA
      if (pricing.min_km_franchise > 0 && pricing.min_price_for_franchise > 0) {
        if (totalDistanceKm <= pricing.min_km_franchise) {
          console.log('[calculateSupplierOwnBookingPrice] Dentro da franquia - aplicando preço:', pricing.min_price_for_franchise);
          basePrice = Math.max(basePrice, pricing.min_price_for_franchise);
          calculation_details.franchise_applied = true;
          calculation_details.franchise_km = pricing.min_km_franchise;
          calculation_details.franchise_price = pricing.min_price_for_franchise;
        }
      }

      // APLICAR PREÇO MÍNIMO
      if (service_type === 'one_way' && pricing.min_price_one_way > 0) {
        if (basePrice < pricing.min_price_one_way) {
          console.log('[calculateSupplierOwnBookingPrice] Aplicando preço mínimo one_way:', pricing.min_price_one_way);
          basePrice = pricing.min_price_one_way;
          calculation_details.min_price_applied = true;
          calculation_details.min_price = pricing.min_price_one_way;
        }
      } else if (service_type === 'round_trip' && pricing.min_price_round_trip > 0) {
        if (basePrice < pricing.min_price_round_trip) {
          console.log('[calculateSupplierOwnBookingPrice] Aplicando preço mínimo round_trip:', pricing.min_price_round_trip);
          basePrice = pricing.min_price_round_trip;
          calculation_details.min_price_applied = true;
          calculation_details.min_price = pricing.min_price_round_trip;
        }
      }
      
      calculation_details.final_base_price = basePrice;
    }

    // Aplicar sobretaxa de idioma
    let languageSurcharge = 0;
    if (driver_language && driver_language !== 'pt') {
      if (driver_language === 'en' && pricing.language_surcharge_en > 0) {
        if (pricing.language_surcharge_en_type === 'percentage') {
          languageSurcharge = (basePrice * pricing.language_surcharge_en) / 100;
        } else {
          languageSurcharge = pricing.language_surcharge_en;
        }
        calculation_details.language_surcharge = {
          language: 'en',
          type: pricing.language_surcharge_en_type,
          value: pricing.language_surcharge_en,
          applied: languageSurcharge
        };
        console.log('[calculateSupplierOwnBookingPrice] Sobretaxa EN:', languageSurcharge);
      } else if (driver_language === 'es' && pricing.language_surcharge_es > 0) {
        if (pricing.language_surcharge_es_type === 'percentage') {
          languageSurcharge = (basePrice * pricing.language_surcharge_es) / 100;
        } else {
          languageSurcharge = pricing.language_surcharge_es;
        }
        calculation_details.language_surcharge = {
          language: 'es',
          type: pricing.language_surcharge_es_type,
          value: pricing.language_surcharge_es,
          applied: languageSurcharge
        };
        console.log('[calculateSupplierOwnBookingPrice] Sobretaxa ES:', languageSurcharge);
      }
    }

    const finalPrice = Math.round((basePrice + languageSurcharge) * 100) / 100;
    console.log('[calculateSupplierOwnBookingPrice] ✅ Preço final:', finalPrice);

    return Response.json({
      success: true,
      price: finalPrice,
      distance_km: totalDistanceKm,
      pricing_source: pricingSource,
      calculation_details
    });

  } catch (error) {
    console.error('[calculateSupplierOwnBookingPrice] Erro geral:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});