import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const requestBody = await req.json();
    const { quoteRequestId, recipientType, notificationType } = requestBody;

    if (!quoteRequestId || !recipientType || !notificationType) {
      return Response.json(
        { success: false, error: 'Parâmetros obrigatórios: quoteRequestId, recipientType, notificationType' },
        { status: 400 }
      );
    }

    const quoteRequests = await base44.asServiceRole.entities.QuoteRequest.list();
    const quoteData = quoteRequests.find(q => q.id === quoteRequestId);

    if (!quoteData) {
      return Response.json({ success: false, error: 'Cotação não encontrada' }, { status: 404 });
    }

    // Obter credenciais da Z-API
    const apiUrl = Deno.env.get('EVOLUTION_API_URL');
    const token = Deno.env.get('EVOLUTION_API_KEY');
    const instanceId = Deno.env.get('EVOLUTION_INSTANCE_NAME');
    const clientToken = Deno.env.get('EVOLUTION_CLIENT_TOKEN');

    if (!apiUrl || !token || !instanceId) {
      return Response.json(
        { success: false, error: 'Configuração do WhatsApp incompleta' },
        { status: 500 }
      );
    }

    let phoneNumber = '';
    
    if (recipientType === 'admin') {
      const configs = await base44.asServiceRole.entities.AppConfig.list();
      const adminWhatsAppConfig = configs.find(c => c.config_key === 'admin_whatsapp_number');
      if (!adminWhatsAppConfig || !adminWhatsAppConfig.config_value) {
        return Response.json({ success: false, error: 'WhatsApp do administrador não configurado' });
      }
      phoneNumber = adminWhatsAppConfig.config_value.replace(/\D/g, '');
    } else if (recipientType === 'customer') {
      if (!quoteData.customer_phone) {
        return Response.json({ success: false, error: 'Telefone do cliente não encontrado' }, { status: 400 });
      }
      phoneNumber = quoteData.customer_phone.replace(/\D/g, '');
    } else {
      return Response.json({ success: false, error: 'Tipo de destinatário inválido' }, { status: 400 });
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      return Response.json({ success: false, error: 'Telefone inválido' }, { status: 400 });
    }
    if (phoneNumber.length <= 11 && !phoneNumber.startsWith('55')) {
        phoneNumber = '55' + phoneNumber;
    }

    const formatPrice = (price) => {
      if (!price || isNaN(price)) return 'R$ 0,00';
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
    };

    const formatDate = (dateString) => {
      if (!dateString) return 'Data não informada';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      } catch (e) { return dateString; }
    };

    let message = '';
    const tripType = quoteData.service_type === 'one_way' ? 'Só Ida' : quoteData.service_type === 'round_trip' ? 'Ida e Volta' : 'Por Hora';

    // (Message construction logic omitted for brevity, keeping existing logic)
    if (recipientType === 'customer' && notificationType === 'new_request') {
      message = `✅ *SOLICITAÇÃO DE COTAÇÃO RECEBIDA*\n\nOlá *${quoteData.customer_name}*!\n\nRecebemos sua solicitação de cotação e nossa equipe já está analisando os detalhes da sua viagem.\n\n━━━━━━━━━━━━━━━━━━━\n📋 *Cotação:* ${quoteData.quote_number || 'N/A'}\n━━━━━━━━━━━━━━━━━━━\n\n📍 *DETALHES DA VIAGEM*\n• Tipo: ${tripType}\n• Veículo: ${quoteData.vehicle_type_name}\n• Origem: ${quoteData.origin || '-'}\n• Destino: ${quoteData.destination || '-'}\n• Data: ${formatDate(quoteData.date)}\n• Horário: ${quoteData.time || '-'}\n`;
      if (quoteData.service_type === 'round_trip' && quoteData.return_date) message += `• Retorno: ${formatDate(quoteData.return_date)} às ${quoteData.return_time}\n`;
      if (quoteData.service_type === 'hourly' && quoteData.hours) message += `• Duração: ${quoteData.hours} horas\n`;
      message += `• Passageiros: ${quoteData.passengers || 1}\n\n⏱️ *EM BREVE:*\nVocê receberá um WhatsApp e e-mail com a cotação detalhada e o link para pagamento, caso deseje confirmar a reserva.\n\n`;
      if (quoteData.notes) message += `📝 *Suas Observações:*\n${quoteData.notes}\n\n`;
      message += `Obrigado por escolher a TransferOnline! 🚗`;
    } else if (recipientType === 'customer' && notificationType === 'quote_ready') {
      if (!quoteData.admin_quote_price || !quoteData.payment_link_url) {
        return Response.json({ success: false, error: 'Cotação sem preço ou link' }, { status: 400 });
      }
      message = `✅ *SUA COTAÇÃO ESTÁ PRONTA!*\n\nOlá *${quoteData.customer_name}*!\n\nTemos o prazer de informar que sua cotação foi processada.\n\n━━━━━━━━━━━━━━━━━━━\n📋 *Cotação:* ${quoteData.quote_number || 'N/A'}\n━━━━━━━━━━━━━━━━━━━\n\n💰 *VALOR DA COTAÇÃO*\n🟢 *${formatPrice(quoteData.admin_quote_price)}*\n\n📍 *RESUMO DA VIAGEM*\n• Tipo: ${tripType}\n• Veículo: ${quoteData.vehicle_type_name}\n• Origem: ${quoteData.origin || '-'}\n• Destino: ${quoteData.destination || '-'}\n• Data: ${formatDate(quoteData.date)} às ${quoteData.time}\n`;
      if (quoteData.service_type === 'round_trip' && quoteData.return_date) message += `• Retorno: ${formatDate(quoteData.return_date)} às ${quoteData.return_time}\n`;
      if (quoteData.service_type === 'hourly' && quoteData.hours) message += `• Duração: ${quoteData.hours} horas\n`;
      message += `\n`;
      if (quoteData.admin_notes) message += `📝 *Observações:*\n${quoteData.admin_notes}\n\n`;
      message += `💳 *LINK DE PAGAMENTO:*\n${quoteData.payment_link_url}\n\nPara confirmar sua reserva, clique no link acima e finalize o pagamento.\n\nQualquer dúvida, estamos à disposição! 🚗✈️`;
    } else if (recipientType === 'admin' && notificationType === 'new_request') {
      message = `🔔 *NOVA SOLICITAÇÃO DE COTAÇÃO*\n\nUma nova solicitação de cotação foi recebida e aguarda sua análise.\n\n━━━━━━━━━━━━━━━━━━━\n📋 *Cotação:* ${quoteData.quote_number || 'N/A'}\n━━━━━━━━━━━━━━━━━━━\n\n⚠️ *AÇÃO NECESSÁRIA:* Analisar e cotar preço\n\n👤 *CLIENTE*\n• Nome: ${quoteData.customer_name || '-'}\n• Email: ${quoteData.customer_email || '-'}\n• Telefone: ${quoteData.customer_phone || '-'}\n• Passageiros: ${quoteData.passengers || 1}\n\n📍 *DETALHES DA VIAGEM*\n• Tipo: ${tripType}\n• Veículo: ${quoteData.vehicle_type_name}\n• Idioma Motorista: ${quoteData.driver_language === 'pt' ? 'Português' : quoteData.driver_language === 'en' ? 'English' : 'Español'}\n• Origem: ${quoteData.origin || '-'}\n• Destino: ${quoteData.destination || '-'}\n• Data: ${formatDate(quoteData.date)} às ${quoteData.time}\n`;
      if (quoteData.service_type === 'round_trip' && quoteData.return_date) message += `• Retorno: ${formatDate(quoteData.return_date)} às ${quoteData.return_time}\n`;
      if (quoteData.service_type === 'hourly' && quoteData.hours) message += `• Duração: ${quoteData.hours} horas\n`;
      if (quoteData.distance_km > 0) message += `• Distância Total: ${quoteData.distance_km} km\n`;
      message += `\n`;
      if (quoteData.notes) message += `📝 *Observações do Cliente:*\n${quoteData.notes}\n\n`;
      if (quoteData.reason) message += `⚠️ *Motivo da Cotação:*\n${quoteData.reason}\n\n`;
      message += `Acesse o painel administrativo para responder a esta cotação.`;
    } else {
      return Response.json({ success: false, error: 'Combinação inválida' }, { status: 400 });
    }

    console.log("Enviando WhatsApp para:", phoneNumber);
    
    // Robust URL construction
    let baseUrl = apiUrl.trim();
    while(baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    
    try {
        const urlObj = new URL(baseUrl);
        baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    } catch (e) {
        console.warn("Invalid API URL format", e);
    }
    const zApiUrl = `${baseUrl}/instances/${instanceId}/token/${token}/send-text`;
    
    const headers = { 'Content-Type': 'application/json' };
    if (clientToken) headers['Client-Token'] = clientToken;

    const evolutionResponse = await fetch(zApiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ phone: phoneNumber, message: message })
    });

    const responseText = await evolutionResponse.text();
    if (!evolutionResponse.ok) {
        let errorDetail = responseText;
        try {
            const jsonError = JSON.parse(responseText);
            if (jsonError.error) {
                if (typeof jsonError.error === 'string') errorDetail = jsonError.error;
                else if (jsonError.error.message) errorDetail = jsonError.error.message;
            } else if (jsonError.message) errorDetail = jsonError.message;
        } catch(e) {}
        throw new Error(`Z-API Error: ${errorDetail}`);
    }

    return Response.json({ success: true, message: 'WhatsApp enviado com sucesso' });

  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
    return Response.json({ success: false, error: error.message || 'Erro ao enviar WhatsApp' }, { status: 500 });
  }
});