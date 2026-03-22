import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'token is required' }, { status: 400 });
    }

    const links = await base44.asServiceRole.entities.ClientAuditAccessLink.filter({ token }, undefined, 1);
    const accessLink = links[0];

    if (!accessLink) {
      return Response.json({ error: 'Link inválido' }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(accessLink.expires_at);

    if (accessLink.status === 'revoked') {
      return Response.json({ error: 'Link revogado' }, { status: 403 });
    }

    if (expiresAt < now || accessLink.status === 'expired') {
      if (accessLink.status !== 'expired') {
        await base44.asServiceRole.entities.ClientAuditAccessLink.update(accessLink.id, { status: 'expired' });
      }
      return Response.json({ error: 'Link expirado' }, { status: 403 });
    }

    const client = await base44.asServiceRole.entities.Client.get(accessLink.client_id);
    if (!client) {
      return Response.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const supplierIds = Array.isArray(accessLink.supplier_ids) && accessLink.supplier_ids.length > 0
      ? accessLink.supplier_ids
      : (Array.isArray(client.associated_supplier_ids) ? client.associated_supplier_ids : []);

    const allSuppliers = supplierIds.length
      ? await Promise.all(supplierIds.map((supplierId) => base44.asServiceRole.entities.Supplier.get(supplierId).catch(() => null)))
      : [];
    const suppliers = allSuppliers.filter(Boolean);

    const [supplierDriversNested, supplierFleetVehiclesNested] = await Promise.all([
      Promise.all(
        suppliers.map((supplier) => base44.asServiceRole.entities.Driver.filter({ supplier_id: supplier.id }))
      ),
      Promise.all(
        suppliers.map((supplier) => base44.asServiceRole.entities.SupplierFleetVehicle.filter({ supplier_id: supplier.id }))
      )
    ]);
    const drivers = supplierDriversNested.flat();
    const supplierFleetVehicles = supplierFleetVehiclesNested.flat();

    const approvalFlowIds = drivers
      .map((driver) => driver.corporate_approval_flow_id)
      .filter(Boolean);

    const approvalFlows = approvalFlowIds.length
      ? (await Promise.all(approvalFlowIds.map((flowId) => base44.asServiceRole.entities.DriverApprovalFlowInstance.get(flowId).catch(() => null)))).filter(Boolean)
      : [];

    const comments = await base44.asServiceRole.entities.SupplierAuditComment.filter({ client_id: client.id }, '-created_date', 200);

    const supplierData = suppliers.map((supplier) => {
      const supplierDrivers = drivers.filter((driver) => driver.supplier_id === supplier.id);
      const supplierVehicles = supplierFleetVehicles.filter((vehicle) => vehicle.supplier_id === supplier.id);

      return {
        ...supplier,
        drivers: supplierDrivers.map((driver) => ({
          ...driver,
          approval_flow: approvalFlows.find((flow) => flow.id === driver.corporate_approval_flow_id) || null,
          comments: comments.filter((comment) => comment.supplier_id === supplier.id && comment.driver_id === driver.id)
        })),
        supplier_vehicles: supplierVehicles,
        comments: comments.filter((comment) => comment.supplier_id === supplier.id)
      };
    });

    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const accessIp = forwardedFor.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || '';

    await base44.asServiceRole.entities.ClientAuditAccessLink.update(accessLink.id, {
      last_accessed_at: new Date().toISOString(),
      last_access_ip: accessIp
    });

    return Response.json({
      success: true,
      access_link: {
        id: accessLink.id,
        client_name: accessLink.client_name,
        auditor_name: accessLink.auditor_name,
        auditor_email: accessLink.auditor_email,
        expires_at: accessLink.expires_at,
        allowed_sections: accessLink.allowed_sections || []
      },
      client: {
        id: client.id,
        name: client.name,
        document_id: client.document_id,
        contact_person_name: client.contact_person_name,
        contact_person_email: client.contact_person_email,
        contact_person_phone: client.contact_person_phone
      },
      suppliers: supplierData
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});