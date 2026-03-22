import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch (e) {
      console.warn('Auth check failed:', e);
    }

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId, driverId, subcontractorId, vehicleId, eventualDriverData, driverPayoutAmount, subcontractorCost, clientPrice, coordinatorCanStartTrip, coordinatorId, coordinatorIds, save_casual_driver, use_casual_driver_id } = await req.json();

    if (!tripId) {
      return Response.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    // Buscar trip atual com Service Role para garantir acesso
    const trips = await base44.asServiceRole.entities.EventTrip.filter({ id: tripId });
    if (!trips || trips.length === 0) {
        return Response.json({ error: 'Trip not found' }, { status: 404 });
    }
    const currentTrip = trips[0];

    // Verificar permissões
    // Buscar evento para verificar supplier_id
    const events = await base44.asServiceRole.entities.Event.filter({ id: currentTrip.event_id });
    const event = events.length > 0 ? events[0] : null;

    const isAdmin = user.role === 'admin';
    const isEventManager = user.event_access_active;
    let isSupplierOwner = false;
    
    if (user.supplier_id && event && event.supplier_id === user.supplier_id) {
        isSupplierOwner = true;
    }

    // Permitir também se for coordenador atribuído?
    // Por enquanto, manter restrito a gestores (Admin, Fornecedor Dono, Gerente de Eventos)
    if (!isAdmin && !isEventManager && !isSupplierOwner) {
        return Response.json({ error: 'Acesso negado. Você não tem permissão para editar esta viagem.' }, { status: 403 });
    }

    let finalDriverId = driverId === 'none' ? null : driverId;
    let finalVehicleId = vehicleId === 'none' ? null : vehicleId;
    let finalSubcontractorId = subcontractorId === 'none' ? null : subcontractorId;
    // Handle coordinatorId (legacy) and coordinatorIds (new)
    let finalCoordinatorIds = coordinatorIds || [];
    // Fallback for legacy single coordinator if new list not provided but single is
    if (finalCoordinatorIds.length === 0 && coordinatorId && coordinatorId !== 'none') {
        finalCoordinatorIds = [coordinatorId];
    }

    // Lógica para criar motorista eventual
    if (driverId === 'new_eventual' && eventualDriverData) {
        if (!event || !event.supplier_id) {
            return Response.json({ error: 'Supplier ID not found for this event' }, { status: 400 });
        }

        // 1. Criar Motorista
        const newDriver = await base44.asServiceRole.entities.Driver.create({
            supplier_id: event.supplier_id,
            name: eventualDriverData.name,
            phone_number: eventualDriverData.phone,
            email: eventualDriverData.email, // Salvar email para criar conta de usuário
            active: true,
            notes: 'Motorista Eventual criado via Gestão de Eventos',
            approval_status: 'approved', // Auto-aprovado pois foi criado pelo fornecedor
            approved_at: new Date().toISOString()
        });
        finalDriverId = newDriver.id;

        // 1.5. Convidar motorista como usuário se email fornecido
        if (eventualDriverData.email) {
            try {
                // Verificar se usuário já existe
                const existingUser = await base44.asServiceRole.users.list({ email: eventualDriverData.email });
                if (existingUser && existingUser.length > 0) {
                    console.log('User already exists for email:', eventualDriverData.email);
                } else {
                    await base44.users.inviteUser(eventualDriverData.email, 'user', { 
                        is_driver: true,
                        driver_id: newDriver.id,
                        supplier_id: event.supplier_id
                    });
                }
            } catch (inviteError) {
                console.warn('Failed to invite eventual driver user:', inviteError);
            }
        }

        // 2. Criar Veículo
        if (eventualDriverData.vehicle_model && eventualDriverData.vehicle_plate) {
            const newVehicle = await base44.asServiceRole.entities.DriverVehicle.create({
                driver_id: newDriver.id,
                vehicle_model: eventualDriverData.vehicle_model,
                vehicle_plate: eventualDriverData.vehicle_plate,
                vehicle_color: eventualDriverData.vehicle_color || 'N/A',
                active: true,
                is_default: true
            });
            finalVehicleId = newVehicle.id;
        }
    }

    // Lógica para motorista avulso (não cadastrado)
    let finalEventCasualDriverId = null;

    if (driverId === 'casual_driver' && eventualDriverData) {
        finalDriverId = null;
        finalVehicleId = null;

        // Se foi selecionado um motorista avulso existente
        if (use_casual_driver_id && use_casual_driver_id !== 'none') {
            finalEventCasualDriverId = use_casual_driver_id;
        } 
        // Se deve salvar como novo motorista avulso
        else if (save_casual_driver) {
            try {
                const newCasualDriver = await base44.asServiceRole.entities.EventCasualDriver.create({
                    event_id: currentTrip.event_id,
                    name: eventualDriverData.name,
                    phone: eventualDriverData.phone,
                    email: eventualDriverData.email || null,
                    vehicle_model: eventualDriverData.vehicle_model,
                    vehicle_plate: eventualDriverData.vehicle_plate,
                    active: true
                });
                finalEventCasualDriverId = newCasualDriver.id;
            } catch (err) {
                console.error("Erro ao criar motorista avulso:", err);
                // Não falha a requisição, apenas não salva/vincula
            }
        }
    }

    // Prepare update data
    const updateData = {};
    if (finalDriverId !== undefined) updateData.driver_id = finalDriverId;
    if (finalSubcontractorId !== undefined) updateData.subcontractor_id = finalSubcontractorId;
    if (finalVehicleId !== undefined) updateData.vehicle_id = finalVehicleId;

    if (driverId === 'casual_driver' && eventualDriverData) {
        updateData.is_casual_driver = true;
        updateData.casual_driver_name = eventualDriverData.name;
        updateData.casual_driver_phone = eventualDriverData.phone;
        updateData.casual_driver_vehicle_model = eventualDriverData.vehicle_model;
        updateData.casual_driver_vehicle_plate = eventualDriverData.vehicle_plate;
        
        // Atualizar vínculo com EventCasualDriver (se houver)
        if (finalEventCasualDriverId) {
            updateData.event_casual_driver_id = finalEventCasualDriverId;
        } else if (use_casual_driver_id === 'none' && !save_casual_driver) {
            // Se explicitamente escolheu "nenhum" e não salvou, remove o vínculo anterior se existir
            updateData.event_casual_driver_id = null;
        }

        // Limpar IDs se existirem
        updateData.driver_id = null;
        updateData.vehicle_id = null;
    } else if (finalDriverId) {
        // Se atribuir um motorista normal, limpar flag de casual
        updateData.is_casual_driver = false;
        updateData.casual_driver_name = null;
        updateData.casual_driver_phone = null;
        updateData.casual_driver_vehicle_model = null;
        updateData.casual_driver_vehicle_plate = null;
    }
    
    // Update coordinators (array and deprecated single field for compatibility)
    if (finalCoordinatorIds !== undefined) {
        updateData.coordinator_ids = finalCoordinatorIds;
        // Keep single field sync with first item or null
        updateData.coordinator_id = finalCoordinatorIds.length > 0 ? finalCoordinatorIds[0] : null;
    }
    
    // Atualizar valor de pagamento se fornecido (pode ser vazio para limpar, ou número)
    if (driverPayoutAmount !== undefined) {
        updateData.driver_payout_amount = driverPayoutAmount ? parseFloat(driverPayoutAmount) : null;
    }

    // Atualizar custo do parceiro
    if (subcontractorCost !== undefined) {
        updateData.subcontractor_cost = subcontractorCost ? parseFloat(subcontractorCost) : null;
    }

    // Atualizar valor de cobrança do cliente
    if (clientPrice !== undefined) {
        updateData.client_price = clientPrice ? parseFloat(clientPrice) : 0;
    }

    // Atualizar permissão do coordenador
    if (coordinatorCanStartTrip !== undefined) {
        updateData.coordinator_can_start_trip = coordinatorCanStartTrip;
    }

    if (Object.keys(updateData).length === 0) {
        return Response.json({ success: true, message: "Nothing to update" });
    }

    // Se estiver atribuindo um motorista e não houver token, gerar um e definir status inicial
    if (updateData.driver_id) {
        if (!currentTrip.driver_access_token) {
            updateData.driver_access_token = crypto.randomUUID();
        }
        if (!currentTrip.driver_trip_status) {
            updateData.driver_trip_status = 'aguardando';
        }
        
        // Atualizar status geral para dispatched se estiver planned
        if (currentTrip.status === 'planned') {
            updateData.status = 'dispatched';
        }
    }

    // Update Trip using Service Role to bypass RLS since we already checked permissions
    const updatedTrip = await base44.asServiceRole.entities.EventTrip.update(tripId, updateData);

    // Enviar notificação apenas se um motorista cadastrado foi atribuído (updateData.driver_id existe e não é null)
    if (updateData.driver_id) {
        try {
            console.log(`[updateEventTripDriver] Disparando notificação para o motorista ${updateData.driver_id} da viagem ${tripId}`);
            // Invoca a função de notificação existente que envia WhatsApp e Email com link do sistema e Google Calendar
            await base44.functions.invoke('notifyDriverAboutTrip', { 
                serviceRequestId: tripId, 
                notificationType: 'both' 
            });
        } catch (error) {
            console.error('[updateEventTripDriver] Erro ao enviar notificação para o motorista:', error);
            // Não falhar a requisição principal, apenas logar o erro
        }
    }

    return Response.json({ success: true, trip: updatedTrip });

  } catch (error) {
    console.error('Error updating trip driver:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});