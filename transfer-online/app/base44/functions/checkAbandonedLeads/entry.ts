import { createClientFromRequest } from 'npm:@base44/sdk@0.8.12';

function getBrasiliaTime() {
  const now = new Date();
  const brasiliaTimeString = now.toLocaleString('en-US', { 
    timeZone: 'America/Sao_Paulo' 
  });
  return new Date(brasiliaTimeString);
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    
    // Extrair secret de múltiplas fontes
    const url = new URL(req.url);
    const cronSecret = Deno.env.get('CRON_SECRET');
    const providedSecret = body.secret || 
                          req.headers.get('X-Cron-Secret') || 
                          url.searchParams.get('secret');

    let isAuthorized = false;
    let isCronJob = false;

    // Verificar se é cron job autorizado
    if (cronSecret && providedSecret === cronSecret) {
      isAuthorized = true;
      isCronJob = true;
    } else {
      // Verificar se é admin
      const base44 = createClientFromRequest(req);
      try {
        const user = await base44.auth.me();
        if (user && user.role === 'admin') {
          isAuthorized = true;
        }
      } catch (authError) {
        // Não autorizado
      }
    }

    if (!isAuthorized) {
      console.error('[checkAbandonedLeads] Acesso não autorizado - secret fornecido:', providedSecret ? 'SIM' : 'NÃO');
      return Response.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    console.log(`[checkAbandonedLeads] Executado como: ${isCronJob ? 'CRON JOB' : 'ADMIN'}`);
    const startTime = Date.now();

    // Criar cliente service role para operações
    const base44 = createClientFromRequest(req);

    // Buscar leads com status 'viewed_prices' ou 'booking_started'
    const [viewedLeads, startedLeads] = await Promise.all([
      base44.asServiceRole.entities.BookingLead.filter({ status: 'viewed_prices' }),
      base44.asServiceRole.entities.BookingLead.filter({ status: 'booking_started' })
      ]);

      let allLeads = [...viewedLeads, ...startedLeads];

      // Excluir leads já convertidos ou que já receberam mensagem de recuperação
      allLeads = allLeads.filter(lead => lead.status !== 'converted' && !lead.converted_booking_id);

      // Filtrar leads que não receberam mensagem de recuperação e que estão inativos há mais de 5 minutos
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));

      const leadsToRecover = allLeads.filter(lead => {
      if (lead.recovery_message_sent_at) {
        return false; // Já recebeu mensagem
      }

      // As datas vêm em UTC do banco, comparar diretamente em UTC
      const lastActivity = new Date(lead.last_activity_at || lead.created_date);

      console.log(`[checkAbandonedLeads] Lead ${lead.id}: lastActivity=${lastActivity.toISOString()}, fiveMinutesAgo=${fiveMinutesAgo.toISOString()}, isOld=${lastActivity < fiveMinutesAgo}`);

      return lastActivity < fiveMinutesAgo;
    });

    console.log(`[checkAbandonedLeads] Encontrados ${leadsToRecover.length} leads para recuperação`);

    // Buscar cupom ativo para recuperação
    const coupons = await base44.asServiceRole.entities.Coupon.filter({
      code: 'RETORNO5',
      active: true
    });

    let couponCode = 'RETORNO5';
    let couponValue = '5%'; // Valor padrão caso o cupom não exista

    if (coupons.length > 0) {
      const coupon = coupons[0];
      couponValue = coupon.discount_type === 'percentage' 
        ? `${coupon.discount_value}%` 
        : `R$ ${coupon.discount_value.toFixed(2)}`;
    } else {
      console.warn('[checkAbandonedLeads] Cupom RETORNO5 não encontrado no sistema. Por favor, crie-o no painel administrativo.');
    }

    // Buscar configuração do WhatsApp
    const whatsappConfigs = await base44.asServiceRole.entities.AppConfig.filter({
      config_key: 'whatsapp_number'
    });
    const whatsappNumber = whatsappConfigs.length > 0 ? whatsappConfigs[0].config_value : null;

    let successCount = 0;
    let errorCount = 0;

    // Processar cada lead
    for (const lead of leadsToRecover) {
      try {
        const phone = lead.phone.replace(/\D/g, '');
        
        let message = '';
        // Considerar veículo selecionado apenas se o status já avançou para 'booking_started'
        const hasVehicleSelected = lead.status === 'booking_started' && lead.vehicle_type_name && lead.calculated_price > 0;
        const baseUrl = Deno.env.get('BASE_URL') || 'https://app.transferonline.com.br';

        if (hasVehicleSelected) {
          message = `🚗 *TransferOnline* - Olá!

Vimos que você estava prestes a finalizar sua reserva para *${lead.destination || 'sua viagem'}* no dia *${lead.date}* 📅
com o veículo *${lead.vehicle_type_name}* no valor de *${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.calculated_price)}*.

Falta pouco! Finalize agora com *${couponValue} de desconto*. 🎉

Use o cupom: *${couponCode}*

👉 *Finalizar Pagamento:* ${baseUrl}/RetomarCarrinho?leadId=${lead.id}

${whatsappNumber ? `\n💬 Dúvidas? Chame no WhatsApp: ${whatsappNumber}` : ''}

Essa oferta é exclusiva e válida por tempo limitado! ⏰`;
        } else {
          // Construct URL with params to pre-fill NovaReserva
          const params = new URLSearchParams();
          if (lead.origin) params.append('origin', lead.origin);
          if (lead.destination) params.append('destination', lead.destination);
          if (lead.date) params.append('date', lead.date);
          if (lead.time) params.append('time', lead.time);
          if (lead.service_type) params.append('service_type', lead.service_type);
          if (lead.phone) params.append('phone', lead.phone);
          if (lead.email) params.append('email', lead.email);
          if (lead.hours) params.append('hours', lead.hours);
          params.append('from_recovery', 'true');
          
          message = `🚗 *TransferOnline* - Olá!

Vimos que você iniciou uma cotação para *${lead.destination || 'sua viagem'}* no dia *${lead.date}* 📅.

Ainda não escolheu seu veículo? Temos ótimas opções disponíveis (Sedans, Vans e Blindados)!
Volte agora e escolha o ideal para você com *${couponValue} de desconto*. 🎉

Use o cupom: *${couponCode}*

👉 *Escolher Veículo:* ${baseUrl}/NovaReserva?${params.toString()}

${whatsappNumber ? `\n💬 Dúvidas? Chame no WhatsApp: ${whatsappNumber}` : ''}

Não deixe para a última hora! ⏰`;
        }

        // Enviar WhatsApp via Z-API (usando função centralizada)
        console.log(`[checkAbandonedLeads] Enviando mensagem para ${phone}...`);

        const sendResult = await base44.asServiceRole.functions.invoke('sendWhatsAppMessage', {
          to: phone,
          message: message
        });

        if (!sendResult.data || !sendResult.data.success) {
          console.error(`[checkAbandonedLeads] Erro ao enviar para ${phone}:`, sendResult.data?.error || 'Erro desconhecido');
          errorCount++;
          continue;
        }

        // Atualizar lead
        await base44.asServiceRole.entities.BookingLead.update(lead.id, {
          recovery_message_sent_at: new Date().toISOString(),
          recovery_coupon_code: couponCode,
          status: 'abandoned'
        });

        successCount++;
        console.log(`[checkAbandonedLeads] Mensagem enviada para ${phone}`);

      } catch (error) {
        errorCount++;
        console.error(`[checkAbandonedLeads] Erro ao processar lead ${lead.id}:`, error);
      }
    }

    // Log to IntegrationLog
    try {
        await base44.asServiceRole.entities.IntegrationLog.create({
            service_name: 'Auto - Abandoned Leads',
            action: 'check_leads',
            status: errorCount > 0 ? 'warning' : 'success',
            message: `Processados: ${leadsToRecover.length}, Enviados: ${successCount}, Erros: ${errorCount}`,
            metadata: {
                processed_leads: leadsToRecover.map(l => ({
                    id: l.id,
                    phone: l.phone,
                    destination: l.destination,
                    date: l.date,
                    vehicle: l.vehicle_type_name
                })),
                success_count: successCount,
                error_count: errorCount
            },
            executed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime
        });
    } catch (e) { console.error("Error logging to IntegrationLog:", e); }

    return Response.json({
      success: true,
      processed: leadsToRecover.length,
      sent: successCount,
      errors: errorCount
    });

  } catch (error) {
    console.error('[checkAbandonedLeads] Erro geral:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});