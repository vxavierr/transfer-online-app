import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invitationId } = await req.json();
    if (!invitationId) {
      return Response.json({ error: 'Invitation ID required' }, { status: 400 });
    }

    // Use service role for full access
    const invitation = await base44.asServiceRole.entities.EmployeeInvitation.get(invitationId);
    
    if (!invitation) {
      return Response.json({ error: 'Convite não encontrado' }, { status: 404 });
    }

    if (invitation.status === 'concluido') {
        // Se já foi concluído por este usuário, retorna sucesso (idempotência)
        if (invitation.invited_user_id === user.id) {
            return Response.json({ success: true, role: invitation.desired_role, alreadyAccepted: true });
        }
        return Response.json({ error: 'Este convite já foi utilizado por outro usuário.' }, { status: 400 });
    }

    if (invitation.status === 'cancelado' || invitation.status === 'rejeitado') {
        return Response.json({ error: 'Este convite não é mais válido.' }, { status: 400 });
    }

    // Permitir 'aprovado' ou 'convite_enviado'
    // 'pendente' não deve ser aceito ainda (precisa de aprovação do Master)
    if (invitation.status === 'pendente') {
         return Response.json({ error: 'Este convite ainda aguarda aprovação do administrador.' }, { status: 400 });
    }

    // --- Lógica para CLIENTES CORPORATIVOS ---
    if (invitation.requester_type === 'client') {
        const updateData = {
            client_id: invitation.client_id,
            client_role: invitation.desired_role === 'admin_client' ? 'admin' : 'user', // Mapeamento básico
            client_corporate_role: invitation.desired_role // Mantém o role específico (requester, approver, etc)
        };
        
        await base44.asServiceRole.entities.User.update(user.id, updateData);
    }

    // --- Lógica para FORNECEDORES ---
    else if (invitation.requester_type === 'supplier') {
        const updateData = {
            supplier_id: invitation.supplier_id
        };

        // Se for MOTORISTA
        if (invitation.desired_role === 'driver') {
            // Verificar se já existe Driver para este email
            const drivers = await base44.asServiceRole.entities.Driver.filter({
                supplier_id: invitation.supplier_id,
                email: user.email
            });

            let driverId = null;

            if (drivers.length > 0) {
                // Atualiza driver existente
                const driver = drivers[0];
                driverId = driver.id;
                
                // Se o convite tem um fluxo corporativo pendente, inicia o fluxo
                if (invitation.corporate_flow_client_id) {
                    await base44.asServiceRole.functions.invoke('initiateCorporateDriverApproval', {
                        driverId: driverId,
                        clientId: invitation.corporate_flow_client_id
                    });
                    
                    await base44.asServiceRole.entities.Driver.update(driver.id, {
                        active: true,
                        approval_status: 'pending' // Mantém pendente até o fluxo completar
                    });
                } else {
                    await base44.asServiceRole.entities.Driver.update(driver.id, {
                        active: true,
                        approval_status: 'approved' // Re-aprova se estiver pendente
                    });
                }
            } else {
                // Cria novo driver
                const driverData = {
                    supplier_id: invitation.supplier_id,
                    name: invitation.full_name || user.full_name,
                    email: user.email,
                    phone_number: invitation.phone_number || user.phone_number,
                    approval_status: 'approved', // Padrão
                    active: true,
                    terms_version: null // Força aceite dos termos
                };

                // Se houver fluxo corporativo definido no convite
                if (invitation.corporate_flow_client_id) {
                    driverData.approval_status = 'pending';
                    // corporate_approval_status será setado pela função initiateCorporateDriverApproval
                }

                const newDriver = await base44.asServiceRole.entities.Driver.create(driverData);
                driverId = newDriver.id;

                if (invitation.corporate_flow_client_id) {
                    await base44.asServiceRole.functions.invoke('initiateCorporateDriverApproval', {
                        driverId: driverId,
                        clientId: invitation.corporate_flow_client_id
                    });
                }
            }

            updateData.is_driver = true;
            updateData.driver_id = driverId;
        } else {
            // Outros cargos de fornecedor (manager, dispatcher)
            // Aqui poderíamos setar um supplier_role se existisse no schema
            // Por enquanto, a presença de supplier_id já dá acesso ao painel de fornecedor
            // Podemos usar o campo 'role' do user se for admin do fornecedor? 
            // Cuidado para não dar acesso admin geral.
            // Vamos assumir que o sistema usa supplier_id para identificar acesso.
        }

        await base44.asServiceRole.entities.User.update(user.id, updateData);
    }

    // Marcar convite como concluído e vincular ao usuário
    await base44.asServiceRole.entities.EmployeeInvitation.update(invitation.id, {
        status: 'concluido',
        invited_user_id: user.id
    });

    // Atualizar FrequentRequesters/FrequentPassengers, se houver
    const frequentRequesters = await base44.asServiceRole.entities.FrequentRequester.filter({
        email: user.email
    });
    for (const freqReq of frequentRequesters) {
        await base44.asServiceRole.entities.FrequentRequester.update(freqReq.id, {
            linked_to_user: true
        });
    }

    const frequentPassengers = await base44.asServiceRole.entities.FrequentPassenger.filter({
        email: user.email
    });
    for (const freqPass of frequentPassengers) {
        await base44.asServiceRole.entities.FrequentPassenger.update(freqPass.id, {
            linked_to_user: true
        });
    }

    return Response.json({ success: true, role: invitation.desired_role });

  } catch (error) {
    console.error('Error processing invitation:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});