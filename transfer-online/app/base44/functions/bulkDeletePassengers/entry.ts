import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper for batch processing
async function processInBatches(items, batchSize, processFn) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processFn));
        results.push(...batchResults);
    }
    return results;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { passengerIds, eventId } = body;

        if (!passengerIds || !Array.isArray(passengerIds) || passengerIds.length === 0) {
            return Response.json({ error: 'IDs de passageiros inválidos' }, { status: 400 });
        }

        console.log(`Iniciando exclusão de ${passengerIds.length} passageiros...`);

        // 1. Get passengers to identify affected trips (Batch: 20)
        // We need to know which trips to update later
        const passengers = await processInBatches(passengerIds, 20, async (id) => {
            try {
                return await base44.entities.EventPassenger.get(id);
            } catch (e) {
                console.warn(`Passageiro ${id} não encontrado ou erro ao buscar:`, e.message);
                return null;
            }
        });
        
        const validPassengers = passengers.filter(p => p !== null);
        const affectedTripIds = new Set();

        validPassengers.forEach(p => {
            if (p.event_trip_id) affectedTripIds.add(p.event_trip_id);
        });

        console.log(`Encontrados ${validPassengers.length} passageiros válidos para exclusão.`);

        // 2. Delete passengers (Batch: 10 to avoid DB locks/limits)
        let deletedCount = 0;
        await processInBatches(validPassengers, 10, async (p) => {
            try {
                await base44.entities.EventPassenger.delete(p.id);
                deletedCount++;
            } catch (e) {
                console.error(`Erro ao excluir passageiro ${p.id}:`, e.message);
            }
        });

        console.log(`Excluídos ${deletedCount} passageiros. Atualizando ${affectedTripIds.size} viagens afetadas...`);

        // 3. Update affected trips counts (Batch: 5)
        const tripIds = Array.from(affectedTripIds);
        await processInBatches(tripIds, 5, async (tripId) => {
            try {
                // Fetch current count
                const tripPassengers = await base44.entities.EventPassenger.filter({ event_trip_id: tripId });
                const count = tripPassengers.length;
                
                // Update trip
                await base44.entities.EventTrip.update(tripId, { 
                    passenger_count: count,
                    current_passenger_count: count
                });
            } catch (err) {
                console.error(`Erro ao atualizar trip ${tripId}:`, err.message);
            }
        });

        // 4. Update Event Count
        if (eventId) {
             try {
                 // Use a reasonable limit, if > 10000 might be inaccurate but better than crashing
                 const eventPassengers = await base44.entities.EventPassenger.filter({ event_id: eventId }, {}, 5000); // reduced limit for safety
                 await base44.entities.Event.update(eventId, { passenger_count: eventPassengers.length });
             } catch(e) {
                 console.error("Erro ao atualizar contagem do evento:", e.message);
             }
        }

        return Response.json({ 
            success: true, 
            count: deletedCount, 
            requested: passengerIds.length,
            message: `${deletedCount} passageiros excluídos com sucesso.`
        });

    } catch (error) {
        console.error('Erro crítico ao excluir passageiros em lote:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});