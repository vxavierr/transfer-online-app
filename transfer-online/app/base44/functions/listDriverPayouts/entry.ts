import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { start_date, end_date } = body;
    // Frontend envia driver_filter, mas código interno usa driver_id. Mapeando para garantir compatibilidade.
    const driver_id = body.driver_id || body.driver_filter;

    // Aumentar o limite para garantir que pegamos todos os registros
    // Se o SDK permitir limit no filter, usamos. Se não, dependemos do default (que pode ser 50).
    // O ideal é usar paginação ou um limit alto.
    // Vamos assumir que filter aceita limit como terceiro argumento.
    const QUERY_LIMIT = 2000;

    // Buscar motoristas do fornecedor para filtrar EventTrips
    let supplierDrivers = [];
    if (user.supplier_id) {
        supplierDrivers = await base44.entities.Driver.filter({ supplier_id: user.supplier_id }, null, 1000);
    }
    const supplierDriverIds = supplierDrivers.map(d => d.id);
    
    // Criar mapa de IDs para Nomes para resolver nomes faltantes
    const driverNameMap = {};
    supplierDrivers.forEach(d => {
        driverNameMap[d.id] = d.name;
    });

    // Buscar ServiceRequests (Plataforma)
    let platformQuery = {};
    if (start_date && end_date) {
        platformQuery.date = { $gte: start_date, $lte: end_date };
    } else if (start_date) {
        platformQuery.date = { $gte: start_date };
    } else if (end_date) {
        platformQuery.date = { $lte: end_date };
    }
    
    // Se for fornecedor, filtrar apenas as suas
    if (user.supplier_id && user.role !== 'admin') {
        platformQuery.chosen_supplier_id = user.supplier_id;
    }

    // Se driver_id fornecido
    if (driver_id && driver_id !== 'all') {
        platformQuery.driver_id = driver_id;
    }

    const platformTrips = await base44.entities.ServiceRequest.filter(platformQuery, null, QUERY_LIMIT);
    
    // Buscar SupplierOwnBookings (Próprias)
    let ownQuery = {};
    if (start_date && end_date) {
        ownQuery.date = { $gte: start_date, $lte: end_date };
    } else if (start_date) {
        ownQuery.date = { $gte: start_date };
    } else if (end_date) {
        ownQuery.date = { $lte: end_date };
    }
    
    if (user.supplier_id && user.role !== 'admin') {
        ownQuery.supplier_id = user.supplier_id;
    }
    
    if (driver_id && driver_id !== 'all') {
        ownQuery.driver_id = driver_id;
    }

    const ownTrips = await base44.entities.SupplierOwnBooking.filter(ownQuery, null, QUERY_LIMIT);

    // Buscar EventTrips (Eventos)
    let eventQuery = {};
    if (start_date && end_date) {
        eventQuery.date = { $gte: start_date, $lte: end_date };
    } else if (start_date) {
        eventQuery.date = { $gte: start_date };
    } else if (end_date) {
        eventQuery.date = { $lte: end_date };
    }

    if (driver_id && driver_id !== 'all') {
        eventQuery.driver_id = driver_id;
    } else {
        // Se for "all", precisamos filtrar pelos motoristas do fornecedor
        // EventTrip não tem supplier_id, então filtramos por driver_id IN [meus_motoristas]
        if (supplierDriverIds.length > 0) {
            // O SDK pode não suportar $in com lista grande. 
            // Se a lista for pequena (< 100), ok. Se for grande, melhor buscar por driver se possível ou buscar tudo e filtrar em memória.
            // Vamos tentar buscar tudo no range de data e filtrar em memória se o driver pertence ao fornecedor.
            // Isso é menos performático mas mais seguro se o filtro $in falhar.
            // Mas se tivermos muitos eventos de OUTROS fornecedores, isso é ruim.
            // Vamos assumir que a maioria dos eventos no banco são segregados ou poucos.
            // Melhor: filtrar em memória pelo driver_id.
        } else {
            // Se não tem motoristas, não deve ter viagens de evento para pagar (a menos que use motorista avulso?)
            // Se driver_id for null, ignoramos?
        }
    }

    // Buscar EventTrips
    const eventTripsAll = await base44.entities.EventTrip.filter(eventQuery, null, QUERY_LIMIT);
    
    // Filtrar EventTrips relevantes (apenas meus motoristas)
    const eventTrips = eventTripsAll.filter(trip => {
        if (!trip.driver_id) return false;
        // Se selecionou um motorista específico, já filtrou na query, mas checamos se é do fornecedor
        if (driver_id && driver_id !== 'all') {
             return supplierDriverIds.includes(trip.driver_id);
        }
        // Se "all", incluir apenas se o motorista for deste fornecedor
        return supplierDriverIds.includes(trip.driver_id);
    });

    // Processar dados
    const validStatuses = ['confirmada', 'em_andamento', 'concluida', 'finalizada', 'completed', 'dispatched', 'confirmed', 'aguardando_revisao_fornecedor'];
    
    const allTrips = [
        ...platformTrips.map(t => ({...t, source: 'platform', type: 'service_request'})), 
        ...ownTrips.map(t => ({...t, source: 'own', type: 'supplier_own_booking'})),
        ...eventTrips.map(t => ({
            ...t, 
            source: 'event', 
            type: 'event_trip',
            // Mapear campos específicos de EventTrip para ficarem compatíveis
            driver_payout_amount: t.driver_payout_amount || 0,
            driver_payout_status: t.driver_payout_status || 'pendente',
            date: t.date,
            request_number: t.trip_code || t.name || 'EVT-' + t.id.substr(0, 8),
            status: t.status === 'completed' ? 'concluida' : t.status // Normalizar status se necessário
        }))
    ].filter(t => {
        // Normalizar status para checagem
        const s = t.status || t.driver_trip_status; // Fallback
        return validStatuses.includes(s) || validStatuses.includes(t.status);
    });

    // Agrupar por motorista
    const driverStats = {};

    allTrips.forEach(trip => {
        if (!trip.driver_id && !trip.driver_name) return;

        const driverKey = trip.driver_id || trip.driver_name;
        // Tentar resolver nome pelo mapa se não vier na viagem
        const resolvedName = trip.driver_name || driverNameMap[trip.driver_id] || 'Motorista Desconhecido';

        if (!driverStats[driverKey]) {
            driverStats[driverKey] = {
                driver_id: trip.driver_id,
                driver_name: resolvedName,
                total_trips: 0,
                total_revenue: 0,
                total_cost: 0,
                margin: 0
            };
        } else if (driverStats[driverKey].driver_name === 'Motorista Desconhecido' && resolvedName !== 'Motorista Desconhecido') {
            // Atualizar nome se encontrarmos um melhor depois
            driverStats[driverKey].driver_name = resolvedName;
        }

        // Receita
        let revenue = 0;
        if (trip.source === 'platform') {
            if (user.role === 'admin') {
                revenue = trip.chosen_client_price || 0;
            } else {
                revenue = trip.chosen_supplier_cost || 0;
            }
        } else if (trip.source === 'own') {
            revenue = trip.price || 0;
        } else if (trip.source === 'event') {
            // Evento: Receita?
            // Se for fornecedor, talvez client_price ou supplier_cost?
            // EventTrip tem client_price e supplier_cost.
            revenue = trip.client_price || 0; 
        }

        // Custo (Pago ao motorista)
        let cost = trip.driver_payout_amount || 0;

        driverStats[driverKey].total_trips += 1;
        driverStats[driverKey].total_revenue += revenue;
        driverStats[driverKey].total_cost += cost;
    });

    // Calcular margem e formatar array
    const report = Object.values(driverStats).map(stat => ({
        ...stat,
        margin: stat.total_revenue - stat.total_cost,
        roi: stat.total_cost > 0 ? ((stat.total_revenue - stat.total_cost) / stat.total_cost) * 100 : 0
    }));

    // Ordenar por margem (decrescente)
    report.sort((a, b) => b.margin - a.margin);

    // Totais gerais
    const summary = {
        total_revenue: report.reduce((acc, r) => acc + r.total_revenue, 0),
        total_cost: report.reduce((acc, r) => acc + r.total_cost, 0),
        total_margin: report.reduce((acc, r) => acc + r.margin, 0),
        total_trips: report.reduce((acc, r) => acc + r.total_trips, 0)
    };

    // Formatar 'payouts' para a tabela detalhada (se necessário para o frontend que usa driverPayouts)
    // O frontend espera { payouts: [], summary: {} }
    // O código anterior retornava payouts como lista de viagens.
    // Vamos manter compatibilidade com o frontend GerenciarPagamentos.js
    
    // Mapear allTrips para o formato esperado pelo frontend
    const payoutsFormatted = allTrips.map(t => ({
        id: t.id,
        trip_date: t.date,
        request_number: t.request_number || t.trip_code || t.booking_number,
        driver_name: t.driver_name || driverNameMap[t.driver_id] || driverStats[t.driver_id]?.driver_name || 'Motorista Desconhecido',
        driver_id: t.driver_id,
        amount: t.driver_payout_amount || 0,
        status: t.driver_payout_status || 'pendente',
        type: t.type,
        notes: t.driver_notes || t.driver_payout_notes,
        additional_expenses: t.driver_reported_additional_expenses || []
    }));
    
    // Ordenar por data de viagem (mais recente primeiro)
    payoutsFormatted.sort((a, b) => {
      if (!a.trip_date) return 1;
      if (!b.trip_date) return -1;
      return new Date(b.trip_date) - new Date(a.trip_date);
    });

    // Recalcular totais baseados nos payouts filtrados (que são os mesmos do report)
    const summaryFormatted = {
        total_pendente: payoutsFormatted.filter(p => p.status === 'pendente').reduce((sum, p) => sum + p.amount, 0),
        total_pago: payoutsFormatted.filter(p => p.status === 'pago').reduce((sum, p) => sum + p.amount, 0),
        count_pendente: payoutsFormatted.filter(p => p.status === 'pendente').length,
        count_pago: payoutsFormatted.filter(p => p.status === 'pago').length,
        count_total: payoutsFormatted.length
    };

    return Response.json({ 
        success: true,
        report, // Para relatório financeiro
        summary: summaryFormatted, // Para Gerenciar Pagamentos
        payouts: payoutsFormatted // Para tabela detalhada
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});