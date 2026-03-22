import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { differenceInMinutes, parse, addMinutes, subHours, format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            console.error('[groupEventPassengers] Unauthorized access attempt');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        console.log('[groupEventPassengers] Request body:', JSON.stringify(body));

        const { eventId, parameters } = body;

        if (!eventId) {
            return Response.json({ error: 'Event ID is required' }, { status: 400 });
        }

        // 1. Validar e Buscar o Evento
        const event = await base44.entities.Event.get(eventId);
        if (!event) {
            console.error(`[groupEventPassengers] Event not found: ${eventId}`);
            return Response.json({ error: 'Event not found' }, { status: 404 });
        }

        // Usar parâmetros fornecidos ou do evento, ou defaults
        const maxWaitTime = parameters?.max_wait_time_minutes || event.logistics_parameters?.max_wait_time_minutes || 60;
        const tripTypeFilter = parameters?.trip_type_filter || 'all';
        const pickupLeadTimeHours = parameters?.pickup_lead_time_hours || 3;
        
        let vehicleCapacities = parameters?.vehicle_capacities || event.logistics_parameters?.vehicle_capacities || [
            { vehicle_type: 'sedan', capacity: 3 },
            { vehicle_type: 'van', capacity: 15 }
        ];

        // Validar vehicleCapacities
        if (!Array.isArray(vehicleCapacities) || vehicleCapacities.length === 0) {
             console.warn('[groupEventPassengers] Invalid vehicle capacities, using defaults');
             vehicleCapacities = [
                { vehicle_type: 'sedan', capacity: 3 },
                { vehicle_type: 'van', capacity: 15 }
            ];
        }

        console.log('[groupEventPassengers] Logistics params:', { maxWaitTime, vehicleCapacities, tripTypeFilter });

        // Ordenar veículos por capacidade (decrescente para encontrar o limite máximo)
        vehicleCapacities.sort((a, b) => (b.capacity || 0) - (a.capacity || 0));
        const maxGroupSize = vehicleCapacities[0]?.capacity || 4;

        // 2. Buscar Passageiros Pendentes
        let allPassengers = [];
        let page = 1;
        let hasMore = true;
        
        // Construir query de filtro
        const queryFilter = {
            event_id: eventId,
            status: 'pending'
        };

        // Ajuste na lógica de filtro para ser mais permissivo com 'airport_transfer'
        // Se o usuário pede IN ou OUT, não podemos filtrar estritamente no banco se os dados estiverem como 'airport_transfer'
        // Então, se o filtro for IN ou OUT, não aplicamos filtro de trip_type no banco, trazemos tudo e filtramos em memória.
        // Isso garante que peguemos os 'airport_transfer' para verificar se são compatíveis.
        if (tripTypeFilter !== 'all') {
             // Não adiciona trip_type ao queryFilter para trazer um conjunto maior e filtrar em memória
             // Apenas se o filtro for muito específico e o banco suportasse, mas aqui é melhor garantir.
        }

        while (hasMore) {
            try {
                const passengers = await base44.entities.EventPassenger.filter(queryFilter, { date: 1, time: 1 }, 100, (page - 1) * 100);
                
                if (passengers.length < 100) hasMore = false;
                allPassengers = [...allPassengers, ...passengers];
                page++;
            } catch (err) {
                console.error('[groupEventPassengers] Error fetching passengers page:', page, err);
                hasMore = false;
            }
        }

        // Filtragem inteligente em memória
        if (tripTypeFilter !== 'all') {
            allPassengers = allPassengers.filter(p => {
                const type = (p.trip_type || '').toUpperCase();
                
                // Lógica: Aceitar o tipo exato OU tipos genéricos (airport_transfer), mas rejeitar o oposto explícito.
                
                if (tripTypeFilter === 'IN') {
                    // Aceita IN, Chegada, Arrival
                    if (type === 'IN' || type.includes('CHEGADA') || type.includes('ARRIVAL')) return true;
                    // Aceita genérico (Aeroporto), DESDE que não seja explicitamente Saída
                    if ((type.includes('AIRPORT') || type.includes('AERO') || type.includes('TRANSFER')) && 
                        !type.includes('OUT') && !type.includes('SAIDA') && !type.includes('DEPARTURE')) {
                        return true;
                    }
                    return false;
                }
                
                if (tripTypeFilter === 'OUT') {
                    // Aceita OUT, Saída, Departure
                    if (type === 'OUT' || type.includes('SAIDA') || type.includes('DEPARTURE')) return true;
                    // Aceita genérico (Aeroporto), DESDE que não seja explicitamente Chegada
                    if ((type.includes('AIRPORT') || type.includes('AERO') || type.includes('TRANSFER')) && 
                        !type.includes('IN') && !type.includes('CHEGADA') && !type.includes('ARRIVAL')) {
                        return true;
                    }
                    return false;
                }

                if (tripTypeFilter === 'airport_transfer') {
                    return type.includes('AIRPORT') || type.includes('AERO') || type.includes('TRANSFER');
                }
                
                return true;
            });
        }

        console.log(`[groupEventPassengers] Found ${allPassengers.length} pending passengers`);

        if (allPassengers.length === 0) {
            return Response.json({ 
                success: true, 
                message: 'Não há passageiros pendentes para agrupar.', 
                tripsCreated: 0
            });
        }

        // 3. Filtragem e Agrupamento Lógico
        const clusters = {};

        // Parâmetros de filtro opcionais vindos do front
        const dateFilter = parameters?.date_filter;
        const originFilter = parameters?.origin_filter;
        const destFilter = parameters?.destination_filter;

        // Pré-processamento: Agrupar famílias (Principal + Acompanhantes)
        // Mapa: PassengerID -> { passenger: p, companions: [] }
        // Apenas para passageiros que são principais ou órfãos
        const familyMap = new Map();
        const companionIds = new Set();

        // Identificar acompanhantes primeiro
        allPassengers.forEach(p => {
            if (p.is_companion && p.main_passenger_id) {
                companionIds.add(p.id);
            }
        });

        // Construir unidades familiares
        allPassengers.forEach(p => {
            // Se é acompanhante, será anexado ao principal depois
            if (p.is_companion && p.main_passenger_id) return;

            // Se é principal
            familyMap.set(p.id, { head: p, members: [p] });
        });

        // Anexar acompanhantes
        allPassengers.forEach(p => {
            if (p.is_companion && p.main_passenger_id) {
                const family = familyMap.get(p.main_passenger_id);
                if (family) {
                    family.members.push(p);
                } else {
                    // Principal não está na lista (talvez já alocado ou filtro excluiu)
                    // Tratar como unidade independente
                    familyMap.set(p.id, { head: p, members: [p] });
                }
            }
        });

        // Agora iteramos sobre as FAMÍLIAS, não passageiros individuais
        const families = Array.from(familyMap.values());

        families.forEach(family => {
            const p = family.head; // Usamos o principal para determinar a rota do grupo

            // Normalizar chave: Data + Tipo + Origem + Destino
            const pDate = p.date || p.flight_date || 'NoDate';
            // Normalizar chave: Data + Tipo + Origem + Destino
            const pDate = p.date || p.flight_date || 'NoDate';
            const pType = p.trip_type || 'Unknown';

            // Normalização agressiva para agrupar variações (Case insensitive + Trim)
            const rawOrigin = (p.arrival_point || p.origin_address || 'NoOrigin');
            const rawDest = (p.destination_address || 'NoDest');

            const pOriginNorm = rawOrigin.trim().toLowerCase();
            const pDestNorm = rawDest.trim().toLowerCase();

            // Aplicar Filtros Específicos se fornecidos
            if (dateFilter && pDate !== dateFilter) return;
            if (originFilter && pOriginNorm !== originFilter.trim().toLowerCase()) return;
            if (destFilter && pDestNorm !== destFilter.trim().toLowerCase()) return;

            // Lógica de Chave de Agrupamento Inteligente
            let key;

            // Normalizar e simplificar tipos para detecção
            const isIN = pType === 'IN' || pType.includes('CHEGADA') || pType.includes('ARRIVAL');
            const isOUT = pType === 'OUT' || pType.includes('SAIDA') || pType.includes('DEPARTURE');
            // Detectar se é aeroporto genérico para tentar inferir
            const isAirport = pType.includes('AIRPORT') || pType.includes('AERO') || pType.includes('TRANSFER');

            if (isIN) {
                key = `${pDate}|IN|${pDestNorm}`;
            } else if (isOUT) {
                key = `${pDate}|OUT|${pOriginNorm}`;
            } else if (isAirport) {
                if (parameters?.trip_type_filter === 'IN' || (pDestNorm && !pOriginNorm.includes('hotel'))) {
                     key = `${pDate}|IN|${pDestNorm}`;
                } else if (parameters?.trip_type_filter === 'OUT' || (pOriginNorm && !pDestNorm.includes('hotel'))) {
                     key = `${pDate}|OUT|${pOriginNorm}`;
                } else {
                     key = `${pDate}|${pType}|${pOriginNorm}|${pDestNorm}`;
                }
            } else {
                key = `${pDate}|${pType}|${pOriginNorm}|${pDestNorm}`;
            }

            if (!clusters[key]) {
                clusters[key] = [];
            }
            // Adiciona a FAMÍLIA inteira ao cluster
            clusters[key].push(family);
            });

            const newTrips = [];

            const safeParseTime = (dateStr, timeStr) => {
            try {
                if (!dateStr) return new Date(0);
                let cleanTime = timeStr ? timeStr.substring(0, 5) : "00:00";
                if (!cleanTime.includes(':')) cleanTime = "00:00";
                const parsed = parse(`${dateStr} ${cleanTime}`, 'yyyy-MM-dd HH:mm', new Date());
                if (isNaN(parsed.getTime())) return new Date(0);
                return parsed;
            } catch (e) {
                return new Date(0);
            }
            };

            // Initialize Counters map for Trip Code generation
            const tripCodeCounters = {}; // Key: "VEHICLE|DATE", Value: count

            // Fetch existing trips to initialize counters
            try {
                const existingTrips = await base44.entities.EventTrip.filter({ event_id: eventId });
                existingTrips.forEach(t => {
                    if (t.vehicle_type_category && t.date) {
                        const key = `${t.vehicle_type_category}|${t.date}`;
                        tripCodeCounters[key] = (tripCodeCounters[key] || 0) + 1;
                    }
                });
            } catch (e) {
                console.warn('[groupEventPassengers] Error initializing counters:', e);
            }

            // Helper for Trip Code
            const getNextTripCode = (vType, dateStr, originStr) => {
                const key = `${vType}|${dateStr}`;
                tripCodeCounters[key] = (tripCodeCounters[key] || 0) + 1;
                const seq = tripCodeCounters[key];
                
                const vPrefix = (vType || 'UNK').substring(0, 3).toUpperCase();
                const oPrefix = (originStr || 'XX').substring(0, 2).toUpperCase();
                
                let dSuffix = '0000';
                if (dateStr) {
                    try {
                        const [y, m, d] = dateStr.split('-');
                        dSuffix = `${d}${m}`;
                    } catch (e) {}
                }
                return `${vPrefix}${seq}-${oPrefix}${dSuffix}`;
            };

            // Processar cada cluster
            for (const key in clusters) {
            let clusterFamilies = clusters[key];

            // Ordenar famílias pelo horário do principal (Head)
            clusterFamilies.sort((a, b) => {
                const timeA = safeParseTime(a.head.date || a.head.flight_date, a.head.time || a.head.flight_time);
                const timeB = safeParseTime(b.head.date || b.head.flight_date, b.head.time || b.head.flight_time);
                return timeA - timeB;
            });

            let i = 0;
            while (i < clusterFamilies.length) {
                const pivotFamily = clusterFamilies[i];
                const pivot = pivotFamily.head;

                const pivotDate = pivot.date || pivot.flight_date;
                const pivotTimeStr = pivot.time || pivot.flight_time;
                const pivotTime = safeParseTime(pivotDate, pivotTimeStr);
                const limitTime = addMinutes(pivotTime, maxWaitTime);

                // Grupo começa com a família pivô inteira
                let currentGroupPassengers = [...pivotFamily.members];

                let j = i + 1;

                while (j < clusterFamilies.length) {
                    const candidateFamily = clusterFamilies[j];
                    const candidate = candidateFamily.head;
                    const candidateTime = safeParseTime(candidate.date || candidate.flight_date, candidate.time || candidate.flight_time);

                    // Verificar janela de tempo
                    if (pivotTime.getTime() > 0 && candidateTime.getTime() > 0) {
                        if (candidateTime > limitTime) break;
                    } else {
                         if ((candidate.time || candidate.flight_time) !== pivotTimeStr) break;
                    }

                    // Verificar capacidade para adicionar a família inteira
                    if (currentGroupPassengers.length + candidateFamily.members.length > maxGroupSize) {
                        break; 
                    }

                    currentGroupPassengers.push(...candidateFamily.members);
                    j++;
                }

                // Selecionar Veículo
                const capsAsc = [...vehicleCapacities].sort((a, b) => (a.capacity || 0) - (b.capacity || 0));
                let selectedVehicle = capsAsc.find(v => v.capacity >= currentGroupPassengers.length);

                if (!selectedVehicle) {
                    // Se o grupo (mesmo que seja só uma família grande) for maior que o maior veículo
                    // Precisamos dividir ou pegar o maior disponível e deixar estourar (seria um bug de capacidade)
                    // Solução ideal: Dividir a família em múltiplos veículos se necessário, mas aqui vamos pegar o maior
                    selectedVehicle = capsAsc[capsAsc.length - 1]; 
                }

                if (!selectedVehicle) {
                    selectedVehicle = { vehicle_type: 'Standard', capacity: 4 };
                }

                // Calcular horário de saída
                let finalStartTime = pivotTimeStr || '00:00';
                const isOUT = pivot.trip_type === 'OUT' || (pivot.trip_type || '').includes('OUT') || (pivot.trip_type || '').includes('SAIDA');

                if (isOUT && pickupLeadTimeHours !== 0 && pickupLeadTimeHours !== undefined && pickupLeadTimeHours !== null) {
                    try {
                        const flightTimeDate = safeParseTime(pivotDate, pivotTimeStr);
                        if (flightTimeDate.getTime() > 0) {
                            const pickupDate = subHours(flightTimeDate, Number(pickupLeadTimeHours));
                            finalStartTime = format(pickupDate, 'HH:mm');
                        }
                    } catch (e) {
                        console.warn('Error calculating pickup time', e);
                    }
                }

                const tripName = `GRP${finalStartTime ? finalStartTime.replace(':','') : '0000'} - ${currentGroupPassengers.length} Pax`;
                const tripDate = pivotDate || new Date().toISOString().split('T')[0];
                const tripOrigin = pivot.arrival_point || pivot.origin_address || 'Origin';
                const tripCode = getNextTripCode(selectedVehicle.vehicle_type, tripDate, tripOrigin);

                const tripData = {
                    event_id: eventId,
                    name: tripName,
                    trip_code: tripCode,
                    status: 'planned',
                    origin: tripOrigin,
                    destination: pivot.destination_address || 'Destination',
                    date: pivotDate || new Date().toISOString().split('T')[0],
                    start_time: finalStartTime,
                    vehicle_type_category: selectedVehicle.vehicle_type,
                    vehicle_capacity: selectedVehicle.capacity,
                    passenger_count: currentGroupPassengers.length,
                    notes: `Agrupamento automático. Janela: ${maxWaitTime}min.${isOUT ? ` Ajuste pickup: ${pickupLeadTimeHours}h.` : ''}`
                };

                newTrips.push({
                    trip: tripData,
                    passengers: currentGroupPassengers.map(p => p.id)
                });

                i = j;
            }
            }

        console.log(`[groupEventPassengers] Calculated ${newTrips.length} new trips`);

        // 4. Persistir
        let createdCount = 0;
        for (const item of newTrips) {
            try {
                const createdTrip = await base44.entities.EventTrip.create(item.trip);
                createdCount++;
                
                await Promise.all(item.passengers.map(pid => 
                    base44.entities.EventPassenger.update(pid, {
                        event_trip_id: createdTrip.id,
                        status: 'assigned'
                    })
                ));
            } catch (err) {
                console.error('[groupEventPassengers] Error creating trip/updating passengers:', err);
                // Continue processing others
            }
        }

        return Response.json({ 
            success: true, 
            message: `Processed. Created ${createdCount} trips.`,
            tripsCreated: createdCount
        });

    } catch (error) {
        console.error('[groupEventPassengers] CRITICAL ERROR:', error);
        return Response.json({ 
            error: error.message, 
            stack: error.stack 
        }, { status: 500 });
    }
});