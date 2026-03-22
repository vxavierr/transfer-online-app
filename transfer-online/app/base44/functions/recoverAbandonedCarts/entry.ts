import { createClientFromRequest } from 'npm:@base44/sdk@0.8.12';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const client = base44.asServiceRole;
    const startTime = Date.now();

    // Validate Cron Secret
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const envSecret = Deno.env.get("CRON_SECRET");

    // Only validate if CRON_SECRET is set in environment variables
    if (envSecret && secret !== envSecret) {
        // Check if it might be contained (due to potential cron service appending timestamps as seen in user example)
        if (!secret || !secret.startsWith(envSecret)) {
             console.error('[recoverAbandonedCarts] Unauthorized: Invalid secret');
             return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    // Use BASE_URL
    let appUrl = Deno.env.get('BASE_URL');
    if (!appUrl) appUrl = 'https://app.transferonline.com.br';
    if (appUrl.endsWith('/')) appUrl = appUrl.slice(0, -1);
    if (!appUrl.startsWith('http')) appUrl = 'https://' + appUrl;

    // Define recovery coupon
    const RECOVERY_COUPON_CODE = 'RETORNO5';

    // Calculate time window: 5 minutes ago to 24 hours ago
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Filter leads: status='booking_started' OR 'viewed_prices', no recovery sent, not converted
    // CRITICAL: Sort by last_activity_at descending to get MOST RECENT leads first
    // fetch up to 100 leads to check
    const leads = await client.entities.BookingLead.filter(
        { 
            converted_booking_id: null 
        },
        '-last_activity_at', // Sort descending (newest first)
        100 // Limit
    );

    // Filter in memory for recovery status and time
    let tooRecentCount = 0;
    let tooOldCount = 0;
    let alreadyRecoveredCount = 0;
    let convertedCount = 0;

    const leadsToRecover = leads.filter(lead => {
        // Excluir leads convertidos explicitamente pelo status
        if (lead.status === 'converted' || lead.converted_booking_id) {
            convertedCount++;
            return false;
        }

        // Aceitar apenas status relevantes
        if (lead.status !== 'booking_started' && lead.status !== 'viewed_prices') return false;

        if (lead.recovery_message_sent_at) {
            alreadyRecoveredCount++;
            return false;
        }
        if (!lead.last_activity_at) return false;
        
        const activityDate = new Date(lead.last_activity_at);
        
        if (activityDate >= fiveMinutesAgo) {
            tooRecentCount++;
            return false;
        }
        if (activityDate <= twentyFourHoursAgo) {
            tooOldCount++;
            return false;
        }
        
        return true;
    });

    console.log(`[recoverAbandonedCarts] Checked ${leads.length} recent leads.`);
    console.log(`[recoverAbandonedCarts] Excluded: ${alreadyRecoveredCount} recovered, ${tooRecentCount} too recent (<5m), ${tooOldCount} too old (>24h).`);
    console.log(`[recoverAbandonedCarts] Found ${leadsToRecover.length} leads eligible for recovery.`);

    const results = [];

    for (const lead of leadsToRecover) {
        try {
            if (!lead.phone) continue;

            // Create coupon if it doesn't exist
            let couponText = '';
            try {
               const coupons = await client.entities.Coupon.list();
               let recoveryCoupon = coupons.find(c => c.code === RECOVERY_COUPON_CODE);
               if (!recoveryCoupon) {
                 await client.entities.Coupon.create({
                   code: RECOVERY_COUPON_CODE,
                   discount_type: 'percentage',
                   discount_value: 5,
                   active: true,
                   description: 'Cupom automático para recuperação de carrinho abandonado'
                 });
                 recoveryCoupon = { discount_value: 5, discount_type: 'percentage' };
               }
               
               couponText = `\n🎁 *Presente Especial:* Use o cupom *${RECOVERY_COUPON_CODE}* e ganhe ${recoveryCoupon.discount_value}% de desconto ao finalizar agora!\n`;
            } catch (couponErr) {
               console.warn('[recoverAbandonedCarts] Failed to handle coupon:', couponErr);
            }

            // Construir mensagem dinâmica baseada nos dados disponíveis
            let messageDetails = '';

            if (lead.service_type === 'round_trip') {
                messageDetails += `🚗 *Viagem Ida e Volta*\n\n`;
                messageDetails += `➡️ *Ida:*\n`;
                messageDetails += `📍 De: ${lead.origin}\n`;
                messageDetails += `🏁 Para: ${lead.destination}\n`;
                messageDetails += `📅 Data: ${lead.date} às ${lead.time}\n\n`;

                messageDetails += `⬅️ *Volta:*\n`;
                messageDetails += `📍 De: ${lead.destination}\n`;
                messageDetails += `🏁 Para: ${lead.origin}\n`;
                if (lead.return_date) {
                    messageDetails += `📅 Data: ${lead.return_date} às ${lead.return_time}\n`;
                }
            } else {
                messageDetails += `📍 *De:* ${lead.origin}\n`;
                if (lead.destination) messageDetails += `🏁 *Para:* ${lead.destination}\n`;
                messageDetails += `📅 *Data:* ${lead.date} às ${lead.time}\n`;
            }
            
            // Verificar se o veículo foi selecionado
            const hasVehicleSelected = !!lead.vehicle_type_name && !!lead.calculated_price;
            
            if (hasVehicleSelected) {
                messageDetails += `🚗 *Veículo:* ${lead.vehicle_type_name}\n`;
                const priceFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.calculated_price);
                messageDetails += `💰 *Valor:* ${priceFormatted}\n`;
            }

            let actionText = '';
            let finalLink = '';

            if (hasVehicleSelected) {
                actionText = `Garanta seu veículo agora com pagamento via cartão:`;
                finalLink = `${appUrl}/RetomarCarrinho?leadId=${lead.id}`;
            } else {
                actionText = `Escolha seu veículo ideal agora:`;
                
                // Construir link para NovaReserva com parâmetros
                const params = new URLSearchParams();
                if (lead.origin) params.append('origin', lead.origin);
                if (lead.destination) params.append('destination', lead.destination);
                if (lead.date) params.append('date', lead.date);
                if (lead.time) params.append('time', lead.time);
                if (lead.service_type) params.append('service_type', lead.service_type);
                if (lead.phone) params.append('phone', lead.phone);
                if (lead.email) params.append('email', lead.email);
                if (lead.hours) params.append('hours', lead.hours);
                if (lead.origin_flight_number) params.append('origin_flight_number', lead.origin_flight_number);
                if (lead.destination_flight_number) params.append('destination_flight_number', lead.destination_flight_number);
                params.append('from_recovery', 'true');
                
                finalLink = `${appUrl}/NovaReserva?${params.toString()}`;
            }

            const message = `Olá! Notamos que você não finalizou sua reserva de Transfer:\n\n` +
                            messageDetails +
                            `${couponText}\n` +
                            `${actionText}\n` +
                            `${finalLink}\n\n` +
                            `Dúvidas? Estamos à disposição!\n` +
                    `WhatsApp: (11) 5102-3892`;

            // Send WhatsApp
            const sendResult = await client.functions.invoke('sendWhatsAppMessage', {
                to: lead.phone,
                message: message
            });

            if (sendResult.data && sendResult.data.success) {
                // Update Lead
                await client.entities.BookingLead.update(lead.id, {
                    recovery_message_sent_at: new Date().toISOString(),
                    status: 'recovery_sent',
                    recovery_coupon_code: RECOVERY_COUPON_CODE
                });
                results.push({ leadId: lead.id, status: 'sent' });
            } else {
                console.error(`[recoverAbandonedCarts] Failed to send to ${lead.phone}:`, sendResult.data?.error);
                results.push({ leadId: lead.id, status: 'failed', error: sendResult.data?.error });
            }

        } catch (err) {
            console.error(`[recoverAbandonedCarts] Error processing lead ${lead.id}:`, err);
            results.push({ leadId: lead.id, status: 'error', error: err.message });
        }
    }

    // Log to IntegrationLog
    try {
        const hasError = results.some(r => r.status === 'error' || r.status === 'failed');
        await client.entities.IntegrationLog.create({
            service_name: 'Auto - Recover Carts',
            action: 'recover_carts',
            status: hasError ? 'warning' : 'success',
            message: `Eligible: ${leadsToRecover.length}, Processed: ${results.length}`,
            metadata: {
                processed_leads: leadsToRecover.map(l => ({
                    id: l.id,
                    phone: l.phone,
                    destination: l.destination,
                    status: l.status,
                    last_activity: l.last_activity_at
                })),
                results: results
            },
            executed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime
        });
    } catch (e) { console.error("Error logging to IntegrationLog:", e); }

    return Response.json({ success: true, processed: results.length, results });

  } catch (error) {
    console.error('[recoverAbandonedCarts] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});