import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { Resend } from 'npm:resend';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { invoice_id, reviewer_email, supplier_name } = body;

    if (!invoice_id || !reviewer_email || !supplier_name) {
      return Response.json(
        { error: 'Dados obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Buscar dados da fatura
    const invoice = await base44.asServiceRole.entities.SupplierInvoice.filter({ id: invoice_id });
    
    if (invoice.length === 0) {
      return Response.json({ error: 'Fatura não encontrada' }, { status: 404 });
    }

    const invoiceData = invoice[0];
    
    // Criar URL de revisão
    const baseUrl = Deno.env.get('BASE_URL') || 'https://transfer-online-booking-f3f66b8f.base44.app';
    const reviewUrl = `${baseUrl}/RevisaoFaturaExterna?id=${invoice_id}&token=${invoiceData.external_review_token}`;

    // Formatar datas
    const periodStart = new Date(invoiceData.period_start).toLocaleDateString('pt-BR');
    const periodEnd = new Date(invoiceData.period_end).toLocaleDateString('pt-BR');
    const totalFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(invoiceData.total_amount);

    // Enviar e-mail
    const emailSubject = `[TransferOnline] Fatura ${invoiceData.invoice_number} - Aprovação Necessária`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">📄 Nova Fatura para Aprovação</h2>
        
        <p>Olá,</p>
        
        <p>Você recebeu uma nova fatura do fornecedor <strong>${supplier_name}</strong> para aprovação.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Número da Fatura:</strong> ${invoiceData.invoice_number}</p>
          <p style="margin: 5px 0;"><strong>Período:</strong> ${periodStart} a ${periodEnd}</p>
          <p style="margin: 5px 0;"><strong>Valor Total:</strong> ${totalFormatted}</p>
          <p style="margin: 5px 0;"><strong>Quantidade de Viagens:</strong> ${invoiceData.related_service_requests_ids.length}</p>
        </div>
        
        <p>Clique no botão abaixo para revisar e aprovar/rejeitar esta fatura:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${reviewUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Revisar Fatura
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          Este link é válido para aprovação única. Por favor, revise os detalhes cuidadosamente antes de aprovar.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #6b7280; font-size: 12px;">
          TransferOnline - Sistema de Gestão de Viagens Corporativas
        </p>
      </div>
    `;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        const fromAddress = Deno.env.get('RESEND_FROM') || 'TransferOnline <nao-responda@enviotransferonline.com.br>';
        
        await resend.emails.send({
            from: fromAddress,
            to: [reviewer_email],
            subject: emailSubject,
            html: emailBody
        });
        console.log(`[sendExternalInvoiceReviewEmail] E-mail enviado para ${reviewer_email} via Resend`);
    } else {
        await base44.asServiceRole.integrations.Core.SendEmail({
            to: reviewer_email,
            subject: emailSubject,
            body: emailBody
        });
        console.log(`[sendExternalInvoiceReviewEmail] E-mail enviado para ${reviewer_email} via Core`);
    }

    return Response.json({ 
      success: true,
      message: 'E-mail de revisão enviado com sucesso'
    });

  } catch (error) {
    console.error('[sendExternalInvoiceReviewEmail] Erro:', error);
    return Response.json(
      { error: error.message || 'Erro ao enviar e-mail de revisão' },
      { status: 500 }
    );
  }
});