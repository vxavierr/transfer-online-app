import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Resend } from 'npm:resend';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas admin pode iniciar o fluxo
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { driverId, invitationId, clientId, flowConfigId } = await req.json();

    if ((!driverId && !invitationId) || !clientId) {
      return Response.json({ error: 'Driver ID (or Invitation ID) and Client ID are required' }, { status: 400 });
    }

    // 1. Buscar Driver/Convite e Cliente
    let driver = null;
    let invitation = null;
    
    if (driverId) {
        driver = await base44.entities.Driver.get(driverId);
    } else if (invitationId) {
        invitation = await base44.entities.EmployeeInvitation.get(invitationId);
    }

    const client = await base44.entities.Client.get(clientId);

    if ((!driver && !invitation) || !client) {
      return Response.json({ error: 'Driver/Invitation or Client not found' }, { status: 404 });
    }
    
    const targetName = driver ? driver.name : invitation.full_name;

    // Buscar nome do fornecedor
    let supplierName = "Não informado";
    const supplierId = driver ? driver.supplier_id : invitation.supplier_id;
    if (supplierId) {
        const supplier = await base44.entities.Supplier.get(supplierId);
        if (supplier) {
            supplierName = supplier.name || "Fornecedor sem nome";
        }
    }

    // 2. Encontrar a configuração de fluxo correta
    let flowConfig = null;
    if (flowConfigId) {
        flowConfig = client.driver_approval_configs?.find(c => c.id === flowConfigId);
    } else {
        // Se não especificado, pega o primeiro ativo
        flowConfig = client.driver_approval_configs?.find(c => c.active !== false);
    }

    if (!flowConfig || !flowConfig.approver_sequence || flowConfig.approver_sequence.length === 0) {
      return Response.json({ error: 'No active approval flow configuration found for this client' }, { status: 400 });
    }

    // 3. Criar DriverApprovalFlowInstance
    const flowData = {
      client_id: clientId,
      status: 'in_progress',
      current_approver_index: 0,
      approver_history: [],
      secure_links_sent: [],
      flow_config_used: flowConfig
    };
    
    if (driverId) flowData.driver_id = driverId;
    if (invitationId) flowData.invitation_id = invitationId;

    const flowInstance = await base44.entities.DriverApprovalFlowInstance.create(flowData);

    // 4. Atualizar Driver ou Convite
    if (driverId) {
        await base44.entities.Driver.update(driverId, {
          requires_corporate_approval: true,
          corporate_approval_status: 'pending_approver_review',
          corporate_approval_flow_id: flowInstance.id
        });
    } else if (invitationId) {
        await base44.entities.EmployeeInvitation.update(invitationId, {
            pre_approval_status: 'in_progress',
            pre_approval_flow_id: flowInstance.id,
            corporate_flow_client_id: clientId // Garante que fica registrado
        });
    }

    // 5. Enviar notificação para o primeiro aprovador
    const firstApprover = flowConfig.approver_sequence[0];
    const secureToken = crypto.randomUUID();
    const approvalLink = `${Deno.env.get('BASE_URL') || 'https://app.transferonline.com.br'}/AprovacaoMotorista?token=${secureToken}`;

    // Salvar token
    await base44.entities.DriverApprovalFlowInstance.update(flowInstance.id, {
      secure_links_sent: [{
        approver_email: firstApprover.email,
        token: secureToken,
        sent_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias
      }]
    });

    // Enviar email via Resend API
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    // Corrigido para naoresponda (sem hífen) conforme solicitado pelo usuário
    const resendFrom = Deno.env.get('RESEND_FROM') || 'TransferOnline <naoresponda@enviotransferonline.com.br>';

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    console.log('[initiateCorporateDriverApproval] Sending approval email to:', firstApprover.email);
    console.log('[initiateCorporateDriverApproval] FROM:', resendFrom);

    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from: resendFrom,
      to: [firstApprover.email],
      subject: `Aprovação de Motorista Pendente: ${targetName}`,
      html: `
        <p>Olá ${firstApprover.name},</p>
        <p>Uma nova solicitação de aprovação de motorista requer sua atenção.</p>
        <p><strong>Motorista (Candidato):</strong> ${targetName}</p>
        <p><strong>Fornecedor:</strong> ${supplierName}</p>
        <p><strong>Cliente:</strong> ${client.name}</p>
        <p>Por favor, revise a documentação e aprove ou rejeite através do link abaixo:</p>
        <p><a href="${approvalLink}" style="padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Revisar Motorista</a></p>
        <p>Se o botão não funcionar, use este link: ${approvalLink}</p>
      `
    });

    if (error) {
        console.error('[initiateCorporateDriverApproval] Resend SDK Error:', error);
        throw new Error(`Resend Error: ${error.message || error.name}`);
    }

    console.log('[initiateCorporateDriverApproval] Email sent successfully via Resend SDK. ID:', data?.id);

    return Response.json({ success: true, flowInstanceId: flowInstance.id });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});