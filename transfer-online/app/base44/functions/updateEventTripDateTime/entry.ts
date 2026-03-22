import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { tripId, date, time, origin, destination, partner_notes, trip_type, vehicle_type_category, additional_stops } = body;

        if (!tripId || !date || !time) {
            return Response.json({ error: 'Campos obrigatórios: tripId, date, time' }, { status: 400 });
        }

        // 1. Atualizar a viagem (EventTrip)
        const updateData = {
            date: date,
            start_time: time,
        };

        if (origin !== undefined) updateData.origin = origin;
        if (destination !== undefined) updateData.destination = destination;
        if (trip_type !== undefined) updateData.trip_type = trip_type;
        if (vehicle_type_category !== undefined) {
            updateData.vehicle_type_category = vehicle_type_category;
            
            // Buscar capacidade do tipo de veículo para atualizar também
            try {
                // Tenta encontrar o tipo de veículo pelo nome
                const vehicleTypes = await base44.entities.VehicleType.filter({ name: vehicle_type_category }, { limit: 1 });
                if (vehicleTypes && vehicleTypes.length > 0) {
                    updateData.vehicle_capacity = vehicleTypes[0].max_passengers;
                    updateData.vehicle_type_category = vehicleTypes[0].name; // Garante consistência
                }
            } catch (e) {
                console.warn('Erro ao buscar capacidade do veículo:', e);
            }
        }
        if (additional_stops !== undefined) {
            console.log('UpdateEventTripDateTime: Received additional_stops:', JSON.stringify(additional_stops));
            let stops = additional_stops;
            if (typeof stops === 'string') {
                try {
                    stops = JSON.parse(stops);
                } catch (e) {
                    console.error('Error parsing additional_stops:', e);
                    stops = []; 
                }
            }
            updateData.additional_stops = stops;
        }
        
        if (partner_notes !== undefined) {
            updateData.partner_notes = partner_notes;
        }

        console.log('UpdateEventTripDateTime: Updating EventTrip with data:', JSON.stringify(updateData));
        await base44.entities.EventTrip.update(tripId, updateData);
        console.log('UpdateEventTripDateTime: EventTrip updated successfully');

        // 2. Buscar e atualizar todos os passageiros vinculados para manter consistência
        // Isso garante que os relatórios e filtros continuem funcionando corretamente
        const passengers = await base44.entities.EventPassenger.filter({ event_trip_id: tripId });
        
        // Atualizar em paralelo para performance
        const passengerUpdateData = {
            date: date,
            time: time
        };
        if (origin !== undefined) passengerUpdateData.origin_address = origin;
        if (destination !== undefined) passengerUpdateData.destination_address = destination;
        
        if (trip_type !== undefined) {
            // Map trip_type to passenger trip_type
            let paxTripType = 'airport_transfer';
            if (trip_type === 'arrival') paxTripType = 'IN';
            else if (trip_type === 'departure') paxTripType = 'OUT';
            else if (trip_type === 'transfer') paxTripType = 'airport_transfer'; // or door_to_door depending on logic
            
            passengerUpdateData.trip_type = paxTripType;
        }

        const updatePromises = passengers.map(p => 
            base44.entities.EventPassenger.update(p.id, passengerUpdateData)
        );
        await Promise.all(updatePromises);
        console.log(`UpdateEventTripDateTime: Updated ${passengers.length} linked passengers`);

        return Response.json({ 
            success: true, 
            message: `Viagem e ${passengers.length} passageiro(s) atualizados com sucesso` 
        });

    } catch (error) {
        console.error('Erro ao atualizar data/hora da viagem:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});