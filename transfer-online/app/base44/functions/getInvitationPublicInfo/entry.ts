import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { invitationId } = await req.json();

    if (!invitationId) {
      return Response.json({ error: 'ID do convite é obrigatório' }, { status: 400 });
    }

    // Usar service role para buscar o convite (pois o usuário pode não estar logado)
    const invitation = await base44.asServiceRole.entities.EmployeeInvitation.get(invitationId);

    if (!invitation) {
      return Response.json({ error: 'Convite não encontrado' }, { status: 404 });
    }

    if (invitation.status === 'concluido' || invitation.status === 'cancelado') {
      return Response.json({ 
        success: false, 
        error: 'Este convite já foi utilizado ou cancelado.' 
      });
    }

    // Retornar apenas informações públicas seguras
    return Response.json({
      success: true,
      invitation: {
        role_type: invitation.role_type,
        desired_role: invitation.desired_role,
        full_name: invitation.full_name,
        requester_type: invitation.requester_type,
        // Buscar nome da empresa seria ideal, mas requer outra query. 
        // Por enquanto, vamos retornar o que temos.
        supplier_id: invitation.supplier_id,
        client_id: invitation.client_id
      }
    });

  } catch (error) {
    console.error('Error fetching invitation:', error);
    return Response.json({ error: 'Erro ao buscar informações do convite' }, { status: 500 });
  }
});