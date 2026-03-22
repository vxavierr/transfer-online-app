import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Função utilitária para obter horário de Brasília
function getBrasiliaTime() {
  const now = new Date();
  const brasiliaTimeString = now.toLocaleString('en-US', { 
    timeZone: 'America/Sao_Paulo' 
  });
  return new Date(brasiliaTimeString);
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        
        const { tripId, token } = body;

        if (!tripId || !token) {
            return Response.json({ error: 'Trip ID and Token are required' }, { status: 400 });
        }

        // 1. Validate Token (Coordinator Access)
        const sharedLists = await base44.asServiceRole.entities.SharedReceptiveList.filter({ token });
        if (sharedLists.length === 0) {
            return Response.json({ error: 'Invalid token' }, { status: 403 });
        }
        const sharedList = sharedLists[0];

        if (!sharedList.active) {
            return Response.json({ error: 'Link inactive' }, { status: 403 });
        }
        if (new Date() > new Date(sharedList.expires_at)) {
            return Response.json({ error: 'Link expired' }, { status: 410 });
        }

        // Check if tripId is allowed for this token
        if (sharedList.event_trip_ids && !sharedList.event_trip_ids.includes(tripId)) {
             return Response.json({ error: 'Trip not authorized for this token' }, { status: 403 });
        }

        // 2. Fetch Trip
        const trip = await base44.asServiceRole.entities.EventTrip.get(tripId).catch(() => null);
        if (!trip) {
            return Response.json({ error: 'Trip not found' }, { status: 404 });
        }

        // 3. Validate Trip Status
        const invalidStatuses = ['aguardando', 'finalizada', 'cancelada_motorista', 'no_show', 'concluida'];
        if (invalidStatuses.includes(trip.driver_trip_status)) {
            return Response.json({ 
                error: `Não é possível finalizar viagem com status atual: ${trip.driver_trip_status}` 
            }, { status: 400 });
        }

        // 4. Validate Passengers Status
        // All passengers must be 'boarded' or 'no_show'
        const passengers = await base44.asServiceRole.entities.EventPassenger.filter({ event_trip_id: tripId });
        const pendingPax = passengers.filter(p => p.boarding_status === 'pending');

        if (pendingPax.length > 0) {
            return Response.json({ 
                error: `Ainda existem ${pendingPax.length} passageiros pendentes. Realize check-in ou marque como no-show.` 
            }, { status: 400 });
        }

        // 5. Update Trip
        const nowISO = getBrasiliaTime().toISOString();

        await base44.asServiceRole.entities.EventTrip.update(tripId, {
            status: 'completed',
            driver_trip_status: 'finalizada',
            driver_trip_status_updated_at: nowISO,
            end_time: nowISO.split('T')[1].substring(0, 5) // Atualiza hora de fim real (HH:MM)
        });

        // 6. Log
        await base44.asServiceRole.entities.TripStatusLog.create({
            event_trip_id: tripId,
            status: 'finalizada',
            notes: `Viagem finalizada via Lista de Receptivo (Coordenador: ${sharedList.coordinator_name || 'Link Compartilhado'})`,
            timestamp: nowISO
        });

        return Response.json({ success: true, message: 'Viagem finalizada com sucesso' });

    } catch (error) {
        console.error('Error finalizing trip:', error);
        return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
});