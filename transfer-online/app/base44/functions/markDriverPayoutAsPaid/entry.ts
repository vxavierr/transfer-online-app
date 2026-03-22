import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticar usuário
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é fornecedor
    if (!user.supplier_id) {
      return Response.json({ error: 'Acesso restrito a fornecedores' }, { status: 403 });
    }

    // Parse do body
    const body = await req.json();
    const {
      payout_ids, // Agora contém IDs de ServiceRequest ou SupplierOwnBooking ou EventTrip
      payment_notes
    } = body;

    if (!payout_ids || payout_ids.length === 0) {
      return Response.json({ 
        error: 'IDs dos pagamentos são obrigatórios' 
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updated = [];
    const errors = [];

    // Processar cada pagamento
    for (const id of payout_ids) {
      try {
        let entityType = null;
        let entity = null;

        // Tentar encontrar na ServiceRequest
        try {
            entity = await base44.asServiceRole.entities.ServiceRequest.get(id);
            if (entity) entityType = 'ServiceRequest';
        } catch (e) {
            // Ignorar erro 404
        }

        // Se não achou, tentar na SupplierOwnBooking
        if (!entity) {
            try {
                entity = await base44.asServiceRole.entities.SupplierOwnBooking.get(id);
                if (entity) entityType = 'SupplierOwnBooking';
            } catch (e) {
                 // Ignorar erro 404
            }
        }
        
        // Se não achou, tentar em EventTrip
        if (!entity) {
            try {
                entity = await base44.asServiceRole.entities.EventTrip.get(id);
                if (entity) entityType = 'EventTrip';
            } catch (e) {
                // Ignorar erro 404
            }
        }

        // Se ainda não achou, tentar na DriverPayout (legado)
        if (!entity) {
            try {
                const payouts = await base44.asServiceRole.entities.DriverPayout.filter({ id: id });
                if (payouts.length > 0) {
                    entity = payouts[0];
                    entityType = 'DriverPayout';
                }
            } catch (e) {
                 // Ignorar
            }
        }

        if (!entity) {
          errors.push({ id: id, error: 'Viagem/Pagamento não encontrado' });
          continue;
        }

        // Verificar se pertence ao fornecedor (direta ou indiretamente)
        let isAuthorized = false;
        if (entityType === 'ServiceRequest' && entity.chosen_supplier_id === user.supplier_id) isAuthorized = true;
        if (entityType === 'SupplierOwnBooking' && entity.supplier_id === user.supplier_id) isAuthorized = true;
        if (entityType === 'DriverPayout' && entity.supplier_id === user.supplier_id) isAuthorized = true;
        
        if (entityType === 'EventTrip') {
            // EventTrip não tem supplier_id, verificamos se o motorista pertence ao fornecedor
            if (entity.driver_id) {
                const driver = await base44.asServiceRole.entities.Driver.get(entity.driver_id);
                if (driver && driver.supplier_id === user.supplier_id) {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
          errors.push({ id: id, error: 'Sem permissão' });
          continue;
        }

        // Atualizar conforme o tipo
        if (entityType === 'ServiceRequest') {
            await base44.asServiceRole.entities.ServiceRequest.update(id, {
                driver_payout_status: 'pago',
                driver_payout_date: now,
                driver_payout_notes: payment_notes || null
            });
        } else if (entityType === 'SupplierOwnBooking') {
            await base44.asServiceRole.entities.SupplierOwnBooking.update(id, {
                driver_payout_status: 'pago',
                driver_payout_date: now,
                driver_notes: payment_notes ? (entity.driver_notes ? entity.driver_notes + '\n' + payment_notes : payment_notes) : entity.driver_notes
            });
        } else if (entityType === 'EventTrip') {
            await base44.asServiceRole.entities.EventTrip.update(id, {
                driver_payout_status: 'pago',
                driver_payout_date: now,
                driver_payout_notes: payment_notes || null
            });
        } else if (entityType === 'DriverPayout') {
            await base44.asServiceRole.entities.DriverPayout.update(id, {
                status: 'pago',
                payment_date: now,
                payment_notes: payment_notes || null,
                paid_by_user_id: user.id
            });
        }

        updated.push(id);
      } catch (error) {
        console.error(`[markDriverPayoutAsPaid] Erro ao processar ${id}:`, error);
        errors.push({ id: id, error: error.message });
      }
    }

    return Response.json({
      success: true,
      updated_count: updated.length,
      updated_ids: updated,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error) {
    console.error('[markDriverPayoutAsPaid] Erro:', error);
    return Response.json({
      error: error.message || 'Erro ao marcar pagamentos'
    }, { status: 500 });
  }
});