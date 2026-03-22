import { createClientFromRequest } from 'npm:@base44/sdk@0.8.12';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { start_date, end_date, driver_id } = await req.json();

    // Validar datas
    if (!start_date || !end_date) {
      return Response.json({ error: 'Datas de início e fim são obrigatórias' }, { status: 400 });
    }

    const QUERY_LIMIT = 2000;

    // Buscar ServiceRequests (Plataforma)
    let platformQuery = {
        date: { $gte: start_date, $lte: end_date }
    };
    
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
    let ownQuery = {
        date: { $gte: start_date, $lte: end_date }
    };
    
    if (user.supplier_id && user.role !== 'admin') {
        ownQuery.supplier_id = user.supplier_id;
    }
    
    if (driver_id && driver_id !== 'all') {
        ownQuery.driver_id = driver_id;
    }

    const ownTrips = await base44.entities.SupplierOwnBooking.filter(ownQuery, null, QUERY_LIMIT);

    // Buscar EventTrips
    let eventTrips = [];
    if (user.supplier_id) {
        // Buscar motoristas do fornecedor
        const supplierDrivers = await base44.entities.Driver.filter({ supplier_id: user.supplier_id }, null, 1000);
        const supplierDriverIds = supplierDrivers.map(d => d.id);

        if (supplierDriverIds.length > 0) {
            let eventQuery = {
                date: { $gte: start_date, $lte: end_date }
            };

            if (driver_id && driver_id !== 'all') {
                eventQuery.driver_id = driver_id;
            }
            // Se "all", filtramos em memória para garantir que o motorista é do fornecedor

            const eventTripsAll = await base44.entities.EventTrip.filter(eventQuery, null, QUERY_LIMIT);
            
            eventTrips = eventTripsAll.filter(trip => {
                if (!trip.driver_id) return false;
                return supplierDriverIds.includes(trip.driver_id);
            });
        }
    } else if (user.role === 'admin') {
        // Admin vê tudo (se driver_id não especificado)
        let eventQuery = {
            date: { $gte: start_date, $lte: end_date }
        };
        if (driver_id && driver_id !== 'all') {
            eventQuery.driver_id = driver_id;
        }
        eventTrips = await base44.entities.EventTrip.filter(eventQuery, null, QUERY_LIMIT);
    }

    // Processar dados
    const validStatuses = ['confirmada', 'em_andamento', 'concluida', 'finalizada', 'completed', 'dispatched', 'confirmed'];
    
    const allTrips = [
        ...platformTrips.map(t => ({...t, source: 'platform'})), 
        ...ownTrips.map(t => ({...t, source: 'own'})),
        ...eventTrips.map(t => ({
            ...t, 
            source: 'event',
            // Normalizar campos
            driver_payout_amount: t.driver_payout_amount || 0,
            status: t.status === 'completed' ? 'concluida' : t.status
        }))
    ].filter(t => {
        const s = t.status || t.driver_trip_status;
        return validStatuses.includes(s) || validStatuses.includes(t.status);
    });

    // Agrupar por motorista
    const driverStats = {};

    allTrips.forEach(trip => {
        // Ignorar se não tiver motorista atribuído (embora o filtro driver_id já cuide disso se passado)
        if (!trip.driver_id && !trip.driver_name) return;

        const driverKey = trip.driver_id || trip.driver_name; // Fallback para nome se ID for nulo (motorista manual sem cadastro)
        const driverName = trip.driver_name || 'Motorista Desconhecido';

        if (!driverStats[driverKey]) {
            driverStats[driverKey] = {
                driver_id: trip.driver_id,
                driver_name: driverName,
                total_trips: 0,
                total_revenue: 0,
                total_cost: 0,
                margin: 0,
                total_additional_expenses: 0,
                trips_with_expenses_count: 0
            };
        }

        // Check for additional expenses
        let additionalExpenses = 0;
        let hasAdditionalExpenses = false;
        
        if (trip.driver_reported_additional_expenses && Array.isArray(trip.driver_reported_additional_expenses)) {
            const expensesSum = trip.driver_reported_additional_expenses.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
            if (expensesSum > 0) {
                additionalExpenses = expensesSum;
                hasAdditionalExpenses = true;
            }
        }

        driverStats[driverKey].total_additional_expenses += additionalExpenses;
        if (hasAdditionalExpenses) {
            driverStats[driverKey].trips_with_expenses_count += 1;
        }

        // Receita
        let revenue = 0;
        if (trip.source === 'platform') {
            // Para fornecedor, a receita é o que a plataforma paga (supplier_cost)
            // Para admin, a receita é o que o cliente paga (client_price)
            if (user.role === 'admin') {
                revenue = trip.chosen_client_price || 0;
            } else {
                revenue = trip.chosen_supplier_cost || 0;
            }
        } else if (trip.source === 'own') {
            revenue = trip.price || 0;
        } else if (trip.source === 'event') {
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

    return Response.json({ report, summary });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});