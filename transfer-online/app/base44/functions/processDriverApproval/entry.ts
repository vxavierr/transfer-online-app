import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Resend } from 'npm:resend';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Nota: Esta função pode ser chamada publicamente com o token, então a validação de auth user não é estrita aqui,
    // mas validamos o token.

    const { token, status, comments } = await req.json();

    if (!token || !status) {
      return Response.json({ error: 'Token and status are required' }, { status: 400 });
    }

    if (!['approved', 'rejected'].includes(status)) {
        return Response.json({ error: 'Invalid status' }, { status: 400 });
    }

    // 1. Encontrar o fluxo pelo token
    // Como não podemos buscar dentro de arrays JSON diretamente de forma eficiente em todos os DBs, 
    // idealmente teríamos uma entidade separada para tokens, mas vamos buscar nos fluxos 'in_progress'.
    // Para simplificar, vamos assumir que recebemos o token e precisamos validar.
    
    // Melhor abordagem: Listar fluxos in_progress e filtrar em memória (assumindo volume baixo de aprovações simultâneas)
    // Ou melhor: se o volume for alto, criar entidade ApprovalToken.
    // Dado o contexto atual, vamos filtrar os in_progress.
    
    const activeFlows = await base44.asServiceRole.entities.DriverApprovalFlowInstance.filter({ status: 'in_progress' });
    
    let targetFlow = null;
    let tokenData = null;

    for (const flow of activeFlows) {
        const foundToken = flow.secure_links_sent?.find(t => t.token === token);
        if (foundToken) {
            targetFlow = flow;
            tokenData = foundToken;
            break;
        }
    }

    if (!targetFlow || !tokenData) {
        return Response.json({ error: 'Invalid or expired token' }, { status: 404 });
    }

    if (tokenData.used_at) {
        return Response.json({ error: 'Token already used' }, { status: 400 });
    }

    // Validar expiração
    if (new Date(tokenData.expires_at) < new Date()) {
        return Response.json({ error: 'Token expired' }, { status: 400 });
    }

    const currentApprover = targetFlow.flow_config_used.approver_sequence[targetFlow.current_approver_index];
    
    // Validar se o token pertence ao aprovador atual (segurança extra)
    if (tokenData.approver_email !== currentApprover.email) {
         return Response.json({ error: 'Token mismatch' }, { status: 403 });
    }

    // 2. Atualizar Histórico
    const newHistoryEntry = {
        approver_email: currentApprover.email,
        approver_name: currentApprover.name,
        status: status,
        comments: comments,
        timestamp: new Date().toISOString(),
        secure_link_used: token
    };

    const updatedHistory = [...(targetFlow.approver_history || []), newHistoryEntry];
    
    // Marcar token como usado
    const updatedLinks = targetFlow.secure_links_sent.map(l => 
        l.token === token ? { ...l, used_at: new Date().toISOString() } : l
    );

    let updates = {
        approver_history: updatedHistory,
        secure_links_sent: updatedLinks
    };

    const driverId = targetFlow.driver_id;
    const invitationId = targetFlow.invitation_id;

    if (status === 'rejected') {
        // REJEITADO: Encerrar fluxo
        updates.status = 'rejected';
        
        await base44.asServiceRole.entities.DriverApprovalFlowInstance.update(targetFlow.id, updates);
        
        if (driverId) {
            await base44.asServiceRole.entities.Driver.update(driverId, {
                corporate_approval_status: 'rejected'
            });
        } else if (invitationId) {
            await base44.asServiceRole.entities.EmployeeInvitation.update(invitationId, {
                pre_approval_status: 'rejected'
            });
        }

        // Notificar Admin
        // TODO: Enviar email para admin
        
    } else {
        // APROVADO: Verificar próximo passo
        const nextIndex = targetFlow.current_approver_index + 1;
        
        if (nextIndex < targetFlow.flow_config_used.approver_sequence.length) {
            // Próximo aprovador
            updates.current_approver_index = nextIndex;
            
            const nextApprover = targetFlow.flow_config_used.approver_sequence[nextIndex];
            const newToken = crypto.randomUUID();
            const nextLink = `${Deno.env.get('BASE_URL') || 'https://app.transferonline.com.br'}/AprovacaoMotorista?token=${newToken}`;
            
            updates.secure_links_sent = [...updatedLinks, {
                approver_email: nextApprover.email,
                token: newToken,
                sent_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }];

            await base44.asServiceRole.entities.DriverApprovalFlowInstance.update(targetFlow.id, updates);
            
            // --- INÍCIO LOGICA EMAIL PRÓXIMO APROVADOR (Resend) ---
            try {
                // Fetch context data for email
                const client = await base44.asServiceRole.entities.Client.get(targetFlow.client_id);
                
                let targetName = "Candidato";
                let supplierId = null;

                if (driverId) {
                    const driver = await base44.asServiceRole.entities.Driver.get(driverId);
                    targetName = driver?.name || targetName;
                    supplierId = driver?.supplier_id;
                } else if (invitationId) {
                    const invitation = await base44.asServiceRole.entities.EmployeeInvitation.get(invitationId);
                    targetName = invitation?.full_name || targetName;
                    supplierId = invitation?.supplier_id;
                }

                let supplierName = "Não informado";
                if (supplierId) {
                    const supplier = await base44.asServiceRole.entities.Supplier.get(supplierId);
                    if (supplier) supplierName = supplier.name;
                }

                const resendApiKey = Deno.env.get('RESEND_API_KEY');
                const resendFrom = Deno.env.get('RESEND_FROM') || 'TransferOnline <naoresponda@enviotransferonline.com.br>';

                if (resendApiKey) {
                    const resend = new Resend(resendApiKey);
                    await resend.emails.send({
                        from: resendFrom,
                        to: [nextApprover.email],
                        subject: `Aprovação de Motorista Pendente (Etapa ${nextIndex + 1}): ${targetName}`,
                        html: `
                            <p>Olá ${nextApprover.name},</p>
                            <p>A aprovação anterior foi realizada por <strong>${currentApprover.name}</strong>.</p>
                            <p>O processo requer sua continuidade.</p>
                            <p><strong>Motorista (Candidato):</strong> ${targetName}</p>
                            <p><strong>Fornecedor:</strong> ${supplierName}</p>
                            <p><strong>Cliente:</strong> ${client?.name || 'Cliente'}</p>
                            <p>Por favor, revise e aprove através do link abaixo:</p>
                            <p><a href="${nextLink}" style="padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Revisar Motorista</a></p>
                            <p>Se o botão não funcionar, use este link: ${nextLink}</p>
                        `
                    });
                    console.log(`[processDriverApproval] Email sent to next approver: ${nextApprover.email}`);
                } else {
                    console.warn('[processDriverApproval] RESEND_API_KEY missing, skipping email to next approver');
                }
            } catch (emailErr) {
                console.error('[processDriverApproval] Failed to send email to next approver:', emailErr);
                // Non-blocking error for the API response
            }
            // --- FIM LOGICA EMAIL ---

        } else {
            // FINALIZADO: Última aprovação
            updates.status = 'completed';
            
            await base44.asServiceRole.entities.DriverApprovalFlowInstance.update(targetFlow.id, updates);
            
            if (driverId) {
                await base44.asServiceRole.entities.Driver.update(driverId, {
                    corporate_approval_status: 'approved',
                    approval_status: 'approved', // Aprova no sistema geral também? Sim, faz sentido.
                    active: true
                });
            } else if (invitationId) {
                // Se for convite, marca como aprovado no pré-fluxo, mas NÃO envia convite ainda.
                // O status principal continua 'pendente' (ou outro) esperando o Admin dar o clique final.
                await base44.asServiceRole.entities.EmployeeInvitation.update(invitationId, {
                    pre_approval_status: 'approved'
                });
                
                // Notificar Admin que a pré-aprovação foi concluída e o convite pode ser enviado
                // TODO: Enviar email para Admin
            }

            // Notificar Admin e Motorista
            // TODO: Enviar emails finais
        }
    }

    return Response.json({ success: true, status: status });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});