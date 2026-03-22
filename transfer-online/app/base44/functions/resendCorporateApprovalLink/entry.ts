import { createClientFromRequest } from 'npm:@base44/sdk@0.8.12';
import { Resend } from 'npm:resend';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { flowInstanceId } = await req.json();

    if (!flowInstanceId) {
      return Response.json({ error: 'Flow Instance ID is required' }, { status: 400 });
    }

    const flow = await base44.entities.DriverApprovalFlowInstance.get(flowInstanceId);

    if (!flow || flow.status !== 'in_progress') {
      return Response.json({ error: 'Flow not found or not in progress' }, { status: 404 });
    }

    // Buscar dados atualizados do cliente para pegar email corrigido, se houver
    const client = await base44.entities.Client.get(flow.client_id);
    let config = flow.flow_config_used;

    if (client && client.driver_approval_configs && config?.id) {
        const freshConfig = client.driver_approval_configs.find(c => c.id === config.id);
        // Verifica se a configuração existe e se o passo atual ainda é válido nela
        if (freshConfig && freshConfig.approver_sequence && freshConfig.approver_sequence[flow.current_approver_index]) {
             console.log('[resendCorporateApprovalLink] Updating flow config with fresh client data');
             config = freshConfig;
             
             // Atualiza o flow com a config mais recente
             await base44.entities.DriverApprovalFlowInstance.update(flow.id, {
                 flow_config_used: freshConfig
             });
        }
    }

    const currentApprover = config?.approver_sequence?.[flow.current_approver_index];

    if (!currentApprover) {
        return Response.json({ error: 'Current approver not found in configuration' }, { status: 500 });
    }

    // Find the latest valid token for this approver
    const validLink = flow.secure_links_sent
        ?.filter(l => l.approver_email === currentApprover.email && !l.used_at)
        ?.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))?.[0];

    let tokenToUse = validLink?.token;
    
    // If no valid token, generate a new one (shouldn't happen normally in progress, but for safety)
    if (!tokenToUse) {
        tokenToUse = crypto.randomUUID();
        const newLinkEntry = {
            approver_email: currentApprover.email,
            token: tokenToUse,
            sent_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        await base44.entities.DriverApprovalFlowInstance.update(flow.id, {
            secure_links_sent: [...(flow.secure_links_sent || []), newLinkEntry]
        });
    }

    // Get Target Name (Driver or Invitation)
    let targetName = "Candidato";
    let supplierId = null;

    if (flow.driver_id) {
        const driver = await base44.entities.Driver.get(flow.driver_id);
        targetName = driver?.name || targetName;
        supplierId = driver?.supplier_id;
    } else if (flow.invitation_id) {
        const invitation = await base44.entities.EmployeeInvitation.get(flow.invitation_id);
        targetName = invitation?.full_name || targetName;
        supplierId = invitation?.supplier_id;
    }

    // Buscar nome do fornecedor
    let supplierName = "Não informado";
    if (supplierId) {
        const supplier = await base44.entities.Supplier.get(supplierId);
        if (supplier) {
            supplierName = supplier.name || "Fornecedor sem nome";
        }
    }
    
    // client is already fetched above
    const clientName = client?.name || "Cliente Corporativo";

    const approvalLink = `${Deno.env.get('BASE_URL') || 'https://app.transferonline.com.br'}/AprovacaoMotorista?token=${tokenToUse}`;

    // Enviar email via Resend API
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    // Corrigido para naoresponda (sem hífen) conforme solicitado pelo usuário
    const resendFrom = Deno.env.get('RESEND_FROM') || 'TransferOnline <naoresponda@enviotransferonline.com.br>';

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    console.log('[resendCorporateApprovalLink] Resending approval email to:', currentApprover.email);
    console.log('[resendCorporateApprovalLink] FROM:', resendFrom);
    console.log('[resendCorporateApprovalLink] Approval link:', approvalLink);

    const resend = new Resend(resendApiKey);
    
    const { data, error } = await resend.emails.send({
      from: resendFrom,
      to: [currentApprover.email],
      subject: `Lembrete: Aprovação de Motorista Pendente - ${targetName}`,
      html: `
        <p>Olá ${currentApprover.name},</p>
        <p>Este é um lembrete de que uma solicitação de aprovação de motorista ainda aguarda sua atenção.</p>
        <p><strong>Motorista (Candidato):</strong> ${targetName}</p>
        <p><strong>Fornecedor:</strong> ${supplierName}</p>
        <p><strong>Cliente:</strong> ${clientName}</p>
        <p>Por favor, revise a documentação e aprove ou rejeite através do link abaixo:</p>
        <p><a href="${approvalLink}" style="padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Revisar Motorista</a></p>
        <p>Se o botão não funcionar, use este link: ${approvalLink}</p>
      `
    });

    if (error) {
        console.error('[resendCorporateApprovalLink] Resend SDK Error:', error);
        throw new Error(`Resend Error: ${error.message || error.name}`);
    }

    console.log('[resendCorporateApprovalLink] Email resent successfully via Resend SDK. ID:', data?.id);

    return Response.json({ success: true, message: 'Approval email resent' });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});