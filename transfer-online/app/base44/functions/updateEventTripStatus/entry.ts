import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Autenticação - pode ser via token público ou usuário logado
        const { token, tripId, newStatus, vehicle_plate_photo_url } = await req.json();
        
        let user = null;
        let isCoordinator = false;
        
        if (token) {
            // Validar token do coordenador via SharedReceptiveList
            const sharedLists = await base44.asServiceRole.entities.SharedReceptiveList.filter({ token, active: true });
            
            if (!sharedLists || sharedLists.length === 0) {
                return Response.json({ success: false, error: 'Token inválido ou expirado' }, { status: 401 });
            }
            
            const sharedList = sharedLists[0];
            
            // Verificar se o tripId está na lista de event_trip_ids
            if (!sharedList.event_trip_ids || !sharedList.event_trip_ids.includes(tripId)) {
                return Response.json({ success: false, error: 'Viagem não encontrada nesta lista' }, { status: 403 });
            }
            
            isCoordinator = true;
        } else {
            // Usuário logado (motorista ou gestor)
            user = await base44.auth.me();
            if (!user) {
                return Response.json({ success: false, error: 'Não autenticado' }, { status: 401 });
            }
        }
        
        // Buscar a EventTrip
        const trip = await base44.asServiceRole.entities.EventTrip.get(tripId);
        
        if (!trip) {
            return Response.json({ success: false, error: 'Viagem não encontrada' }, { status: 404 });
        }
        
        // Validações de permissão
        if (isCoordinator) {
            // Coordenador só pode iniciar viagem se tiver permissão
            if (!trip.coordinator_can_start_trip) {
                return Response.json({ success: false, error: 'Você não tem permissão para iniciar esta viagem' }, { status: 403 });
            }
            
            // Coordenador só pode alterar de "aguardando" para "a_caminho"
            if (trip.driver_trip_status !== 'aguardando' || newStatus !== 'a_caminho') {
                return Response.json({ success: false, error: 'Operação não permitida' }, { status: 403 });
            }
        } else if (user) {
            // Motorista ou gestor
            const isDriver = user.is_driver && user.driver_id === trip.driver_id;
            const isSupplier = user.supplier_id;
            const isAdmin = user.role === 'admin';
            
            if (!isDriver && !isSupplier && !isAdmin) {
                return Response.json({ success: false, error: 'Você não tem permissão para atualizar esta viagem' }, { status: 403 });
            }
        }
        
        // Validar transições de status permitidas
        const allowedTransitions = {
            'aguardando': ['a_caminho', 'cancelada_motorista'],
            'a_caminho': ['chegou_origem', 'cancelada_motorista'],
            'chegou_origem': ['passageiro_embarcou', 'no_show', 'cancelada_motorista'],
            'passageiro_embarcou': ['a_caminho_destino', 'cancelada_motorista'],
            'a_caminho_destino': ['chegou_destino', 'cancelada_motorista'],
            'chegou_destino': ['finalizada'],
            'no_show': ['finalizada'],
            'finalizada': [],
            'cancelada_motorista': []
        };
        
        const currentStatus = trip.driver_trip_status || 'aguardando';
        
        if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
            return Response.json({ 
                success: false, 
                error: `Transição de status não permitida: ${currentStatus} → ${newStatus}` 
            }, { status: 400 });
        }
        
        // Dados para atualização
        const updateData = {
            driver_trip_status: newStatus,
            driver_trip_status_updated_at: new Date().toISOString()
        };

        // Se for início de viagem ("a_caminho"), calcular ETA e salvar foto
        if (newStatus === 'a_caminho') {
            updateData.started_at = new Date().toISOString();
            
            if (vehicle_plate_photo_url) {
                updateData.vehicle_plate_photo_url = vehicle_plate_photo_url;
            }

            // Calcular ETA usando Google Maps
            const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
            if (googleMapsApiKey && trip.origin && trip.destination) {
                try {
                    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
                    url.searchParams.append('origins', trip.origin);
                    url.searchParams.append('destinations', trip.destination);
                    url.searchParams.append('mode', 'driving');
                    url.searchParams.append('departure_time', 'now');
                    url.searchParams.append('traffic_model', 'best_guess');
                    url.searchParams.append('key', googleMapsApiKey);

                    const response = await fetch(url.toString());
                    const data = await response.json();

                    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
                        const element = data.rows[0].elements[0];
                        const durationSeconds = element.duration_in_traffic?.value || element.duration?.value || 0;
                        
                        // Calcular timestamp de chegada
                        const now = new Date();
                        const etaDate = new Date(now.getTime() + (durationSeconds * 1000));
                        
                        updateData.estimated_arrival_time = etaDate.toISOString();
                        updateData.eta_duration_text = element.duration_in_traffic?.text || element.duration?.text;
                        
                        console.log(`[updateEventTripStatus] ETA calculado: ${updateData.eta_duration_text}`);
                    }
                } catch (err) {
                    console.error('[updateEventTripStatus] Erro ao calcular ETA:', err);
                }
            }
        }

        // Atualizar o status
        await base44.asServiceRole.entities.EventTrip.update(tripId, updateData);

        // Notificar chegada
        if (newStatus === 'chegou_origem') {
            base44.asServiceRole.functions.invoke('notifyDriverArrival', {
                tripId: tripId,
                tripType: 'EventTrip',
                overrideDriverName: trip.driver_name
            }).catch(err => console.error('[updateEventTripStatus] Erro ao notificar chegada:', err));
        }
        
        return Response.json({ 
            success: true, 
            message: 'Status da viagem atualizado com sucesso',
            newStatus,
            eta: updateData.estimated_arrival_time
        });
        
    } catch (error) {
        console.error('Erro ao atualizar status da viagem:', error);
        return Response.json({ 
            success: false, 
            error: error.message || 'Erro ao atualizar status da viagem' 
        }, { status: 500 });
    }
});