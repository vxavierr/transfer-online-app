import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const requestBody = await req.json();
    const { quoteId } = requestBody;

    if (!quoteId) return Response.json({ success: false, error: 'quoteId obrigatório' }, { status: 400 });

    const quotes = await base44.asServiceRole.entities.QuoteRequest.list();
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return Response.json({ success: false, error: 'Cotação não encontrada' }, { status: 404 });
    if (!quote.supplier_id) return Response.json({ success: false, error: 'Fornecedor não associado' }, { status: 400 });

    const suppliers = await base44.asServiceRole.entities.Supplier.list();
    const supplier = suppliers.find(p => p.id === quote.supplier_id);
    if (!supplier) return Response.json({ success: false, error: 'Fornecedor não encontrado' }, { status: 404 });

    const baseUrl = Deno.env.get('BASE_URL') || 'https://seu-dominio.com';

    let responseToken = quote.supplier_response_token;
    if (!responseToken) {
      responseToken = crypto.randomUUID();
      await base44.asServiceRole.entities.QuoteRequest.update(quoteId, {
        supplier_response_token: responseToken,
        supplier_request_sent_at: new Date().toISOString(),
        supplier_status: 'aguardando_resposta'
      });
    }

    const responseUrl = `${baseUrl}/SupplierQuoteResponse?quote=${quoteId}&token=${responseToken}`;
    const supplierPhone = supplier.phone_number || '';
    const serviceTypeLabel = quote.service_type === 'one_way' ? 'Só Ida' : quote.service_type === 'round_trip' ? 'Ida e Volta' : 'Por Hora';

    let message = `📋 *NOVA SOLICITAÇÃO DE COTAÇÃO*\n\nOlá, ${supplier.name}!\n\nCotação: *${quote.quote_number}*\nTipo: *${serviceTypeLabel}*\nVeículo: *${quote.vehicle_type_name}*\n\n📍 *Origem:* ${quote.origin}\n📍 *Destino:* ${quote.destination || quote.origin}\n📅 *Data:* ${new Date(quote.date).toLocaleDateString('pt-BR')}\n🕐 *Horário:* ${quote.time}\n`;
    if (quote.service_type === 'round_trip') message += `🔄 *Retorno:* ${new Date(quote.return_date).toLocaleDateString('pt-BR')} às ${quote.return_time}\n`;
    if (quote.service_type === 'hourly') message += `⏱️ *Horas:* ${quote.hours}h\n`;
    message += `\n👥 *Passageiros:* ${quote.passengers}\n`;
    if (quote.distance_km > 0) message += `📏 *Distância Total:* ${quote.distance_km} km\n`;
    if (quote.notes) message += `\n💬 *Observações:* ${quote.notes}\n`;
    message += `\n🔗 *Responda aqui:*\n${responseUrl}\n\n⚠️ Por favor, informe o custo desta viagem através do link acima.`;

    const whatsappResponse = await base44.asServiceRole.functions.invoke('sendWhatsAppMessage', {
      to: supplierPhone,
      message
    });
    const whatsappData = whatsappResponse?.data || whatsappResponse || {};

    if (whatsappData.success === false) {
      return Response.json({
        success: false,
        error: whatsappData.error || 'Erro ao enviar notificação',
        original_phone: whatsappData.original_phone || supplierPhone,
        normalized_phone: whatsappData.normalized_phone || null,
        e164_phone: whatsappData.e164_phone || null,
        provider_status: whatsappData.provider_status || null,
        provider_response: whatsappData.provider_response || null,
        attempt_count: whatsappData.attempt_count || null
      }, { status: whatsappData.provider_status || 500 });
    }

    return Response.json({
      success: true,
      message: 'Notificação enviada ao fornecedor com sucesso',
      original_phone: whatsappData.original_phone || supplierPhone,
      normalized_phone: whatsappData.normalized_phone || null,
      e164_phone: whatsappData.e164_phone || null,
      attempt_count: whatsappData.attempt_count || null
    });

  } catch (error) {
    console.error('Erro ao enviar notificação ao fornecedor:', error);
    return Response.json({
      success: false,
      error: error?.response?.data?.error || error.message || 'Erro ao enviar notificação',
      original_phone: error?.response?.data?.original_phone || null,
      normalized_phone: error?.response?.data?.normalized_phone || null,
      e164_phone: error?.response?.data?.e164_phone || null,
      provider_status: error?.response?.data?.provider_status || null,
      provider_response: error?.response?.data?.provider_response || null,
      attempt_count: error?.response?.data?.attempt_count || null
    }, { status: error?.response?.data?.provider_status || 500 });
  }
});