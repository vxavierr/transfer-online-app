import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { parse, subHours, format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { eventId, parameters } = await req.json();

        if (!eventId) {
            return Response.json({ error: 'Event ID is required' }, { status: 400 });
        }

        // 1. Buscar Evento e Passageiros Pendentes
        console.log(`[generateAILogistics] Starting logistics generation for eventId: ${eventId}`);

        const event = await base44.entities.Event.get(eventId);
        if (!event) {
            console.error(`[generateAILogistics] Event not found: ${eventId}`);
            return Response.json({ error: 'Event not found' }, { status: 404 });
        }
        console.log(`[generateAILogistics] Event found: ${event.event_name}`);

        // Buscar TODOS os passageiros do evento primeiro
        const allEventPassengers = await base44.entities.EventPassenger.filter({ event_id: eventId }, 'date', 500);
        console.log(`[generateAILogistics] Total passengers in event: ${allEventPassengers.length}`);
        console.log(`[generateAILogistics] Passenger statuses:`, allEventPassengers.reduce((acc, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
        }, {}));

        // Buscar todos os passageiros pendentes
        const queryFilter = { event_id: eventId, status: 'pending' };
        let allPassengers = await base44.entities.EventPassenger.filter(queryFilter, 'date', 500);
        
        console.log(`[generateAILogistics] Found ${allPassengers.length} pending passengers`);
        if (allPassengers.length > 0) {
            console.log('[generateAILogistics] First 3 pending passengers:', allPassengers.slice(0, 3).map(p => ({
                id: p.id,
                name: p.passenger_name,
                status: p.status,
                origin: p.arrival_point || p.origin_address,
                dest: p.destination_address,
                type: p.trip_type,
                date: p.date,
                flight_date: p.flight_date
            })));
        } else {
            console.warn('[generateAILogistics] ⚠️ NO pending passengers found! All passengers are either assigned or completed.');
            return Response.json({ 
                success: true, 
                message: 'Não há passageiros pendentes para agrupar. Todos já foram atribuídos a viagens.', 
                tripsCreated: 0
            });
        }

        // Aplicar filtros se fornecidos
        const tripTypeFilter = parameters?.trip_type_filter || 'all';
        if (tripTypeFilter !== 'all') {
            const beforeCount = allPassengers.length;
            console.log(`[generateAILogistics] Applying trip type filter: "${tripTypeFilter}"`);
            console.log('[generateAILogistics] Sample trip types:', allPassengers.slice(0, 5).map(p => p.trip_type));
            
            allPassengers = allPassengers.filter(p => {
                const type = (p.trip_type || '').toUpperCase();
                let match = false;
                if (tripTypeFilter === 'IN') {
                    match = type === 'IN' || type.includes('CHEGADA') || type.includes('ARRIVAL') || 
                           (type.includes('AIRPORT') && !type.includes('OUT'));
                } else if (tripTypeFilter === 'OUT') {
                    match = type === 'OUT' || type.includes('SAIDA') || type.includes('DEPARTURE') ||
                           (type.includes('AIRPORT') && !type.includes('IN'));
                } else {
                    match = type.includes('AIRPORT') || type.includes('TRANSFER');
                }
                
                if (!match) {
                    console.log(`[generateAILogistics] ❌ Trip type mismatch: passenger type="${p.trip_type}" vs filter="${tripTypeFilter}"`);
                }
                return match;
            });
            console.log(`[generateAILogistics] Trip type filter result: ${beforeCount} -> ${allPassengers.length} passengers`);
        }

        if (parameters?.date_filter && parameters.date_filter !== 'all') {
            const beforeCount = allPassengers.length;
            console.log(`[generateAILogistics] Applying date filter: "${parameters.date_filter}"`);
            console.log('[generateAILogistics] Sample dates:', allPassengers.slice(0, 5).map(p => ({ name: p.passenger_name, date: p.date, flight_date: p.flight_date })));
            
            allPassengers = allPassengers.filter(p => {
                const passengerDate = p.date || p.flight_date;
                const match = passengerDate === parameters.date_filter;
                if (!match) {
                    console.log(`[generateAILogistics] ❌ Date mismatch: passenger="${passengerDate}" vs filter="${parameters.date_filter}"`);
                }
                return match;
            });
            console.log(`[generateAILogistics] Date filter result: ${beforeCount} -> ${allPassengers.length} passengers`);
        }
        if (parameters?.origin_filter && parameters.origin_filter !== 'all') {
            const beforeCount = allPassengers.length;
            const filterOrigin = (parameters.origin_filter || '').toLowerCase().trim();
            console.log(`[generateAILogistics] Applying origin filter: "${parameters.origin_filter}"`);
            
            allPassengers = allPassengers.filter(p => {
                // Para viagens IN (chegadas), a origem é o arrival_point (aeroporto)
                // Para viagens OUT (saídas), a origem é o origin_address (hotel/local de partida)
                const type = (p.trip_type || '').toUpperCase();
                const isIN = type === 'IN' || type.includes('CHEGADA') || type.includes('ARRIVAL');
                
                const pOrigin = isIN 
                    ? (p.arrival_point || '').toLowerCase().trim()
                    : (p.origin_address || '').toLowerCase().trim();
                
                // More flexible matching: partial word match
                const match = pOrigin && (pOrigin.includes(filterOrigin) || filterOrigin.includes(pOrigin));
                
                if (!match) {
                    console.log(`[generateAILogistics] ❌ Origin mismatch: passenger="${pOrigin}" (type=${p.trip_type}, using ${isIN ? 'arrival_point' : 'origin_address'}) vs filter="${filterOrigin}"`);
                } else {
                    console.log(`[generateAILogistics] ✅ Origin match: passenger="${pOrigin}" vs filter="${filterOrigin}"`);
                }
                return match;
            });
            console.log(`[generateAILogistics] Origin filter result: ${beforeCount} -> ${allPassengers.length} passengers`);
        }
        if (parameters?.destination_filter && parameters.destination_filter !== 'all') {
            const beforeCount = allPassengers.length;
            allPassengers = allPassengers.filter(p => {
                const pDest = (p.destination_address || '').toLowerCase().trim();
                const filterDest = (parameters.destination_filter || '').toLowerCase().trim();
                // Use includes for partial matching (more flexible)
                const match = pDest.includes(filterDest) || filterDest.includes(pDest);
                console.log(`[generateAILogistics] Dest comparison: "${pDest}" ~ "${filterDest}" = ${match}`);
                return match;
            });
            console.log(`[generateAILogistics] Destination filter: ${beforeCount} -> ${allPassengers.length} passengers`);
        }

        console.log(`[generateAILogistics] After filters: ${allPassengers.length} passengers`);
        console.log(`[generateAILogistics] Filters applied:`, { 
            tripTypeFilter, 
            dateFilter: parameters?.date_filter, 
            originFilter: parameters?.origin_filter,
            destFilter: parameters?.destination_filter 
        });

        if (allPassengers.length === 0) {
            console.warn('[generateAILogistics] No passengers after filtering!');
            return Response.json({ 
                success: true, 
                message: 'Não há passageiros pendentes para agrupar com os filtros aplicados.', 
                tripsCreated: 0
            });
        }

        console.log(`[generateAILogistics] Processing ${allPassengers.length} passengers with AI`);

        // 2. Preparar dados para a IA
        const maxWaitTime = parameters?.max_wait_time_minutes || 60;
        const maxGroupDuration = parameters?.max_group_duration_minutes || 120;
        const pickupLeadTimeHours = parameters?.pickup_lead_time_hours || 3;
        const vehicleCapacities = parameters?.vehicle_capacities || [
            { vehicle_type: 'sedan', capacity: 3 },
            { vehicle_type: 'van', capacity: 15 }
        ];

        // Formatar passageiros para a IA usando ÍNDICES em vez de IDs
        // Isso evita erros de typo nos IDs retornados pela IA
        const passengersForAI = allPassengers.map((p, index) => ({
            index: index, // Usar índice numérico ao invés do ID complexo
            name: p.passenger_name,
            group_id: p.is_companion ? (p.main_passenger_id || p.id) : p.id, // ID da família/grupo
            is_companion: p.is_companion,
            date: p.date || p.flight_date,
            time: p.time || p.flight_time,
            trip_type: p.trip_type,
            origin: p.arrival_point || p.origin_address,
            destination: p.destination_address,
            flight_number: p.flight_number,
            airline: p.airline
        }));

        // 3. Invocar IA para otimização
        const aiPrompt = `
        Você é um especialista em logística de transporte de passageiros em eventos aeroportuários.

        **REGRA #0 - FAMÍLIAS E GRUPOS (PRIORIDADE MÁXIMA):**
        Passageiros com o mesmo **group_id** viajam juntos. 
        - Você DEVE alocá-los no mesmo veículo sempre que possível.
        - Se a família inteira não couber em um único veículo (ex: família de 5 em sedan de 3), aí sim você pode dividir, mas mantenha-os o mais unidos possível.

        **REGRA #1 - CAPACIDADE MÁXIMA DO VEÍCULO (RESTRIÇÃO ABSOLUTA):**
        A CAPACIDADE DO VEÍCULO É UMA RESTRIÇÃO INVIOLÁVEL. NUNCA, EM HIPÓTESE ALGUMA, COLOQUE MAIS PASSAGEIROS DO QUE A CAPACIDADE PERMITE.

        - Van com capacity=15 → NO MÁXIMO 15 passageiros POR VIAGEM
        - Sedan com capacity=3 → NO MÁXIMO 3 passageiros POR VIAGEM
        - Se você tem 35 passageiros e Van cap.15, crie 3 grupos: [0-14]=15pax, [15-29]=15pax, [30-34]=5pax
        - Se você tem 5 passageiros e Sedan cap.3, crie 2 grupos: [0,1,2]=3pax e [3,4]=2pax

        **MODO PORTA A PORTA COM MESMO HORÁRIO:**
        Quando TODOS os passageiros têm o MESMO horário de saída/chegada:
        - Agrupe por destino comum (IN) ou origem comum (OUT)
        - DIVIDA em múltiplos veículos respeitando a capacidade de cada um
        - EXEMPLO: 35 passageiros às 08:00 para o mesmo destino, Van cap.15 → 3 viagens de Van

        **REGRA #2 - CRITÉRIOS DE AGRUPAMENTO TEMPORAL:**
        Você DEVE agrupar passageiros quando TODAS essas condições forem atendidas:
        a) **Tempo entre passageiros consecutivos:** ≤ ${maxWaitTime} minutos
        b) **Janela total do grupo (primeiro ao último):** ≤ ${maxGroupDuration} minutos
        c) **Quantidade total de passageiros:** ≤ capacidade do veículo

        **EXEMPLOS PRÁTICOS:**
        1. **PORTA A PORTA - 35 passageiros às 08:00 | Van cap.15:**
        - Todos têm mesmo horário → Condições (a) e (b) OK
        - MAS 35 > 15 (capacidade) → DIVIDIR EM MÚLTIPLAS VIAGENS
        - **RESULTADO:** 
        * Grupo 1: [0-14] (15 pax, Van)
        * Grupo 2: [15-29] (15 pax, Van)
        * Grupo 3: [30-34] (5 pax, Van)

        2. **AEROPORTO - Passageiros às 08:10, 10:50, 11:10 | Sedan cap.2:**
        - Pax 08:10 vs 10:50 = 160 min (excede janela) → NÃO AGRUPAR
        - Pax 10:50 vs 11:10 = 20 min (OK), 2 pax ≤ cap.2 (OK) → AGRUPAR
        - **RESULTADO:** Grupo 1: [0] | Grupo 2: [1,2]

        3. **AEROPORTO - 5 passageiros às 14:00 | Sedan cap.3:**
        - Todos no mesmo horário, mas 5 > 3 → DIVIDIR
        - **RESULTADO:** Grupo 1: [0,1,2] (3 pax) | Grupo 2: [3,4] (2 pax)

        **VEÍCULOS DISPONÍVEIS:**
        ${JSON.stringify(vehicleCapacities, null, 2)}

        **PASSAGEIROS PARA AGRUPAR (total: ${passengersForAI.length}):**
        ${JSON.stringify(passengersForAI, null, 2)}

        **PROCESSO DE OTIMIZAÇÃO:**
        1. Agrupe passageiros por destino comum (IN) ou origem comum (OUT)
        2. Dentro de cada grupo de destino/origem, ordene por horário
        3. Forme subgrupos respeitando: intervalo (${maxWaitTime}min), janela (${maxGroupDuration}min) e **CAPACIDADE MÁXIMA**
        4. **IMPORTANTE:** Quando a quantidade de passageiros exceder a capacidade, DIVIDA em múltiplos veículos do mesmo tipo
        5. Escolha o menor veículo que comporte o grupo

        **FORMATO DE SAÍDA:**
        {
        "groups": [
        {
        "passenger_indexes": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], // Máximo 15 se Van cap.15
        "vehicle_type": "Van", // Nome EXATO do tipo de veículo
        "vehicle_capacity": 15, // Capacidade EXATA copiada da lista
        "estimated_start_time": "08:00",
        "origin": "Hilton",
        "destination": "Aeroporto",
        "reasoning": "15 passageiros no mesmo horário, mesmo destino, capacidade respeitada"
        }
        ],
        "optimization_summary": "Criados X grupos otimizados respeitando capacidades."
        }

        **VALIDAÇÃO FINAL OBRIGATÓRIA:**
        Antes de retornar, para CADA grupo verifique:
        - length(passenger_indexes) <= vehicle_capacity ✓ (SE VIOLAR, DIVIDA O GRUPO)
        - Diferença entre primeiro e último passageiro <= ${maxGroupDuration}min ✓
        - Diferenças consecutivas <= ${maxWaitTime}min ✓
        **SE QUALQUER GRUPO TIVER MAIS PASSAGEIROS QUE A CAPACIDADE, DIVIDA IMEDIATAMENTE.**
        `;

        console.log('[generateAILogistics] Calling AI with prompt length:', aiPrompt.length);
        console.log('[generateAILogistics] Vehicle capacities:', JSON.stringify(vehicleCapacities));
        console.log('[generateAILogistics] Max wait time:', maxWaitTime);

        let aiResponse;
        try {
            aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt: aiPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    groups: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                passenger_indexes: { type: "array", items: { type: "integer" } },
                                vehicle_type: { type: "string" },
                                vehicle_capacity: { type: "integer" },
                                estimated_start_time: { type: "string" },
                                origin: { type: "string" },
                                destination: { type: "string" },
                                reasoning: { type: "string" }
                            },
                            required: ["passenger_indexes", "vehicle_type", "vehicle_capacity", "estimated_start_time", "origin", "destination"]
                        }
                    },
                    optimization_summary: { type: "string" }
                },
                required: ["groups"]
                }
                });
                } catch (aiError) {
                console.error('[generateAILogistics] AI call failed:', aiError);
                console.error('[generateAILogistics] AI error details:', aiError.message);
                throw new Error(`Falha ao chamar IA: ${aiError.message}`);
                }

                console.log('[generateAILogistics] AI Response received');
        console.log('[generateAILogistics] AI Groups count:', aiResponse.groups?.length || 0);
        console.log('[generateAILogistics] Full AI Response:', JSON.stringify(aiResponse, null, 2));

        let aiGroups = aiResponse.groups || [];

        if (aiGroups.length === 0) {
            console.error('[generateAILogistics] AI returned ZERO groups! Full response:', JSON.stringify(aiResponse));
            return Response.json({ 
                success: true, 
                message: 'IA não conseguiu gerar grupos otimizados. Tente novamente ou use o modo manual.', 
                tripsCreated: 0,
                debug_info: {
                    passengers_count: allPassengers.length,
                    ai_response_keys: Object.keys(aiResponse),
                    groups_returned: aiGroups.length
                }
            });
        }

        // VALIDAÇÃO E AUTO-CORREÇÃO: Dividir grupos que excedem capacidade
        const validatedGroups = [];
        for (const group of aiGroups) {
            const passengerCount = (group.passenger_indexes || []).length;

            if (passengerCount <= group.vehicle_capacity) {
                // Grupo válido, adiciona diretamente
                validatedGroups.push(group);
            } else {
                // Grupo inválido, divide automaticamente
                console.warn(`[generateAILogistics] ⚠️ Auto-correcting group: ${passengerCount} pax in ${group.vehicle_type} (cap. ${group.vehicle_capacity})`);

                const indexes = group.passenger_indexes || [];
                const capacity = group.vehicle_capacity;

                // Divide em chunks do tamanho da capacidade
                for (let i = 0; i < indexes.length; i += capacity) {
                    const chunk = indexes.slice(i, i + capacity);
                    validatedGroups.push({
                        ...group,
                        passenger_indexes: chunk
                    });
                }
                console.log(`[generateAILogistics] Split into ${Math.ceil(indexes.length / capacity)} groups`);
            }
        }

        aiGroups = validatedGroups;
        console.log(`[generateAILogistics] After validation: ${aiGroups.length} groups ready to create`);

        // 4. Verificar se é modo porta a porta (todos passageiros com mesmo horário)
        // Se o evento tiver strict_vehicle_assignment=true, FORÇAMOS o modo padrão (não flexível)
        let isDoorToDoorMode = allPassengers.every(p => {
            const time1 = p.time || p.flight_time;
            const time2 = allPassengers[0].time || allPassengers[0].flight_time;
            return time1 === time2;
        }) && allPassengers.length > 0;

        if (event.strict_vehicle_assignment) {
            console.log(`[generateAILogistics] STRICT VEHICLE ASSIGNMENT ENABLED. Overriding Door-to-Door mode to STANDARD mode.`);
            isDoorToDoorMode = false;
        }

        console.log(`[generateAILogistics] Door-to-door flexible mode: ${isDoorToDoorMode}`);

        let createdCount = 0;
        let rejectedCount = 0;

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
            console.warn('[generateAILogistics] Error initializing counters:', e);
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

        if (isDoorToDoorMode) {
            // MODO PORTA A PORTA: Criar vans e PRÉ-ATRIBUIR passageiros
            console.log(`[generateAILogistics] Door-to-door mode: Creating ${aiGroups.length} flexible vehicles and pre-assigning passengers`);

            for (let idx = 0; idx < aiGroups.length; idx++) {
                const group = aiGroups[idx];

                try {
                    // Converter índices para IDs reais dos passageiros
                    const passengerIds = (group.passenger_indexes || [])
                        .map(index => allPassengers[index]?.id)
                        .filter(Boolean);

                    if (passengerIds.length === 0) {
                        console.error(`[generateAILogistics] ❌ No valid passenger IDs for group ${idx + 1}`);
                        rejectedCount++;
                        continue;
                    }

                    const tripName = `${group.vehicle_type} #${idx + 1} (PTP)`;
                    const referencePassenger = allPassengers[0];
                    const tripDate = referencePassenger?.date || referencePassenger?.flight_date || new Date().toISOString().split('T')[0];
                    const tripOrigin = group.origin || 'Origem não especificada';
                    const tripCode = getNextTripCode(group.vehicle_type, tripDate, tripOrigin);

                    const tripData = {
                        event_id: eventId,
                        name: tripName,
                        trip_code: tripCode,
                        status: 'planned',
                        is_flexible_vehicle: true,
                        current_passenger_count: 0, // Será incrementado no check-in
                        origin: group.origin || 'Origem não especificada',
                        destination: group.destination || 'Destino não especificado',
                        date: referencePassenger?.date || referencePassenger?.flight_date || new Date().toISOString().split('T')[0],
                        start_time: referencePassenger?.time || referencePassenger?.flight_time || group.estimated_start_time || '00:00',
                        vehicle_type_category: group.vehicle_type,
                        vehicle_capacity: group.vehicle_capacity,
                        passenger_count: passengerIds.length, // Quantidade PRÉ-ATRIBUÍDA
                        notes: `Veículo flexível criado por IA. ${passengerIds.length} passageiros pré-atribuídos aguardando embarque.`
                    };

                    console.log(`[generateAILogistics] Creating flexible vehicle ${idx + 1} with ${passengerIds.length} passengers`);
                    const createdTrip = await base44.entities.EventTrip.create(tripData);
                    createdCount++;

                    // PRÉ-ATRIBUIR passageiros ao veículo flexível
                    await Promise.all(
                        passengerIds.map(pid => 
                            base44.entities.EventPassenger.update(pid, {
                                event_trip_id: createdTrip.id,
                                is_flexible_allocation: true,
                                status: 'assigned', // Atribuído, mas ainda não embarcou
                                boarding_status: 'pending' // Aguardando check-in manual
                            })
                        )
                    );

                    console.log(`[generateAILogistics] ✅ Created flexible vehicle ${idx + 1}/${aiGroups.length}: ${tripName} with ${passengerIds.length} passengers pre-assigned`);
                } catch (err) {
                    console.error(`[generateAILogistics] Error creating flexible vehicle ${idx + 1}:`, err);
                    console.error(`[generateAILogistics] Error message:`, err.message);
                    console.error(`[generateAILogistics] Error stack:`, err.stack);
                    rejectedCount++;
                }
            }

            console.log(`[generateAILogistics] ✅ Door-to-door setup complete: ${createdCount} flexible vehicles created with passengers pre-assigned`);

        } else {
            // MODO PADRÃO (Aeroporto): Atribuir passageiros diretamente às viagens
            console.log(`[generateAILogistics] Standard mode: Creating ${aiGroups.length} trips with pre-assigned passengers`);

            for (let idx = 0; idx < aiGroups.length; idx++) {
                const group = aiGroups[idx];

                // Converter índices para IDs reais
                const passengerIds = (group.passenger_indexes || [])
                    .map(index => allPassengers[index]?.id)
                    .filter(Boolean);

                if (passengerIds.length === 0) {
                    console.error(`[generateAILogistics] ❌ No valid passenger IDs for group ${idx + 1}`);
                    rejectedCount++;
                    continue;
                }

                // VALIDAÇÃO CRÍTICA
                if (passengerIds.length > group.vehicle_capacity) {
                    console.error(`[generateAILogistics] ❌ VALIDATION FAILED - Trip ${idx + 1}: ${passengerIds.length} passengers > ${group.vehicle_capacity} capacity`);
                    rejectedCount++;
                    continue;
                }

                try {
                    const tripName = `${group.vehicle_type.substring(0,3).toUpperCase()}${idx + 1} - ${passengerIds.length} Pax`;

                    const firstPassenger = allPassengers.find(p => p.id === passengerIds[0]);
                    const lastPassenger = allPassengers.find(p => p.id === passengerIds[passengerIds.length - 1]);

                    const tripStartTime = lastPassenger?.time || lastPassenger?.flight_time || group.estimated_start_time;
                    const tripDate = firstPassenger?.date || firstPassenger?.flight_date || new Date().toISOString().split('T')[0];
                    const tripOrigin = group.origin || 'Origem';
                    const tripCode = getNextTripCode(group.vehicle_type, tripDate, tripOrigin);

                    // Calcular Pickup Time se for OUT
                    let finalStartTime = tripStartTime;
                    const isOUT = (firstPassenger?.trip_type === 'OUT' || (firstPassenger?.trip_type || '').includes('OUT') || (firstPassenger?.trip_type || '').includes('SAIDA'));
                    
                    if (isOUT && pickupLeadTimeHours > 0) {
                        try {
                            // Normalizar hora
                            let cleanTime = tripStartTime ? tripStartTime.substring(0, 5) : "00:00";
                            if (!cleanTime.includes(':')) cleanTime = "00:00";
                            
                            const flightTimeDate = parse(`${tripDate} ${cleanTime}`, 'yyyy-MM-dd HH:mm', new Date());
                            
                            if (!isNaN(flightTimeDate.getTime())) {
                                const pickupDate = subHours(flightTimeDate, pickupLeadTimeHours);
                                finalStartTime = format(pickupDate, 'HH:mm');
                            }
                        } catch (e) {
                            console.warn('Error calculating pickup time AI', e);
                        }
                    }

                    const tripData = {
                        event_id: eventId,
                        name: tripName,
                        trip_code: tripCode,
                        status: 'planned',
                        origin: group.origin,
                        destination: group.destination,
                        date: firstPassenger?.date || firstPassenger?.flight_date || new Date().toISOString().split('T')[0],
                        start_time: finalStartTime,
                        vehicle_type_category: group.vehicle_type,
                        vehicle_capacity: group.vehicle_capacity,
                        passenger_count: passengerIds.length,
                        notes: `Otimizado por IA. ${group.reasoning || ''}. ${aiResponse.optimization_summary || ''}${isOUT ? ` Pickup calculado com ${pickupLeadTimeHours}h de antecedência.` : ''}`
                    };

                    const createdTrip = await base44.entities.EventTrip.create(tripData);
                    createdCount++;

                    // Atribuir passageiros à viagem
                    await Promise.all(
                        passengerIds.map(pid => 
                            base44.entities.EventPassenger.update(pid, {
                                event_trip_id: createdTrip.id,
                                status: 'assigned'
                            })
                        )
                    );

                    console.log(`[generateAILogistics] ✅ Created trip ${idx + 1}/${aiGroups.length}: ${tripName} with ${passengerIds.length} passengers`);
                } catch (err) {
                    console.error(`[generateAILogistics] Error creating trip ${idx + 1}:`, err);
                    rejectedCount++;
                }
            }
        }

        console.log(`[generateAILogistics] Final result: ${createdCount}/${aiGroups.length} trips created successfully (${rejectedCount} rejected for exceeding capacity)`);

        const message = rejectedCount > 0 
            ? `Logística otimizada por IA. ${createdCount} viagens criadas (${rejectedCount} grupos rejeitados por exceder capacidade - revise a configuração).`
            : `Logística otimizada por IA. ${createdCount} viagens criadas.`;

        return Response.json({ 
            success: true, 
            message: message,
            tripsCreated: createdCount,
            rejectedCount: rejectedCount,
            optimization_summary: aiResponse.optimization_summary
        });

    } catch (error) {
        console.error('[generateAILogistics] Full error:', error);
        console.error('[generateAILogistics] Error stack:', error.stack);
        console.error('[generateAILogistics] Error message:', error.message);
        console.error('[generateAILogistics] Error type:', error.name);
        return Response.json({ 
            error: error.message || 'Unknown error',
            details: error.stack,
            type: error.name
        }, { status: 500 });
    }
});