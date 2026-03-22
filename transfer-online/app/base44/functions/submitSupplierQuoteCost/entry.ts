import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const requestBody = await req.json();
    const { quoteId, token, cost } = requestBody;

    console.log("submitSupplierQuoteCost chamado com:", { quoteId, token, cost });

    if (!quoteId || !token || !cost) {
      return Response.json(
        { success: false, error: 'Parâmetros obrigatórios: quoteId, token, cost' },
        { status: 400 }
      );
    }

    if (isNaN(cost) || cost <= 0) {
      return Response.json(
        { success: false, error: 'Valor do custo inválido' },
        { status: 400 }
      );
    }

    // Buscar cotação com service role
    const quotes = await base44.asServiceRole.entities.QuoteRequest.list();
    const quote = quotes.find(q => q.id === quoteId && q.supplier_response_token === token);

    if (!quote) {
      return Response.json(
        { success: false, error: 'Cotação não encontrada ou token inválido' },
        { status: 404 }
      );
    }

    // Verificar se já foi respondida
    if (quote.supplier_status === 'resposta_recebida') {
      return Response.json(
        { success: false, error: 'Esta cotação já foi respondida anteriormente' },
        { status: 400 }
      );
    }

    // Calcular preço final com margem
    const marginPercentage = quote.supplier_margin_percentage || 15;
    const finalPrice = cost * (1 + marginPercentage / 100);

    // Atualizar cotação
    await base44.asServiceRole.entities.QuoteRequest.update(quoteId, {
      supplier_cost: cost,
      supplier_status: 'resposta_recebida',
      supplier_response_at: new Date().toISOString(),
      admin_quote_price: finalPrice
    });

    // Notificar admin (opcional - via WhatsApp/Email)
    try {
      const configs = await base44.asServiceRole.entities.AppConfig.list();
      const adminWhatsAppConfig = configs.find(c => c.config_key === 'admin_whatsapp_number');
      
      if (adminWhatsAppConfig?.config_value) {
        const suppliers = await base44.asServiceRole.entities.Supplier.list();
        const supplierData = suppliers.find(p => p.id === quote.supplier_id);

        const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
        const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
        const evolutionInstanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');

        if (evolutionApiUrl && evolutionApiKey && evolutionInstanceName) {
          const adminPhone = adminWhatsAppConfig.config_value.replace(/\D/g, '');
          const formatPrice = (price) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

          const message = `✅ *FORNECEDOR RESPONDEU COTAÇÃO*\n\n` +
            `Cotação: *${quote.quote_number}*\n` +
            `Fornecedor: *${supplierData?.name || 'N/A'}*\n\n` +
            `💰 Custo informado: *${formatPrice(cost)}*\n` +
            `📊 Margem: ${marginPercentage}%\n` +
            `💵 Preço final calculado: *${formatPrice(finalPrice)}*\n\n` +
            `Acesse o painel para revisar e enviar ao cliente.`;

          await fetch(`${evolutionApiUrl}/message/sendText/${evolutionInstanceName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiKey
            },
            body: JSON.stringify({
              number: adminPhone,
              text: message
            })
          });
        }
      }
    } catch (notifError) {
      console.warn('Erro ao notificar admin (não crítico):', notifError);
    }

    return Response.json({ 
      success: true, 
      message: 'Custo registrado com sucesso',
      calculatedPrice: finalPrice
    });

  } catch (error) {
    console.error('Erro ao processar custo do fornecedor:', error);
    return Response.json(
      { success: false, error: error.message || 'Erro ao processar custo' },
      { status: 500 }
    );
  }
});