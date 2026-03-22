import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, supplierId, driverId, driverVehicleId, authorName, authorEmail, category = 'comment', message } = await req.json();

    if (!token || !supplierId || !authorName || !message) {
      return Response.json({ error: 'token, supplierId, authorName e message são obrigatórios' }, { status: 400 });
    }

    const links = await base44.asServiceRole.entities.ClientAuditAccessLink.filter({ token }, undefined, 1);
    const accessLink = links[0];

    if (!accessLink) {
      return Response.json({ error: 'Link inválido' }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(accessLink.expires_at);
    if (accessLink.status !== 'active' || expiresAt < now) {
      return Response.json({ error: 'Link expirado ou inativo' }, { status: 403 });
    }

    const supplier = await base44.asServiceRole.entities.Supplier.get(supplierId);
    if (!supplier) {
      return Response.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
    }

    const comment = await base44.asServiceRole.entities.SupplierAuditComment.create({
      access_link_id: accessLink.id,
      client_id: accessLink.client_id,
      supplier_id: supplier.id,
      driver_id: driverId || '',
      driver_vehicle_id: driverVehicleId || '',
      author_name: authorName,
      author_email: authorEmail || '',
      category,
      message,
      status: 'sent',
      notified_supplier_email: supplier.email || ''
    });

    if (supplier.email) {
      await base44.integrations.Core.SendEmail({
        to: supplier.email,
        subject: `Nova interação de auditoria - ${accessLink.client_name}`,
        body: `<p>Olá ${supplier.contact_name || supplier.name},</p><p>Você recebeu uma nova ${category === 'request' ? 'solicitação' : 'mensagem'} relacionada à auditoria do cliente <strong>${accessLink.client_name}</strong>.</p><p><strong>Remetente:</strong> ${authorName}${authorEmail ? ` (${authorEmail})` : ''}</p><p><strong>Mensagem:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>`
      });
    }

    return Response.json({ success: true, commentId: comment.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});