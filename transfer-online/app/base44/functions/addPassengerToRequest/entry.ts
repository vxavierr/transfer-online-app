import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { requestId, passengerData, token } = await req.json();

    if (!requestId || !passengerData) {
      return Response.json({ success: false, error: 'Dados incompletos' }, { status: 400 });
    }

    // Validar token se fornecido (segurança adicional para acesso via link público)
    if (token) {
      const sharedLists = await base44.asServiceRole.entities.SharedReceptiveList.filter({ token });
      if (sharedLists.length === 0) {
        return Response.json({ success: false, error: 'Token inválido' }, { status: 403 });
      }
      // const list = sharedLists[0];
    }

    // Buscar a solicitação (suporta ServiceRequest e SupplierOwnBooking)
    let entityType = 'ServiceRequest';
    let request = null;
    
    try {
        request = await base44.asServiceRole.entities.ServiceRequest.get(requestId);
    } catch (e) {
        // Ignorar erro se não encontrar na primeira entidade
    }
    
    if (!request) {
      try {
          request = await base44.asServiceRole.entities.SupplierOwnBooking.get(requestId);
          entityType = 'SupplierOwnBooking';
      } catch (e) {
          // Ignorar erro se não encontrar na segunda
      }
    }

    if (!request) {
      return Response.json({ success: false, error: 'Solicitação não encontrada' }, { status: 404 });
    }

    const newPassenger = {
      name: passengerData.name,
      document_type: passengerData.document_type || 'RG',
      document_number: passengerData.document_number || '',
      phone_number: passengerData.phone_number || '',
      boarding_point: passengerData.boarding_point || 'origin',
      disembarking_point: passengerData.disembarking_point || 'destination',
      is_added_by_coordinator: true,
      is_lead_passenger: false
    };

    const newStatus = {
      name: passengerData.name,
      status: 'pending',
      notes: 'Adicionado pelo coordenador',
      is_added_by_coordinator: true,
      updated_at: new Date().toISOString()
    };

    const newDepartureStatus = {
      name: passengerData.name,
      status: 'pending_departure',
      notes: '',
      updated_at: new Date().toISOString()
    };

    // Atualizar arrays
    const updatedDetails = [...(request.passengers_details || []), newPassenger];
    const updatedStatuses = [...(request.passenger_receptivity_statuses || []), newStatus];
    const updatedDepartureStatuses = [...(request.passenger_departure_statuses || []), newDepartureStatus];
    
    // Atualizar contagem
    const updatedCount = (request.passengers || 0) + 1;

    const updateData = {
      passengers: updatedCount,
      passengers_details: updatedDetails,
      passenger_receptivity_statuses: updatedStatuses,
      passenger_departure_statuses: updatedDepartureStatuses
    };

    if (entityType === 'ServiceRequest') {
        await base44.asServiceRole.entities.ServiceRequest.update(requestId, updateData);
    } else {
        await base44.asServiceRole.entities.SupplierOwnBooking.update(requestId, updateData);
    }

    return Response.json({ 
      success: true, 
      data: {
        passenger: newPassenger,
        status: newStatus,
        departureStatus: newDepartureStatus
      }
    });

  } catch (error) {
    console.error('Erro ao adicionar passageiro:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});