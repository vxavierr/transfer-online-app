import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      client_id,
      legs,
      passengers,
      passenger_user_id,
      passenger_name,
      passenger_email,
      passenger_phone,
      passengers_details,
      notes,
      cost_allocation,
      billing_method,
      billing_responsible_user_id,
      billing_responsible_email,
      billing_responsible_name,
      credit_card_payment_link_recipient,
      purchase_order_number,
      requester_user_id,
      requester_full_name,
      requester_email,
      requester_phone,
      frequent_requester_id,
      notification_phones
    } = body;

    if (!client_id || !legs || legs.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Dados incompletos: cliente e trechos são obrigatórios' 
      }, { status: 400 });
    }

    // Validar client
    const clients = await base44.asServiceRole.entities.Client.filter({ id: client_id });
    const client = clients[0];
    if (!client || !client.active) {
      return Response.json({ 
        success: false, 
        error: 'Cliente não encontrado ou inativo' 
      }, { status: 400 });
    }

    // VALIDAÇÃO PRÉVIA - Validar TODOS os trechos antes de criar qualquer registro
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      
      if (!leg.origin || !leg.destination || !leg.date || !leg.time) {
        return Response.json({ 
          success: false, 
          error: `Trecho ${i + 1}: Campos obrigatórios faltando (origem, destino, data, horário)` 
        }, { status: 400 });
      }
      
      if (!leg.calculatedPrice || leg.calculatedPrice <= 0) {
        return Response.json({ 
          success: false, 
          error: `Trecho ${i + 1}: Preço não calculado. Verifique os dados e aguarde o cálculo automático.` 
        }, { status: 400 });
      }
      
      if (!leg.supplierId || !leg.vehicleTypeId) {
        return Response.json({ 
          success: false, 
          error: `Trecho ${i + 1}: Informações do fornecedor ou veículo ausentes.` 
        }, { status: 400 });
      }
    }
    
    // TRANSAÇÃO ATÔMICA - Criar todas as ServiceRequests e fazer rollback em caso de erro
    const createdRequests = [];
    
    try {
      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        
        // Gerar número sequencial
        const counterDocs = await base44.asServiceRole.entities.ServiceRequestCounter.filter({ counter_name: 'main' });
        let counter;
        if (counterDocs.length === 0) {
          counter = await base44.asServiceRole.entities.ServiceRequestCounter.create({
            counter_name: 'main',
            last_number: 1
          });
        } else {
          counter = counterDocs[0];
          await base44.asServiceRole.entities.ServiceRequestCounter.update(counter.id, {
            last_number: counter.last_number + 1
          });
          counter = await base44.asServiceRole.entities.ServiceRequestCounter.get(counter.id);
        }
        
        const requestNumber = `SR-${String(counter.last_number).padStart(4, '0')}`;

        // Criar ServiceRequest
        const requestData = {
        request_number: requestNumber,
        client_id,
        user_id: requester_user_id || user.id,
        requester_user_id: requester_user_id || null,
        requester_full_name: requester_full_name || user.full_name,
        requester_email: requester_email || user.email,
        requester_phone: requester_phone || user.phone_number,
        frequent_requester_id: frequent_requester_id || null,
        passenger_user_id,
        service_type: 'one_way',
        is_return_leg: false,
        driver_language: leg.driverLanguage || 'pt',
        origin: leg.origin,
        destination: leg.destination,
        origin_flight_number: leg.origin_flight_number || '',
        destination_flight_number: leg.destination_flight_number || '',
        date: leg.date,
        time: leg.time,
        passengers,
        passenger_name,
        passenger_email,
        passenger_phone,
        passengers_details: passengers_details || [],
        notes: notes || `Trecho ${i + 1}/${legs.length} - Itinerário Multi-trechos`,
        offered_suppliers: [
          {
            supplier_id: leg.supplierId,
            supplier_name: leg.supplierName || 'Fornecedor',
            vehicle_type_id: leg.vehicleTypeId,
            vehicle_type_name: leg.vehicleTypeName,
            supplier_cost: leg.calculationDetails?.supplier_cost || 0,
            client_price: leg.calculatedPrice,
            calculation_details: leg.calculationDetails
          }
        ],
        chosen_supplier_id: leg.supplierId,
        chosen_vehicle_type_id: leg.vehicleTypeId,
        chosen_supplier_cost: leg.calculationDetails?.supplier_cost || 0,
        chosen_client_price: leg.calculatedPrice,
        cost_allocation: cost_allocation || [],
        billing_method,
        billing_responsible_user_id,
        billing_responsible_email,
        billing_responsible_name,
        credit_card_payment_link_recipient,
        purchase_order_number,
        status: 'aguardando_fornecedor',
        supplier_response_status: 'aguardando_escolha',
        current_supplier_index: 0,
        notification_phones: notification_phones || []
      };

        const createdRequest = await base44.asServiceRole.entities.ServiceRequest.create(requestData);
        createdRequests.push(createdRequest);

        // Enviar notificação ao fornecedor
        try {
          await base44.asServiceRole.functions.invoke('sendSupplierQuoteNotification', {
            service_request_id: createdRequest.id
          });
        } catch (notifError) {
          console.error(`Erro ao enviar notificação do trecho ${i + 1}:`, notifError);
        }
      }

      // SUCESSO - Todos os trechos criados
      return Response.json({
        success: true,
        message: `${createdRequests.length} solicitações criadas com sucesso`,
        requests: createdRequests.map(r => r.request_number)
      });
      
    } catch (transactionError) {
      // ROLLBACK - Deletar todas as ServiceRequests criadas até agora
      console.error('[submitMultiTripServiceRequest] Erro durante criação, fazendo rollback:', transactionError);
      
      for (const req of createdRequests) {
        try {
          await base44.asServiceRole.entities.ServiceRequest.delete(req.id);
        } catch (rollbackError) {
          console.error(`Erro ao deletar SR ${req.request_number} durante rollback:`, rollbackError);
        }
      }
      
      return Response.json({ 
        success: false, 
        error: `Erro ao criar trechos: ${transactionError.message}. Nenhuma solicitação foi criada.` 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[submitMultiTripServiceRequest] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Erro ao processar solicitação' 
    }, { status: 500 });
  }
});