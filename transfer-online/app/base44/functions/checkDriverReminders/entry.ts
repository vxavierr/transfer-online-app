import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';

function renderTemplate(template, vars) {
  if (!template) return '';
  let result = template.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
    return vars[key] !== undefined && vars[key] !== null && vars[key] !== '' ? renderTemplate(content, vars) : '';
  });
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : '';
  });
  return result;
}

function getTripRelationFields(trip) {
  if (trip.type === 'ServiceRequest') return { related_service_request_id: trip.id };
  if (trip.type === 'SupplierOwnBooking') return { related_supplier_own_booking_id: trip.id };
  if (trip.type === 'EventTrip') return { related_event_trip_id: trip.id };
  if (trip.type === 'Booking') return { related_booking_id: trip.id };
  return {};
}

Deno.serve(async (req) => {
  try {
    // Security Check for External Cron
    // Verificação de segurança simplificada (apenas log, não bloqueia)
    const url = new URL(req.url);
    console.log("[CheckReminders] Execução iniciada via " + req.method);

    const base44 = createClientFromRequest(req);
    console.log("[CheckReminders] Function received request");

    // 1. Obter data/hora atual (UTC)
    const now = new Date();
    
    // Ajustar definição de datas para o Fuso de Brasília (UTC-3) para filtragem
    const getBrazilDateStr = (d) => {
        // Ajuste simples para pegar a data correta no Brasil
        // Se agora é 23/01 01:00 UTC, no Brasil é 22/01 22:00.
        const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
        return brt.toISOString().split('T')[0];
    };

    const today = getBrazilDateStr(now);
    const tomorrow = getBrazilDateStr(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    const yesterday = getBrazilDateStr(new Date(now.getTime() - 24 * 60 * 60 * 1000)); 

    const dateFilter = [yesterday, today, tomorrow];
    
    console.log(`[CheckReminders] Executing at ${now.toISOString()} (UTC). Brazil Dates Scope: ${JSON.stringify(dateFilter)}`);

    // Helper para buscar viagens por data (para evitar limite de 2000 registros globais)
    const fetchTripsByDate = async (entityName, dateList) => {
        let allResults = [];
        // Buscar para cada data individualmente para ser mais seguro e eficiente
        for (const date of dateList) {
            try {
                // Filtramos por data e status que indicam viagem ativa/confirmada
                // Para simplificar, pegamos tudo da data e filtramos status em memória ou no query se possível
                // Base44 filter é AND.
                // Status relevantes: confirmada, em_andamento, dispatched, planned (EventTrip), pendente (se tiver motorista)
                
                // Melhor estratégia: trazer tudo da data e filtrar em memória, pois status variam por entidade
                // Corrigido: filter(query, sort, limit)
                const results = await base44.asServiceRole.entities[entityName].filter({ 
                    date: date 
                }, undefined, 1000);
                
                allResults = [...allResults, ...results];
            } catch (e) {
                console.error(`Error fetching ${entityName} for date ${date}:`, e);
            }
        }
        return allResults;
    };

    // 1. ServiceRequest
    const serviceRequestsRaw = await fetchTripsByDate('ServiceRequest', dateFilter);
    const serviceRequests = serviceRequestsRaw.filter(t => 
        ['confirmada', 'em_andamento', 'pendente'].includes(t.status) &&
        (t.driver_id || (t.driver_phone && t.driver_name))
    );

    // 2. SupplierOwnBooking
    const supplierOwnBookingsRaw = await fetchTripsByDate('SupplierOwnBooking', dateFilter);
    const supplierOwnBookings = supplierOwnBookingsRaw.filter(t => 
        ['confirmada', 'em_andamento', 'pendente'].includes(t.status) &&
        (t.driver_id || (t.driver_phone && t.driver_name))
    );

    // 3. Booking
    const bookingsRaw = await fetchTripsByDate('Booking', dateFilter);
    const bookings = bookingsRaw.filter(t => 
        ['confirmada', 'em_andamento', 'pendente'].includes(t.status) &&
        (t.driver_id || (t.driver_name && (t.driver_phone || t.driver_email))) // Correção: permite driver_id ou contato parcial (email)
    );

    // 4. EventTrip (NOVO)
    const eventTripsRaw = await fetchTripsByDate('EventTrip', dateFilter);
    const eventTrips = eventTripsRaw.filter(t => 
        ['confirmed', 'dispatched', 'planned'].includes(t.status) &&
        (t.driver_id || (t.subcontractor_driver_phone && t.subcontractor_driver_name) || (t.casual_driver_phone && t.casual_driver_name))
    );

    console.log(`[CheckReminders] Found: ${serviceRequests.length} SRs, ${supplierOwnBookings.length} SOBs, ${bookings.length} Bookings, ${eventTrips.length} EventTrips.`);
    
    // Normalizar viagens para formato comum
    const allTrips = [
        ...serviceRequests.map(t => ({ 
            ...t, 
            type: 'ServiceRequest', 
            display_id: t.request_number,
            trip_time: t.time 
        })),
        ...supplierOwnBookings.map(t => ({ 
            ...t, 
            type: 'SupplierOwnBooking', 
            display_id: t.booking_number,
            trip_time: t.time 
        })),
        ...bookings.map(t => ({ 
            ...t, 
            type: 'Booking', 
            display_id: t.booking_number,
            trip_time: t.time 
        })),
        ...eventTrips.map(t => ({ 
            ...t, 
            type: 'EventTrip', 
            display_id: t.trip_code || t.name,
            trip_time: t.start_time, // EventTrip usa start_time
            // Normalizar driver info para EventTrip
            driver_phone: t.driver_id ? null : (t.subcontractor_driver_phone || t.casual_driver_phone),
            driver_name: t.driver_id ? null : (t.subcontractor_driver_name || t.casual_driver_name)
            // Se tiver driver_id, buscamos depois igual aos outros
        }))
    ];

    const reminderTemplates = await base44.asServiceRole.entities.NotificationTemplate.filter({ event_type: 'lembrete_motorista' }, undefined, 50).catch(() => []);
    const reminderTemplateMap = reminderTemplates.reduce((acc, template) => {
        acc[`${template.channel}_${template.language}`] = template;
        return acc;
    }, {});
    
    const sentReminders = [];
    const errors = [];
    
    const instanceId = Deno.env.get("EVOLUTION_INSTANCE_NAME");
    const token = Deno.env.get("EVOLUTION_API_KEY");
    const apiUrl = Deno.env.get("EVOLUTION_API_URL");
    const clientToken = Deno.env.get("EVOLUTION_CLIENT_TOKEN");
    
    // Robust URL construction
    let baseUrl = apiUrl ? apiUrl.trim() : "";
    if (baseUrl) {
        while(baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        try {
            const urlObj = new URL(baseUrl);
            baseUrl = `${urlObj.protocol}//${urlObj.host}`;
        } catch (e) {
            console.warn("Invalid API URL format, using as provided", e);
            baseUrl = apiUrl ? apiUrl.trim() : "";
            while(baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        }
    }
    
    // Processar viagens
    for (const trip of allTrips) {
        // Ignorar viagens canceladas
        const status = trip.status?.toLowerCase() || '';
        if (status.includes('cancel') || status.includes('recusad') || status.includes('rejeitad')) {
            continue;
        }

        // Pular se já enviou lembrete
        if (trip.driver_reminder_1h_sent_at) {
            continue;
        }

        // Construir data/hora da viagem robustamente
        if (!trip.trip_time) {
            continue;
        }
        const cleanTime = trip.trip_time.split(':').slice(0, 2).join(':'); // Garante HH:mm
        const tripDateTimeStr = `${trip.date}T${cleanTime}:00`;
        const tripDate = new Date(`${tripDateTimeStr}-03:00`);

        if (isNaN(tripDate.getTime())) {
             console.error(`[DEBUG] Trip ${trip.display_id} skipped: Invalid date for trip ${trip.id}: ${tripDateTimeStr}`);
             continue;
        }

        const timeDiffMs = tripDate.getTime() - now.getTime();
        const timeDiffMinutes = timeDiffMs / (1000 * 60);

        // Debug para trips próximas (dentro de 2h)
        if (timeDiffMinutes > 0 && timeDiffMinutes < 120) {
             console.log(`[DEBUG] Trip ${trip.display_id} is coming up in ${timeDiffMinutes.toFixed(1)} min.`);
        }
        
        // Janela de envio resiliente: 30 a 120 min antes
        if (timeDiffMinutes >= 30 && timeDiffMinutes <= 120) {
            console.log(`[CheckReminders] Processing trip ${trip.display_id} (Diff: ${timeDiffMinutes.toFixed(1)} min)`);
            
            let driverPhone = trip.driver_phone;
            let driverEmail = trip.driver_email;
            let driverName = trip.driver_name;
            
            // Buscar dados do motorista se faltar contato E tiver driver_id
            if (trip.driver_id) {
                try {
                   // Sempre buscar o nome se não tiver, mesmo que tenha telefone
                   if (!driverName || !driverPhone || !driverEmail) {
                       const driver = await base44.asServiceRole.entities.Driver.get(trip.driver_id);
                       if (driver) {
                           if (!driverPhone) driverPhone = driver.phone_number;
                           if (!driverEmail) driverEmail = driver.email;
                           if (!driverName) driverName = driver.name;
                       }
                   }
                } catch (e) {
                    console.error(`Error fetching driver ${trip.driver_id}`, e);
                }
            }

            // Atualizar o objeto trip com o nome resolvido para aparecer corretamente no log
            trip.driver_name = driverName || (trip.casual_driver_name || trip.subcontractor_driver_name || 'Motorista Avulso');

            // Se não tiver contato nenhum, pula
            if (!driverPhone && !driverEmail) {
                console.log(`[CheckReminders] Trip ${trip.display_id} ignorada: sem telefone e sem email do motorista.`);
                continue;
            }
            
            // Garantir token de acesso
            let driverAccessToken = trip.driver_access_token;
            if (!driverAccessToken) {
                try {
                    driverAccessToken = uuidv4();
                    // Atualizar o token no banco
                    const Entity = base44.asServiceRole.entities[trip.type];
                    await Entity.update(trip.id, { driver_access_token: driverAccessToken });
                } catch (tokenErr) {
                    console.error(`[CheckReminders] Failed to generate/save token for ${trip.display_id}:`, tokenErr);
                    continue; // Pula essa viagem se não conseguir gerar token
                }
            }

            const appBaseUrl = Deno.env.get('BASE_URL') || 'https://transferonline.base44.app';
            const tripUrl = `${appBaseUrl}/DetalhesViagemMotoristaV2?token=${driverAccessToken}`;
            const passengersCount = trip.passengers || trip.passenger_count || 1;
            const passengerName = trip.passenger_name || trip.customer_name || trip.name || "Passageiro";
            const templateLanguage = ['pt', 'en', 'es'].includes(trip.driver_language) ? trip.driver_language : 'pt';
            const whatsappTemplate = reminderTemplateMap[`whatsapp_${templateLanguage}`] || reminderTemplateMap['whatsapp_pt'];
            const emailTemplate = reminderTemplateMap[`email_${templateLanguage}`] || reminderTemplateMap['email_pt'];
            const templateVars = {
                recipient_name: driverName || 'Motorista',
                trip_number: trip.display_id,
                passenger_name: passengerName,
                driver_name: driverName || 'Motorista',
                driver_phone: driverPhone || '',
                origin: trip.origin || '',
                destination: trip.destination || '',
                date: trip.date ? trip.date.split('-').reverse().join('/') : '',
                time: trip.trip_time || '',
                trip_url: tripUrl,
                notes: trip.notes || '',
                passengers_count: passengersCount
            };
            const relationFields = getTripRelationFields(trip);
            let messageSent = false;
            const successfulChannels = [];

            // 1. Tentar WhatsApp
            if (driverPhone && instanceId && token && apiUrl && (!whatsappTemplate || (whatsappTemplate.is_enabled !== false && whatsappTemplate.send_to_driver !== false))) {
                let cleanPhone = driverPhone.replace(/\D/g, '');
                if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
                    cleanPhone = '55' + cleanPhone;
                }

                const fallbackMessage = `🔔 *Lembrete de Viagem*\n\nOlá ${driverName || 'Motorista'}, sua viagem é daqui a pouco!\n\n📅 Data: ${trip.date.split('-').reverse().join('/')}\n⏰ Horário: ${trip.trip_time}\n📍 Origem: ${trip.origin}\n🏁 Destino: ${trip.destination}\n👥 Passageiro: ${passengerName} (${passengersCount} pax)\n\n🔗 *Acesse os detalhes e inicie a viagem:*\n${tripUrl}\n\nBom trabalho!`;
                const message = whatsappTemplate ? renderTemplate(whatsappTemplate.body_template, templateVars) : fallbackMessage;

                try {
                    const headers = { 'Content-Type': 'application/json' };
                    if (clientToken) headers['Client-Token'] = clientToken;
                    const zApiUrl = `${baseUrl}/instances/${instanceId}/token/${token}/send-text`;

                    const response = await fetch(zApiUrl, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({ phone: cleanPhone, message: message })
                    });

                    if (response.ok) {
                        messageSent = true;
                        successfulChannels.push({
                            channel: 'whatsapp',
                            recipient: cleanPhone,
                            subject: '',
                            body: message,
                            template_id: whatsappTemplate?.id || null
                        });
                        sentReminders.push({ id: trip.id, channel: 'whatsapp', driver: driverName, phone: cleanPhone });
                        console.log(`[CheckReminders] ✅ WhatsApp sent successfully to ${driverName} (${cleanPhone})`);
                    } else {
                        const errText = await response.text();
                        console.error(`[CheckReminders] ❌ Z-API Error: ${errText}`);
                        errors.push({ trip: trip.display_id, channel: 'whatsapp', error: errText });
                    }
                } catch (err) {
                    console.error(`[CheckReminders] ❌ Z-API Exception: ${err.message}`);
                    errors.push({ trip: trip.display_id, channel: 'whatsapp', error: err.message });
                }
            }

            // 2. Tentar Email
            if (driverEmail && (!emailTemplate || (emailTemplate.is_enabled !== false && emailTemplate.send_to_driver !== false))) {
                const fallbackSubject = `🔔 Lembrete de Viagem - ${trip.display_id}`;
                const fallbackBody = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>🔔 Lembrete de Viagem</h2>
                        <p>Olá <strong>${driverName || 'Motorista'}</strong>,</p>
                        <p>Sua viagem está programada para começar em breve (aprox. ${timeDiffMinutes.toFixed(0)} min).</p>
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>📅 Data:</strong> ${trip.date.split('-').reverse().join('/')}</p>
                            <p><strong>⏰ Horário:</strong> ${trip.trip_time}</p>
                            <p><strong>📍 Origem:</strong> ${trip.origin}</p>
                            <p><strong>🏁 Destino:</strong> ${trip.destination}</p>
                            <p><strong>👥 Passageiro:</strong> ${passengerName}</p>
                        </div>
                        <p>Clique no botão abaixo para ver os detalhes e iniciar a viagem:</p>
                        <a href="${tripUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver Detalhes da Viagem</a>
                    </div>
                `;
                const emailSubject = emailTemplate ? renderTemplate(emailTemplate.subject_template || fallbackSubject, templateVars) : fallbackSubject;
                const emailBody = emailTemplate ? renderTemplate(emailTemplate.body_template, templateVars) : fallbackBody;

                try {
                    await base44.integrations.Core.SendEmail({
                        to: driverEmail,
                        subject: emailSubject,
                        body: emailBody
                    });
                    messageSent = true;
                    successfulChannels.push({
                        channel: 'email',
                        recipient: driverEmail,
                        subject: emailSubject,
                        body: emailBody,
                        template_id: emailTemplate?.id || null
                    });
                    sentReminders.push({ id: trip.id, channel: 'email', driver: driverName });
                } catch (emailErr) {
                    console.error(`[CheckReminders] Erro Email: ${emailErr.message}`);
                }
            }

            // 3. Tentar Ligação (Twilio)
            const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
            const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
            const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");

            if (twilioSid && twilioToken && twilioFrom && driverPhone) {
                try {
                    let phoneToCall = driverPhone.replace(/\D/g, '');
                    if (!driverPhone.includes('+')) {
                         phoneToCall = (phoneToCall.length >= 10 && phoneToCall.length <= 11) ? '+55' + phoneToCall : '+' + phoneToCall; 
                    } else {
                        phoneToCall = driverPhone; 
                    }

                    const safeOrigin = (trip.origin || '').replace(/&/g, 'e').replace(/[<>]/g, '');
                    const sayMessage = `Olá ${driverName || 'Motorista'}, aqui é a TransferOnline. Este é um lembrete para sua próxima viagem. Sua partida de ${safeOrigin} está agendada para as ${trip.trip_time}. Por favor, esteja a postos.`;
                    const twiml = `<Response><Say language="pt-BR" voice="alice">${sayMessage}</Say></Response>`;

                    const callRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: new URLSearchParams({
                            'To': phoneToCall,
                            'From': twilioFrom,
                            'Twiml': twiml
                        })
                    });

                    if (callRes.ok) {
                        sentReminders.push({ id: trip.id, channel: 'voice_call', driver: driverName });
                        messageSent = true; 
                    } else {
                        const errText = await callRes.text();
                        console.error(`[CheckReminders] ❌ Twilio Error: ${errText}`);
                        errors.push({ trip: trip.display_id, channel: 'voice_call', error: errText });
                    }
                } catch (callErr) {
                    console.error(`[CheckReminders] ❌ Twilio Exception: ${callErr.message}`);
                    errors.push({ trip: trip.display_id, channel: 'voice_call', error: callErr.message });
                }
            }

            // Se enviou por qualquer canal, atualiza a flag e registra rastreabilidade
            if (messageSent) {
                const reminderTimestamp = new Date().toISOString();
                const Entity = base44.asServiceRole.entities[trip.type];
                await Entity.update(trip.id, {
                    driver_reminder_1h_sent_at: reminderTimestamp
                });

                try {
                    await Promise.all(successfulChannels.map((entry) =>
                        base44.asServiceRole.entities.CommunicationLog.create({
                            event_type: 'lembrete_motorista',
                            channel: entry.channel,
                            recipient_type: 'driver',
                            recipient_name: driverName || 'Motorista',
                            recipient_contact: entry.recipient,
                            subject: entry.subject,
                            body: entry.body,
                            sent_at: reminderTimestamp,
                            delivery_status: 'sent',
                            template_id: entry.template_id,
                            language: templateLanguage,
                            ...relationFields
                        })
                    ));
                } catch (commErr) {
                    console.error('Erro ao salvar CommunicationLog do lembrete:', commErr);
                }

                try {
                    await base44.asServiceRole.entities.TripHistory.create({
                        trip_id: trip.id,
                        trip_type: trip.type,
                        event_type: 'Lembrete Motorista Enviado',
                        user_id: 'sistema',
                        user_name: 'Sistema Automático',
                        details: {
                            successful_channels: successfulChannels.map((entry) => entry.channel),
                            sent_via_whatsapp: successfulChannels.some((entry) => entry.channel === 'whatsapp'),
                            sent_via_email: successfulChannels.some((entry) => entry.channel === 'email'),
                            sent_via_voice_call: !!twilioSid && !!driverPhone,
                            time_diff: timeDiffMinutes.toFixed(1) + ' min'
                        },
                        comment: `Lembrete enviado automaticamente.`
                    });
                } catch (histErr) {
                    console.error('Erro ao salvar histórico:', histErr);
                }
            }
        }
    }

    // Atualizar timestamp da última verificação
    try {
        const configs = await base44.asServiceRole.entities.AppConfig.filter({ config_key: 'last_reminder_check' });
        if (configs && configs.length > 0) {
            await base44.asServiceRole.entities.AppConfig.update(configs[0].id, { config_value: new Date().toISOString() });
        } else {
            await base44.asServiceRole.entities.AppConfig.create({
                config_key: 'last_reminder_check',
                config_value: new Date().toISOString(),
                description: 'Última execução da verificação de lembretes'
            });
        }

        // NOVO: Registrar log na entidade IntegrationLog
        try {
            await base44.asServiceRole.entities.IntegrationLog.create({
                service_name: 'Auto - Driver Reminders',
                action: 'check_reminders',
                status: errors.length > 0 ? 'warning' : 'success',
                message: `Processadas: ${allTrips.length}, Enviadas: ${sentReminders.length}, Erros: ${errors.length}`,
                metadata: { 
                    sent_count: sentReminders.length,
                    error_count: errors.length,
                    sent_details: sentReminders, 
                    error_details: errors,
                    processed_trips: allTrips.map(t => ({
                        id: t.id,
                        display_id: t.display_id,
                        type: t.type,
                        driver: t.driver_name,
                        time: t.trip_time,
                        date: t.date
                    }))
                },
                executed_at: new Date().toISOString(),
                duration_ms: Date.now() - now.getTime()
            });
        } catch (logErr) {
            console.error('Erro ao salvar IntegrationLog:', logErr);
        }

    } catch (e) {
        console.error('Erro ao atualizar AppConfig:', e);
    }

    return Response.json({ 
        success: true, 
        processed: allTrips.length, 
        sent_count: sentReminders.length, 
        reminders: sentReminders,
        errors 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});