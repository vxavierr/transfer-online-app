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
    const user = await base44.auth.me();

    if (!user || !user.supplier_id) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { serviceRequestId, approvedExpenses, reviewNotes } = body;

    if (!serviceRequestId) {
      return Response.json({ error: 'serviceRequestId é obrigatório' }, { status: 400 });
    }

    const serviceRequests = await base44.asServiceRole.entities.ServiceRequest.filter({ id: serviceRequestId });
    
    if (!serviceRequests || serviceRequests.length === 0) {
      return Response.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    const serviceRequest = serviceRequests[0];

    if (serviceRequest.chosen_supplier_id !== user.supplier_id) {
      return Response.json({ error: 'Você não tem permissão para revisar esta viagem' }, { status: 403 });
    }

    if (serviceRequest.status !== 'aguardando_revisao_fornecedor') {
      return Response.json({ 
        error: 'Esta viagem não está aguardando revisão de despesas' 
      }, { status: 400 });
    }

    // Calcular total de despesas aprovadas
    let totalAdditionalExpenses = 0;
    
    if (approvedExpenses && approvedExpenses.length > 0) {
      approvedExpenses.forEach(expense => {
        if (expense.type === 'hora_espera') {
          // Calcular valor baseado no tempo
          const minutes = expense.quantity_minutes || 0;
          const hours = Math.ceil(minutes / 60);
          expense.value = hours * 50; // R$ 50 por hora (pode ajustar)
        }
        totalAdditionalExpenses += expense.value || 0;
      });
    }

    const finalPriceWithAdditions = (serviceRequest.chosen_client_price || 0) + totalAdditionalExpenses;

    const brazilTime = getBrasiliaTime();

    await base44.asServiceRole.entities.ServiceRequest.update(serviceRequestId, {
      supplier_approved_additional_expenses: approvedExpenses || [],
      total_additional_expenses_approved: totalAdditionalExpenses,
      final_client_price_with_additions: finalPriceWithAdditions,
      supplier_review_notes: reviewNotes,
      supplier_reviewed_at: brazilTime.toISOString(),
      supplier_reviewed_by_user_id: user.id,
      status: 'concluida',
      driver_trip_status: 'finalizada',
      supplier_billing_status: 'pendente_faturamento'
    });

    return Response.json({
      success: true,
      message: 'Revisão de despesas concluída com sucesso',
      total_additional_expenses: totalAdditionalExpenses,
      final_price: finalPriceWithAdditions
    });

  } catch (error) {
    console.error('[approveServiceRequestExpenses] Erro:', error);
    return Response.json(
      { error: error.message || 'Erro ao aprovar despesas' },
      { status: 500 }
    );
  }
});