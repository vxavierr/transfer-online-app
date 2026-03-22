import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { quoteId, token, action } = await req.json();

    if (!quoteId || !token || !['accept', 'decline'].includes(action)) {
      return Response.json({ success: false, error: 'Parâmetros inválidos' }, { status: 200 });
    }

    // Buscar cotação com service role para garantir acesso
    const quote = await base44.asServiceRole.entities.QuoteRequest.get(quoteId);

    if (!quote) {
      return Response.json({ success: false, error: 'Cotação não encontrada' }, { status: 200 });
    }

    // Validar token
    if (quote.public_token !== token) {
      return Response.json({ success: false, error: 'Token inválido' }, { status: 200 });
    }

    // Validar se já não foi respondida
    if (['aceito', 'recusado', 'convertido', 'cancelado'].includes(quote.status)) {
      return Response.json({ success: false, error: 'Esta cotação já foi processada.' }, { status: 200 });
    }

    const newStatus = action === 'accept' ? 'aceito' : 'recusado';
    const responseDate = new Date().toISOString();

    // Atualizar cotação
    await base44.asServiceRole.entities.QuoteRequest.update(quoteId, {
      status: newStatus,
      client_responded_at: responseDate
    });

    // Tentar buscar o fornecedor para notificar
    let supplierEmail = null;
    let supplierName = 'Administrador';
    let supplierPhone = null;

    if (quote.supplier_id) {
      try {
        const supplier = await base44.asServiceRole.entities.Supplier.get(quote.supplier_id);
        if (supplier) {
          supplierEmail = supplier.email;
          supplierName = supplier.name;
          supplierPhone = supplier.phone_number;
        }
      } catch (e) {
        console.error('Erro ao buscar fornecedor:', e);
      }
    }

    // Se não tiver email de fornecedor, usar um email de admin padrão (ex: do sistema)
    // Como fallback, vou tentar pegar o email do admin via secrets ou hardcoded se não houver opção melhor
    // Para este caso, vou enviar para o email do fornecedor se existir, ou logar que não foi possível.
    // Vou assumir que o admin do sistema também deve receber se não houver fornecedor.
    
    const recipientEmail = supplierEmail || 'fernandotransferonline@gmail.com'; // Fallback seguro baseado no Layout.js

    const actionLabel = action === 'accept' ? 'ACEITA' : 'RECUSADA';
    const color = action === 'accept' ? '#16a34a' : '#dc2626';

    // Enviar email (com tratamento de erro para não falhar a requisição se o email falhar)
    try {
      await base44.integrations.Core.SendEmail({
        to: recipientEmail,
        subject: `[TransferOnline] Cotação ${quote.quote_number} foi ${actionLabel} pelo cliente`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${color};">Cotação ${actionLabel}</h2>
            <p>Olá, ${supplierName}.</p>
            <p>O cliente respondeu à cotação <strong>${quote.quote_number}</strong>.</p>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Cliente:</strong> ${quote.customer_name}</p>
              <p><strong>Data da Viagem:</strong> ${new Date(quote.date).toLocaleDateString('pt-BR')} às ${quote.time}</p>
              <p><strong>Origem:</strong> ${quote.origin}</p>
              <p><strong>Destino:</strong> ${quote.destination}</p>
              <p><strong>Valor Cotado:</strong> R$ ${quote.admin_quote_price?.toFixed(2)}</p>
              <p><strong>Status Atual:</strong> <span style="color: ${color}; font-weight: bold;">${actionLabel}</span></p>
              <p><strong>Data da Resposta:</strong> ${new Date(responseDate).toLocaleString('pt-BR')}</p>
            </div>

            <p>Acesse o painel para mais detalhes.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Erro ao enviar email de notificação (ignorado para sucesso da operação):', emailError);
    }

    // Enviar WhatsApp para o fornecedor (Evolution API)
    try {
      const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
      const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
      const evolutionInstance = Deno.env.get('EVOLUTION_INSTANCE_NAME');
      
      console.log(`[updateQuoteResponse] Iniciando envio de WhatsApp para Cotação ${quote.quote_number}`);
      console.log(`[updateQuoteResponse] Fornecedor: ${supplierName}, Telefone Original: ${supplierPhone}`);

      if (evolutionUrl && evolutionKey && evolutionInstance && supplierPhone) {
        const number = supplierPhone.replace(/\D/g, '');
        console.log(`[updateQuoteResponse] Telefone Formatado: ${number}`);
        
        const statusIcon = action === 'accept' ? '✅' : '❌';
        
        const whatsappMessage = `🤖 *TransferOnline - Atualização de Cotação*

Olá, *${supplierName}*!

O cliente respondeu à cotação *${quote.quote_number}*.

👤 *Cliente:* ${quote.customer_name}
📅 *Data:* ${new Date(quote.date).toLocaleDateString('pt-BR')} às ${quote.time}
📍 *Origem:* ${quote.origin}
🏁 *Destino:* ${quote.destination}
💰 *Valor:* R$ ${quote.admin_quote_price?.toFixed(2)}

📢 *Status Atual:* *${actionLabel}* ${statusIcon}

Acesse o painel para mais detalhes.`;

        console.log(`[updateQuoteResponse] Enviando requisição para Evolution API: ${evolutionUrl}/message/sendText/${evolutionInstance}`);

        const response = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionKey
          },
          body: JSON.stringify({
            number: number,
            text: whatsappMessage
          })
        });

        const responseBody = await response.text();
        console.log(`[updateQuoteResponse] Resposta Evolution API: Status ${response.status}, Body: ${responseBody}`);

        if (!response.ok) {
             console.error(`[updateQuoteResponse] Falha na requisição Evolution API: ${response.status} ${response.statusText}`);
        }

      } else {
          console.warn('[updateQuoteResponse] Não foi possível enviar WhatsApp. Verifique configurações e telefone.');
          console.log('Debug Configs:', {
              hasUrl: !!evolutionUrl,
              hasKey: !!evolutionKey,
              hasInstance: !!evolutionInstance,
              hasPhone: !!supplierPhone
          });
      }
    } catch (waError) {
      console.error('[updateQuoteResponse] Erro CRÍTICO ao enviar WhatsApp:', waError);
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('Erro ao atualizar resposta da cotação:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});