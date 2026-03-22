import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token is required' }, { status: 400 });
    }

    // Buscar em TODOS os fluxos para identificar problema específico
    const allFlows = await base44.asServiceRole.entities.DriverApprovalFlowInstance.list();
    
    let targetFlow = null;
    let tokenData = null;

    for (const flow of allFlows) {
        if (Array.isArray(flow.secure_links_sent)) {
            const foundToken = flow.secure_links_sent.find(t => t.token === token);
            if (foundToken) {
                targetFlow = flow;
                tokenData = foundToken;
                break;
            }
        }
    }

    if (!targetFlow || !tokenData) {
        console.log('[getDriverApprovalFlow] Token not found:', token);
        return Response.json({ error: 'Link de aprovação inválido ou não encontrado' }, { status: 404 });
    }

    if (tokenData.used_at) {
        console.log('[getDriverApprovalFlow] Token already used:', token);
        return Response.json({ error: 'Este link de aprovação já foi utilizado' }, { status: 400, code: 'TOKEN_USED' });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
        console.log('[getDriverApprovalFlow] Token expired:', token);
        return Response.json({ error: 'Este link de aprovação expirou' }, { status: 400, code: 'TOKEN_EXPIRED' });
    }

    if (targetFlow.status !== 'in_progress') {
        console.log('[getDriverApprovalFlow] Flow not in progress. Status:', targetFlow.status);
        return Response.json({ 
            error: `Este processo de aprovação já foi ${targetFlow.status === 'completed' ? 'finalizado' : 'cancelado'}` 
        }, { status: 400, code: 'FLOW_NOT_IN_PROGRESS' });
    }

    // Buscar dados do motorista ou convite para exibir
    let driverData = null;
    
    if (targetFlow.driver_id) {
        const driver = await base44.asServiceRole.entities.Driver.get(targetFlow.driver_id);
        driverData = {
            name: driver.name,
            photo_url: driver.photo_url,
            license_number: driver.license_number,
            license_expiry: driver.license_expiry,
            license_document_url: driver.license_document_url,
            aso_document_url: driver.aso_document_url,
            pgr_document_url: driver.pgr_document_url,
            cnh_status: driver.cnh_status,
            cnh_extracted_data: driver.cnh_extracted_data,
            phone_number: driver.phone_number,
            email: driver.email,
            driver_phone_by_manager: driver.driver_phone_by_manager,
            driver_email_by_manager: driver.driver_email_by_manager,
            document_id: driver.document_id
        };
    } else if (targetFlow.invitation_id) {
        const invitation = await base44.asServiceRole.entities.EmployeeInvitation.get(targetFlow.invitation_id);
        driverData = {
            name: invitation.full_name,
            photo_url: invitation.photo_url || null,
            license_number: invitation.cnh_extracted_data?.numero_registro || null,
            license_expiry: invitation.cnh_extracted_data?.validade || null,
            license_document_url: invitation.license_document_url,
            aso_document_url: invitation.aso_document_url,
            pgr_document_url: invitation.pgr_document_url,
            cnh_status: null,
            cnh_extracted_data: invitation.cnh_extracted_data,
            phone_number: invitation.phone_number,
            email: invitation.email,
            driver_phone_by_manager: invitation.phone_number,
            driver_email_by_manager: invitation.email,
            document_id: invitation.cnh_extracted_data?.cpf || null
        };
    }

    if (!driverData) {
        return Response.json({ error: 'Driver or Invitation not found' }, { status: 404 });
    }

    const client = await base44.asServiceRole.entities.Client.get(targetFlow.client_id);

    // Obter dados do aprovador com segurança
    let approverName = tokenData.approver_name || "Aprovador";
    let totalSteps = 1;
    
    if (targetFlow.flow_config_used && 
        Array.isArray(targetFlow.flow_config_used.approver_sequence) && 
        targetFlow.flow_config_used.approver_sequence[targetFlow.current_approver_index]) {
            
        approverName = tokenData.approver_name || targetFlow.flow_config_used.approver_sequence[targetFlow.current_approver_index].name;
        totalSteps = targetFlow.flow_config_used.approver_sequence.length;
    }

    // Retornar apenas dados necessários para aprovação (sanitizar se necessário)
    return Response.json({
        driver: driverData,
        client_name: client ? client.name : "Cliente",
        approver_name: approverName,
        current_step: (targetFlow.current_approver_index || 0) + 1,
        total_steps: totalSteps,
        approver_history: targetFlow.approver_history || []
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});