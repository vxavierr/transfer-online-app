import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tripId } = await req.json();

        if (!tripId) {
            return Response.json({ error: 'Trip ID is required' }, { status: 400 });
        }

        // 1. Validar a viagem
        const trip = await base44.entities.EventTrip.get(tripId);
        if (!trip) {
            return Response.json({ error: 'Trip not found' }, { status: 404 });
        }

        // 2. Buscar passageiros vinculados
        const passengers = await base44.entities.EventPassenger.filter({ event_trip_id: tripId }, {}, 1000);
        
        // 3. Atualizar passageiros para 'pending'
        await Promise.all(passengers.map(p => 
            base44.entities.EventPassenger.update(p.id, {
                status: 'pending',
                event_trip_id: null
            })
        ));

        // 4. Excluir a viagem
        await base44.entities.EventTrip.delete(tripId);

        return Response.json({ 
            success: true, 
            message: `Viagem desagrupada. ${passengers.length} passageiros retornaram para pendente.` 
        });

    } catch (error) {
        console.error('Error ungrouping trip:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});