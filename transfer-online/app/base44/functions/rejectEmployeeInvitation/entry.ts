import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invitationId, rejectionReason } = await req.json();
    if (!invitationId) {
      return Response.json({ error: 'Invitation ID required' }, { status: 400 });
    }

    // Use service role to manage invitation
    const invitation = await base44.asServiceRole.entities.EmployeeInvitation.get(invitationId);
    
    if (!invitation) {
      return Response.json({ error: 'Convite não encontrado' }, { status: 404 });
    }

    // Security Check
    let canReject = false;

    // 1. Super Admin
    if (user.role === 'admin') canReject = true;

    // 2. Client Admin
    if (invitation.requester_type === 'client') {
        if (user.client_id === invitation.client_id && user.client_role === 'admin') {
            canReject = true;
        }
    }

    // 3. Supplier Admin
    if (invitation.requester_type === 'supplier') {
        if (user.supplier_id === invitation.supplier_id) {
            canReject = true;
        }
    }

    if (!canReject) {
        return Response.json({ error: 'Você não tem permissão para rejeitar este convite.' }, { status: 403 });
    }

    // Reject
    await base44.asServiceRole.entities.EmployeeInvitation.update(invitation.id, {
        status: 'rejeitado',
        rejection_reason: rejectionReason || 'Rejeitado pelo administrador',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error rejecting invitation:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});