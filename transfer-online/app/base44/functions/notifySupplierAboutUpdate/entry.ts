import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { service_request_id } = await req.json();

    if (!service_request_id) {
      return Response.json({ error: 'service_request_id é obrigatório' }, { status: 400 });
    }

    const serviceRequest = await base44.asServiceRole.entities.ServiceRequest.get(service_request_id);
    
    if (!serviceRequest.chosen_supplier_id) {
      return Response.json({ success: true, message: 'Nenhum fornecedor associado' });
    }

    const supplier = await base44.asServiceRole.entities.Supplier.get(serviceRequest.chosen_supplier_id);

    const emailSubject = `⚠️ Atualização na Solicitação ${serviceRequest.request_number}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">⚠️ Solicitação Atualizada pelo Administrador</h2>
        
        <p>Olá <strong>${supplier.name}</strong>,</p>
        
        <p>A solicitação <strong>${serviceRequest.request_number}</strong> foi atualizada pelo administrador da plataforma.</p>
        
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #92400e;">Detalhes da Viagem:</h3>
          <ul style="margin: 10px 0;">
            <li><strong>Data:</strong> ${new Date(serviceRequest.date).toLocaleDateString('pt-BR')} às ${serviceRequest.time}</li>
            <li><strong>Origem:</strong> ${serviceRequest.origin}</li>
            <li><strong>Destino:</strong> ${serviceRequest.destination}</li>
            <li><strong>Passageiro:</strong> ${serviceRequest.passenger_name}</li>
            <li><strong>Passageiros:</strong> ${serviceRequest.passengers}</li>
          </ul>
        </div>
        
        <p style="margin-top: 20px;">
          <strong>Por favor, revise a solicitação atualizada em sua área de fornecedor e verifique se há impacto na operação.</strong>
        </p>
        
        <p style="margin-top: 20px;">
          <a href="${Deno.env.get('BASE_URL')}/MinhasSolicitacoesFornecedor?requestId=${serviceRequest.id}" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Ver Solicitação Atualizada
          </a>
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
        
        <p style="font-size: 12px; color: #6b7280;">
          TransferOnline - Sistema de Gestão de Transfers<br />
          Esta é uma notificação automática. Por favor, não responda este e-mail.
        </p>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: supplier.email,
      subject: emailSubject,
      body: emailBody
    });

    return Response.json({ 
      success: true,
      message: 'Fornecedor notificado sobre a atualização'
    });
  } catch (error) {
    console.error('Erro ao notificar fornecedor:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});