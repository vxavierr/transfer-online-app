import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { clientId, auditorName, auditorEmail, expiresInHours = 72 } = await req.json();

    if (!clientId) {
      return Response.json({ error: 'clientId is required' }, { status: 400 });
    }

    const client = await base44.asServiceRole.entities.Client.get(clientId);
    if (!client) {
      return Response.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000).toISOString();
    const supplierIds = Array.isArray(client.associated_supplier_ids) ? client.associated_supplier_ids : [];

    const accessLink = await base44.asServiceRole.entities.ClientAuditAccessLink.create({
      client_id: client.id,
      client_name: client.name,
      token,
      auditor_name: auditorName || '',
      auditor_email: auditorEmail || '',
      supplier_ids: supplierIds,
      allowed_sections: ['suppliers', 'drivers', 'vehicles', 'documents', 'approval_history', 'comments'],
      expires_at: expiresAt,
      status: 'active'
    });

    const baseUrl = (Deno.env.get('BASE_URL') || `https://${req.headers.get('host')}`).replace(/\/$/, '');
    const accessUrl = `${baseUrl}/ClientAuditAccess?token=${token}`;

    if (auditorEmail) {
      await base44.integrations.Core.SendEmail({
        to: auditorEmail,
        subject: `Acesso temporário de auditoria - ${client.name}`,
        body: `<p>Olá ${auditorName || ''},</p><p>Seu acesso temporário para auditoria dos fornecedores associados ao cliente <strong>${client.name}</strong> foi liberado.</p><p><a href="${accessUrl}">Clique aqui para acessar</a></p><p>Validade até: ${new Date(expiresAt).toLocaleString('pt-BR')}</p>`
      });
    }

    return Response.json({
      success: true,
      accessLinkId: accessLink.id,
      accessUrl,
      expiresAt
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});