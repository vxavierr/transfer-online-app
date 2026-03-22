import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const requestBody = await req.json();
    const { 
      serviceRequestId, 
      accept, 
      refusalReason, 
      updatedPrice,
      driverData // Novo objeto opcional com dados do motorista
    } = requestBody;

    console.log("[supplierAcceptRejectRequest] Chamado com:", { serviceRequestId, accept, updatedPrice, hasDriverData: !!driverData });

    if (!serviceRequestId || accept === undefined || accept === null) {
      console.error("[supplierAcceptRejectRequest] Parâmetros obrigatórios faltando");
      return Response.json(
        { success: false, error: 'Parâmetros obrigatórios: serviceRequestId, accept' },
        { status: 400 }
      );
    }

    if (!accept && !refusalReason) {
      console.error("[supplierAcceptRejectRequest] Motivo da recusa obrigatório");
      return Response.json(
        { success: false, error: 'Motivo da recusa é obrigatório quando accept=false' },
        { status: 400 }
      );
    }

    // Verificar autenticação e autorização
    const user = await base44.auth.me();
    const isAdmin = user?.role === 'admin';
    const isSupplier = user?.supplier_id && !isAdmin;

    console.log("[supplierAcceptRejectRequest] Usuário autenticado:", {
      user_id: user?.id,
      role: user?.role,
      supplier_id: user?.supplier_id,
      isSupplier
    });

    if (!user || !isSupplier) {
      console.error("[supplierAcceptRejectRequest] Acesso não autorizado");
      return Response.json(
        { success: false, error: 'Acesso não autorizado. Apenas fornecedores podem responder solicitações.' },
        { status: 403 }
      );
    }

    // Buscar ServiceRequest com service role
    const requests = await base44.asServiceRole.entities.ServiceRequest.list();
    const serviceRequest = requests.find(r => 
      r.id === serviceRequestId && 
      r.chosen_supplier_id === user.supplier_id &&
      r.supplier_response_status === 'aguardando_resposta'
    );

    console.log("[supplierAcceptRejectRequest] ServiceRequest encontrado:", !!serviceRequest);

    if (!serviceRequest) {
      console.error("[supplierAcceptRejectRequest] Solicitação não encontrada ou já respondida");
      return Response.json(
        { success: false, error: 'Solicitação não encontrada ou já foi respondida' },
        { status: 404 }
      );
    }

    const now = new Date();
    const updateData = {
      supplier_response_at: now.toISOString(),
      supplier_response_status: accept ? 'aceito' : 'recusado'
    };

    if (updatedPrice !== undefined && updatedPrice !== null && updatedPrice > 0) {
      updateData.chosen_supplier_cost = updatedPrice;
      updateData.chosen_client_price = updatedPrice; // No modelo corporativo, supplier_cost = client_price (sem margem adicional da plataforma sobre o valor editado)
    }

    // Processar dados do motorista se fornecidos e se for aceitação
    if (accept && driverData) {
      console.log("[supplierAcceptRejectRequest] Atribuindo motorista:", driverData.driver_name);
      
      updateData.driver_id = driverData.driver_id || null;
      updateData.driver_name = driverData.driver_name;
      updateData.driver_phone = driverData.driver_phone;
      updateData.driver_photo_url = driverData.driver_photo_url;
      updateData.vehicle_model = driverData.vehicle_model;
      updateData.vehicle_plate = driverData.vehicle_plate;
      
      if (driverData.driver_trip_status) {
        updateData.driver_trip_status = driverData.driver_trip_status;
      } else {
        // Se atribuir motorista, define status inicial como aguardando se ainda não tiver
        updateData.driver_trip_status = 'aguardando';
      }

      // Se houver notas para o motorista
      if (driverData.driver_notes) {
        updateData.driver_notes = driverData.driver_notes;
      }

      // Se houver valor de pagamento ao motorista
      if (driverData.driver_payout_amount) {
        updateData.driver_payout_amount = parseFloat(driverData.driver_payout_amount);
      }
    }

    if (!accept) {
      updateData.supplier_refusal_reason = refusalReason;
      updateData.status = 'cancelada';
    } else {
      updateData.status = 'confirmada';
    }

    // Atualizar histórico de fallback
    const fallbackHistory = serviceRequest.fallback_history || [];
    fallbackHistory.push({
      supplier_id: user.supplier_id,
      supplier_name: 'Fornecedor',
      sent_at: serviceRequest.supplier_request_sent_at,
      response_at: now.toISOString(),
      status: accept ? 'aceito' : 'recusado',
      reason: refusalReason || null
    });
    updateData.fallback_history = fallbackHistory;

    console.log("[supplierAcceptRejectRequest] Atualizando ServiceRequest...");
    await base44.asServiceRole.entities.ServiceRequest.update(serviceRequestId, updateData);
    console.log("[supplierAcceptRejectRequest] ServiceRequest atualizado com sucesso");

    // Se motorista foi atribuído, enviar notificação automática
    if (accept && driverData && updateData.driver_id) {
      try {
        // Chamar função de notificação de motorista
        // Não usamos await para não bloquear a resposta
        base44.functions.invoke('notifyDriverAboutTrip', {
          serviceRequestId: serviceRequestId,
          notificationType: 'whatsapp'
        }).catch(err => console.error('[supplierAcceptRejectRequest] Erro ao notificar motorista em background:', err));
      } catch (e) {
        console.error('[supplierAcceptRejectRequest] Erro ao tentar invocar notificação:', e);
      }
    }

    // ===== NOTIFICAÇÃO VIA WHATSAPP TEMPORARIAMENTE SUSPENSA =====
    // Notificar admin via WhatsApp apenas
    /*
    try {
      const configs = await base44.asServiceRole.entities.AppConfig.list();
      const adminWhatsAppConfig = configs.find(c => c.config_key === 'admin_whatsapp_number');
      
      if (adminWhatsAppConfig?.config_value) {
        const suppliers = await base44.asServiceRole.entities.Supplier.list();
        const supplierData = suppliers.find(p => p.id === user.supplier_id);

        const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
        const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
        const evolutionInstanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');

        if (evolutionApiUrl && evolutionApiKey && evolutionInstanceName) {
          const adminPhone = adminWhatsAppConfig.config_value.replace(/\D/g, '');

          const statusEmoji = accept ? '✅' : '❌';
          const statusText = accept ? 'ACEITOU' : 'RECUSOU';
          
          let message = `${statusEmoji} *FORNECEDOR ${statusText} SOLICITAÇÃO*\n\n` +
            `Solicitação: *${serviceRequest.request_number}*\n` +
            `Fornecedor: *${supplierData?.name || 'N/A'}*\n` +
            `Status: *${statusText}*\n`;

          if (!accept && refusalReason) {
            message += `\n📝 *Motivo:* ${refusalReason}\n`;
          }

          message += `\nAcesse o painel para mais detalhes.`;

          await fetch(`${evolutionApiUrl}/message/sendText/${evolutionInstanceName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiKey
            },
            body: JSON.stringify({
              number: adminPhone,
              text: message
            })
          });

          console.log("[supplierAcceptRejectRequest] Notificação enviada ao admin");
        }
      }
    } catch (notifError) {
      console.warn('[supplierAcceptRejectRequest] Erro ao notificar admin (não crítico):', notifError);
    }
    */
    // ===== FIM DA SEÇÃO COMENTADA =====

    return Response.json({ 
      success: true, 
      message: accept ? 'Solicitação aceita com sucesso' : 'Solicitação recusada'
    });

  } catch (error) {
    console.error('[supplierAcceptRejectRequest] Erro ao processar resposta do fornecedor:', error);
    return Response.json(
      { success: false, error: error.message || 'Erro ao processar resposta' },
      { status: 500 }
    );
  }
});