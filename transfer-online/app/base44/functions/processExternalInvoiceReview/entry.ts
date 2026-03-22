import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const { invoice_id, token, approved, comments } = body;

    if (!invoice_id || !token || typeof approved !== 'boolean') {
      return Response.json(
        { error: 'Dados obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Buscar fatura
    const invoices = await base44.asServiceRole.entities.SupplierInvoice.filter({ id: invoice_id });
    
    if (invoices.length === 0) {
      return Response.json({ error: 'Fatura não encontrada' }, { status: 404 });
    }

    const invoice = invoices[0];

    // Validar token
    if (invoice.external_review_token !== token) {
      return Response.json(
        { error: 'Token de acesso inválido' },
        { status: 403 }
      );
    }

    // Verificar se já foi revisada
    if (invoice.external_review_status !== 'pendente') {
      return Response.json(
        { error: 'Esta fatura já foi revisada anteriormente' },
        { status: 400 }
      );
    }

    // Se rejeitando, comentários são obrigatórios
    if (!approved && (!comments || !comments.trim())) {
      return Response.json(
        { error: 'Comentários são obrigatórios ao rejeitar uma fatura' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newStatus = approved ? 'aprovada' : 'rejeitada';

    // Atualizar fatura
    await base44.asServiceRole.entities.SupplierInvoice.update(invoice_id, {
      status: newStatus,
      external_review_status: approved ? 'aprovado' : 'rejeitado',
      external_review_notes: comments || null,
      external_review_date: now
    });

    // Atualizar ServiceRequests relacionadas
    const allServiceRequests = await base44.asServiceRole.entities.ServiceRequest.list();
    const relatedRequests = allServiceRequests.filter(sr => 
      invoice.related_service_requests_ids.includes(sr.id)
    );

    for (const sr of relatedRequests) {
      await base44.asServiceRole.entities.ServiceRequest.update(sr.id, {
        supplier_billing_status: approved ? 'aprovada_externamente' : 'rejeitada_externamente'
      });
    }

    // Buscar informações do fornecedor para notificação
    const suppliers = await base44.asServiceRole.entities.Supplier.list();
    const supplier = suppliers.find(s => s.id === invoice.supplier_id);

    if (supplier && supplier.email) {
      // Enviar e-mail ao fornecedor
      const emailSubject = approved 
        ? `[TransferOnline] Fatura ${invoice.invoice_number} - Aprovada ✅`
        : `[TransferOnline] Fatura ${invoice.invoice_number} - Rejeitada ❌`;

      const totalFormatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(invoice.total_amount);

      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: ${approved ? '#10b981' : '#ef4444'};">
            ${approved ? '✅ Fatura Aprovada' : '❌ Fatura Rejeitada'}
          </h2>
          
          <p>Olá, ${supplier.name}</p>
          
          <p>Sua fatura foi <strong>${approved ? 'aprovada' : 'rejeitada'}</strong> pelo responsável.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Número da Fatura:</strong> ${invoice.invoice_number}</p>
            <p style="margin: 5px 0;"><strong>Valor Total:</strong> ${totalFormatted}</p>
            <p style="margin: 5px 0;"><strong>Quantidade de Viagens:</strong> ${invoice.related_service_requests_ids.length}</p>
          </div>
          
          ${comments ? `
            <div style="background-color: ${approved ? '#d1fae5' : '#fee2e2'}; border-left: 4px solid ${approved ? '#10b981' : '#ef4444'}; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Comentários do Revisor:</strong></p>
              <p style="margin: 0; color: #374151;">${comments}</p>
            </div>
          ` : ''}
          
          ${approved ? `
            <p style="color: #059669;">
              <strong>Próximos Passos:</strong><br>
              Você pode agora emitir a fatura final através do painel de faturamento.
            </p>
          ` : `
            <p style="color: #dc2626;">
              <strong>O que fazer agora:</strong><br>
              Revise os comentários acima, faça os ajustes necessários e submeta novamente a fatura.
            </p>
          `}
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 12px;">
            TransferOnline - Sistema de Gestão de Viagens Corporativas
          </p>
        </div>
      `;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: supplier.email,
          subject: emailSubject,
          body: emailBody
        });

        console.log(`[processExternalInvoiceReview] E-mail enviado para ${supplier.email}`);
      } catch (emailError) {
        console.error('[processExternalInvoiceReview] Erro ao enviar e-mail (não crítico):', emailError);
      }
    }

    console.log(`[processExternalInvoiceReview] Fatura ${invoice.invoice_number} ${approved ? 'aprovada' : 'rejeitada'}`);

    return Response.json({ 
      success: true,
      approved,
      message: approved 
        ? 'Fatura aprovada com sucesso. O fornecedor foi notificado.'
        : 'Fatura rejeitada. O fornecedor foi notificado com seus comentários.'
    });

  } catch (error) {
    console.error('[processExternalInvoiceReview] Erro:', error);
    return Response.json(
      { error: error.message || 'Erro ao processar revisão da fatura' },
      { status: 500 }
    );
  }
});