import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Função utilitária para obter horário de Brasília (GMT-3)
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

    // Buscar todas as solicitações aguardando resposta
    const allRequests = await base44.asServiceRole.entities.ServiceRequest.list();
    const pendingRequests = allRequests.filter(
      sr => sr.supplier_response_status === 'aguardando_resposta' && sr.supplier_response_deadline
    );

    const now = getBrasiliaTime();
    console.log('[checkServiceRequestTimeouts] 🕐 Horário Brasília atual:', now.toISOString());
    
    const processedRequests = [];

    for (const serviceRequest of pendingRequests) {
      try {
        const deadline = new Date(serviceRequest.supplier_response_deadline);

        // Verificar se expirou (usando horário de Brasília)
        if (now > deadline) {
          console.log(`[Timeout] Solicitação ${serviceRequest.request_number} expirou`);

          // Buscar dados do cliente
          const clients = await base44.asServiceRole.entities.Client.list();
          const client = clients.find(c => c.id === serviceRequest.client_id);

          // Atualizar histórico de fallback
          const history = serviceRequest.fallback_history || [];
          history.push({
            supplier_id: serviceRequest.chosen_supplier_id,
            supplier_name: 'Fornecedor Atual',
            sent_at: serviceRequest.supplier_request_sent_at,
            response_at: now.toISOString(),
            status: 'timeout',
            reason: 'Tempo limite de resposta excedido'
          });

          await base44.asServiceRole.entities.ServiceRequest.update(serviceRequest.id, {
            supplier_response_status: 'timeout',
            fallback_history: history
          });

          // Se fallback automático estiver habilitado, tentar próximo fornecedor
          if (client && client.auto_fallback_enabled) {
            const offeredSuppliers = serviceRequest.offered_suppliers || [];
            const currentIndex = serviceRequest.current_supplier_index || 0;
            const nextIndex = currentIndex + 1;

            if (nextIndex < offeredSuppliers.length) {
              // Tem próximo fornecedor disponível
              const nextSupplier = offeredSuppliers[nextIndex];
              
              // Gerar novo token
              const newToken = btoa(`${Date.now()}-${Math.random()}-${nextSupplier.supplier_id}`);
              
              // Calcular novo deadline (usando horário de Brasília)
              const timeoutMinutes = client.supplier_response_timeout_minutes || 60;
              const newDeadline = new Date(now);
              newDeadline.setMinutes(newDeadline.getMinutes() + timeoutMinutes);

              await base44.asServiceRole.entities.ServiceRequest.update(serviceRequest.id, {
                chosen_supplier_id: nextSupplier.supplier_id,
                chosen_vehicle_type_id: nextSupplier.vehicle_type_id,
                chosen_supplier_cost: nextSupplier.supplier_cost,
                chosen_client_price: nextSupplier.client_price,
                current_supplier_index: nextIndex,
                supplier_response_status: 'aguardando_resposta',
                supplier_request_sent_at: now.toISOString(),
                supplier_response_deadline: newDeadline.toISOString(),
                supplier_response_token: newToken,
                supplier_refusal_reason: null
              });

              console.log(`[Timeout] Redirecionando para próximo fornecedor (índice ${nextIndex})`);

              processedRequests.push({
                request_number: serviceRequest.request_number,
                action: 'fallback',
                next_supplier_index: nextIndex
              });

            } else {
              // Não tem mais fornecedores disponíveis
              await base44.asServiceRole.entities.ServiceRequest.update(serviceRequest.id, {
                status: 'cancelada'
              });

              console.log(`[Timeout] Nenhum fornecedor disponível. Cancelando solicitação ${serviceRequest.request_number}`);

              processedRequests.push({
                request_number: serviceRequest.request_number,
                action: 'cancelled',
                reason: 'Nenhum fornecedor disponível'
              });
            }
          } else {
            // Fallback não está habilitado, apenas cancelar
            await base44.asServiceRole.entities.ServiceRequest.update(serviceRequest.id, {
              status: 'cancelada'
            });

            processedRequests.push({
              request_number: serviceRequest.request_number,
              action: 'cancelled',
              reason: 'Timeout e fallback não habilitado'
            });
          }
        }

      } catch (requestError) {
        console.error(`Erro ao processar timeout para solicitação ${serviceRequest.id}:`, requestError);
      }
    }

    return Response.json({
      success: true,
      checked: pendingRequests.length,
      processed: processedRequests.length,
      details: processedRequests,
      brasilia_time: now.toISOString()
    });

  } catch (error) {
    console.error('Erro ao verificar timeouts:', error);
    return Response.json(
      { error: error.message || 'Erro ao verificar timeouts' },
      { status: 500 }
    );
  }
});