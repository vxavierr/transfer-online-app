import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { Resend } from 'npm:resend';

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

    // Use service role to manage invitation
    const invitation = await base44.asServiceRole.entities.EmployeeInvitation.get(invitationId);
    
    if (!invitation) {
      return Response.json({ error: 'Convite não encontrado' }, { status: 404 });
    }

    // Security Check: Ensure user has permission to approve this invitation
    let canApprove = false;

    // 1. Super Admin
    if (user.role === 'admin') canApprove = true;

    // 2. Client Admin
    if (invitation.requester_type === 'client') {
        if (user.client_id === invitation.client_id && user.client_role === 'admin') {
            canApprove = true;
        }
    }

    // 3. Supplier Admin
    if (invitation.requester_type === 'supplier') {
        if (user.supplier_id === invitation.supplier_id && (user.role === 'admin' || user.supplier_role === 'admin' || user.supplier_employee_role === 'manager')) {
            // Note: supplier_role checking might vary depending on schema implementation
            // Assuming simplified check: user linked to same supplier
            canApprove = true;
        }
    }

    if (!canApprove) {
        return Response.json({ error: 'Você não tem permissão para aprovar este convite.' }, { status: 403 });
    }

    // Approve and Send Email
    const baseUrl = Deno.env.get("BASE_URL") || "https://transferonline.base44.app"; // Fallback if secret missing
    const inviteLink = `${baseUrl}/AceitarConvite?id=${invitation.id}`;

    // Update Status
    await base44.asServiceRole.entities.EmployeeInvitation.update(invitation.id, {
        status: 'convite_enviado',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
    });

    // Send Email
    const emailSubject = `Convite para juntar-se à equipe - TransferOnline`;
    const emailBody = `
            Olá ${invitation.full_name},
            
            Você foi convidado para se juntar à equipe no TransferOnline.
            
            Para aceitar o convite e criar sua conta, clique no link abaixo:
            
            ${inviteLink}
            
            Atenciosamente,
            Equipe TransferOnline
        `;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        const fromAddress = Deno.env.get('RESEND_FROM') || 'TransferOnline <nao-responda@enviotransferonline.com.br>';
        
        await resend.emails.send({
            from: fromAddress,
            to: [invitation.email],
            subject: emailSubject,
            text: emailBody // Using text as the body provided was plain text
        });
    } else {
        await base44.asServiceRole.integrations.Core.SendEmail({
            to: invitation.email,
            subject: emailSubject,
            body: emailBody
        });
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error approving invitation:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});