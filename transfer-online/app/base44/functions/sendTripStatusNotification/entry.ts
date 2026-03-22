import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Resend } from 'npm:resend';

// Render a template string: replaces {{var}} and handles {{#var}}block{{/var}} conditionals
function renderTemplate(template, vars) {
    if (!template) return '';
    // Conditional blocks: {{#varname}}content{{/varname}}
    let result = template.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
        return (vars[key] !== undefined && vars[key] !== null && vars[key] !== '')
            ? renderTemplate(content, vars)
            : '';
    });
    // Regular placeholders
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return (vars[key] !== undefined && vars[key] !== null) ? String(vars[key]) : '';
    });
    return result;
}

function getRelatedTripReferences(trip) {
    if (!trip?.id) return {};
    if (trip.request_number) return { related_service_request_id: trip.id };
    if (trip.trip_code || trip.event_id) return { related_event_trip_id: trip.id };
    if (trip.booking_number && trip.customer_email !== undefined) return { related_booking_id: trip.id };
    if (trip.booking_number) return { related_supplier_own_booking_id: trip.id };
    return {};
}

async function logCommunication(base44, payload) {
    try {
        await base44.asServiceRole.entities.CommunicationLog.create(payload);
    } catch (error) {
        console.error('[sendTripStatusNotification] Erro ao registrar CommunicationLog:', error.message);
    }
}

async function sendExternalEmail(base44, { to, subject, bodyHtml }) {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFrom = Deno.env.get('RESEND_FROM') || 'TransferOnline <nao-responda@enviotransferonline.com.br>';

    if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        return await resend.emails.send({
            from: resendFrom,
            to: [to],
            subject,
            html: bodyHtml
        });
    }

    return await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'TransferOnline',
        to,
        subject,
        body: bodyHtml
    });
}

function normalizeRecipientType(role) {
    if (role === 'notification_contact') return 'other';
    return role;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { trip, newStatus, timelineUrl = null, ratingLink = null } = body;

        if (!trip || !newStatus) {
            return Response.json({ success: false, error: 'Dados da viagem ou novo status são obrigatórios.' }, { status: 400 });
        }

        const lang = trip.driver_language || 'pt';
        const tripNumber = trip.request_number || trip.booking_number || trip.name || '';
        const driverName = trip.driver_name || '';
        const driverPhone = trip.driver_phone || '';
        const vehicleInfo = trip.vehicle_model ? `${trip.vehicle_model} - ${trip.vehicle_plate}` : '';

        // Variables available for placeholder substitution
        const templateVars = {
            trip_number: tripNumber,
            passenger_name: trip.passenger_name || '',
            driver_name: driverName,
            driver_phone: driverPhone,
            vehicle_info: vehicleInfo,
            origin: trip.origin || '',
            destination: trip.destination || '',
            date: trip.date || '',
            time: trip.time || '',
            timeline_url: timelineUrl || '',
            rating_link: ratingLink || ''
        };
        const tripReferences = getRelatedTripReferences(trip);

        // Try to load DB templates for this event + language
        let dbTemplates = [];
        try {
            dbTemplates = await base44.asServiceRole.entities.NotificationTemplate.filter({
                event_type: newStatus,
                language: lang
            });
        } catch (e) {
            console.warn('[sendTripStatusNotification] Could not load DB templates, using fallback:', e.message);
        }

        // channel -> template map
        const templateMap = {};
        for (const t of dbTemplates) {
            templateMap[t.channel] = t;
        }
        const hasConfiguredTemplates = dbTemplates.length > 0;

        // Hardcoded fallback messages (Portuguese) – used when no DB template exists
        const fallback = {
            'a_caminho': {
                subject: `🚗 Sua Viagem ${tripNumber} Está a Caminho!`,
                emailBody: (rName) => `<p>Olá <strong>${rName}</strong>,</p><p>Sua viagem <strong>${tripNumber}</strong> está em andamento!</p><p>📍 <strong>Origem:</strong> ${trip.origin || ''}</p><p>📍 <strong>Destino:</strong> ${trip.destination || ''}</p>${driverName ? `<p>👤 Motorista: <strong>${driverName}</strong>${vehicleInfo ? ' (' + vehicleInfo + ')' : ''}</p>` : ''}${timelineUrl ? `<p>🔍 Acompanhe: <a href="${timelineUrl}">${timelineUrl}</a></p>` : ''}`,
                whatsappBody: (rName) => `🚗 *Sua Viagem ${tripNumber} Está a Caminho!*\nOlá *${rName}*,\n\n📍 *ROTA*\n🟢 Origem: ${trip.origin || ''}\n🔴 Destino: ${trip.destination || ''}\n${driverName ? `\n👤 *SEU MOTORISTA*\n${driverName}${trip.driver_phone ? '\n📞 ' + trip.driver_phone : ''}${vehicleInfo ? '\n🚗 ' + vehicleInfo : ''}\n` : ''}${timelineUrl ? `\n🔍 *Acompanhe:* ${timelineUrl}` : ''}`
            },
            'solicitar_avaliacao': {
                subject: `Avalie sua viagem - TransferOnline ${tripNumber}`,
                emailBody: (rName) => `<div style="font-family:Arial,sans-serif;color:#333"><h2>Avalie sua viagem com a TransferOnline</h2><p>Olá,</p><p>Esperamos que sua viagem tenha sido excelente! Gostaríamos de ouvir sua opinião sobre o serviço prestado.</p><p><strong>Data:</strong> ${trip.date}${trip.time ? ' - ' + trip.time : ''}</p><p><strong>Origem:</strong> ${trip.origin}</p><p><strong>Destino:</strong> ${trip.destination}</p><br/><a href="${ratingLink}" style="background-color:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold">Avaliar Viagem Agora</a><br/><br/><p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p><p>${ratingLink}</p><br/><p>Atenciosamente,<br/>Equipe TransferOnline</p></div>`,
                whatsappBody: (rName) => `🚗 *TransferOnline*\n\nOlá! Esperamos que sua viagem ${tripNumber} tenha sido excelente! ⭐\n\nPor favor, reserve um momento para avaliar sua experiência:\n\n👉 ${ratingLink}\n\nSua opinião é muito importante para nós!`
            },
            'chegou_origem': {
                subject: `✅ Motorista chegou ao ponto de partida da viagem ${tripNumber}!`,
                emailBody: (rName) => `<p>Olá <strong>${rName}</strong>,</p><p>O motorista <strong>${driverName}</strong> (carro ${vehicleInfo}) chegou ao ponto de partida da viagem ${tripNumber}.</p>${timelineUrl ? `<p>Acompanhe: <a href="${timelineUrl}">${timelineUrl}</a></p>` : ''}`,
                whatsappBody: (rName) => `✅ *Motorista chegou ao ponto de partida da viagem ${tripNumber}!*\nOlá *${rName}*,\n${trip.passenger_name ? `👤 Passageiro: *${trip.passenger_name}*\n` : ''}O motorista *${driverName}* (carro ${vehicleInfo}) chegou ao ponto de partida.${timelineUrl ? `\nAcompanhe: ${timelineUrl}` : ''}`
            },
            'passageiro_embarcou': {
                subject: `🚀 Passageiro a bordo! Viagem ${tripNumber} em andamento.`,
                emailBody: (rName) => `<p>Olá <strong>${rName}</strong>,</p><p>O passageiro embarcou na viagem ${tripNumber} com o motorista <strong>${driverName}</strong> (carro ${vehicleInfo}).</p>${timelineUrl ? `<p>Acompanhe: <a href="${timelineUrl}">${timelineUrl}</a></p>` : ''}`,
                whatsappBody: (rName) => `🚀 *Passageiro a bordo! Viagem ${tripNumber} em andamento.*\nOlá *${rName}*,\n${trip.passenger_name ? `👤 Passageiro: *${trip.passenger_name}*\n` : ''}O passageiro embarcou com o motorista *${driverName}* (carro ${vehicleInfo}).${timelineUrl ? `\nAcompanhe: ${timelineUrl}` : ''}`
            },
            'chegou_destino': {
                subject: `🎉 Motorista chegou ao destino da viagem ${tripNumber}.`,
                emailBody: (rName) => `<p>Olá <strong>${rName}</strong>,</p><p>O motorista <strong>${driverName}</strong> (carro ${vehicleInfo}) chegou ao destino da viagem ${tripNumber}.</p>${timelineUrl ? `<p>Revise a viagem: <a href="${timelineUrl}">${timelineUrl}</a></p>` : ''}`,
                whatsappBody: (rName) => `🎉 *Motorista chegou ao destino da viagem ${tripNumber}.*\nOlá *${rName}*,\n${trip.passenger_name ? `👤 Passageiro: *${trip.passenger_name}*\n` : ''}O motorista *${driverName}* (carro ${vehicleInfo}) chegou ao destino.${timelineUrl ? `\nRevise a viagem: ${timelineUrl}` : ''}`
            },
            'finalizada': {
                subject: `✅ Viagem ${tripNumber} finalizada com sucesso!`,
                emailBody: (rName) => `<p>Olá <strong>${rName}</strong>,</p><p>A viagem ${tripNumber} foi finalizada com sucesso pelo motorista <strong>${driverName}</strong> (carro ${vehicleInfo}).</p>${timelineUrl ? `<p>Detalhes: <a href="${timelineUrl}">${timelineUrl}</a></p>` : ''}`,
                whatsappBody: (rName) => `✅ *Viagem ${tripNumber} finalizada com sucesso!*\nOlá *${rName}*,\n${trip.passenger_name ? `👤 Passageiro: *${trip.passenger_name}*\n` : ''}A viagem foi finalizada com sucesso pelo motorista *${driverName}*.${timelineUrl ? `\nDetalhes: ${timelineUrl}` : ''}`
            },
        }[newStatus];

        if (!fallback && Object.keys(templateMap).length === 0) {
            return Response.json({ success: false, message: 'Nenhuma notificação configurada para este status.' });
        }

        // Build recipients list
        const allRecipients = [];
        if (trip.passenger_email || trip.passenger_phone) {
            allRecipients.push({ name: trip.passenger_name || 'Passageiro', email: trip.passenger_email, phone: trip.passenger_phone, role: 'passenger' });
        }
        if (trip.requester_email || trip.requester_phone) {
            allRecipients.push({ name: trip.requester_full_name || 'Solicitante', email: trip.requester_email, phone: trip.requester_phone, role: 'requester' });
        }
        if (trip.client_id) {
            try {
                const clients = await base44.asServiceRole.entities.Client.filter({ id: trip.client_id });
                if (clients.length > 0 && (clients[0].contact_person_email || clients[0].contact_person_phone)) {
                    allRecipients.push({ name: clients[0].contact_person_name || 'Contato', email: clients[0].contact_person_email, phone: clients[0].contact_person_phone, role: 'client_contact' });
                }
            } catch (e) { console.warn('[sendTripStatusNotification] Client fetch error:', e.message); }
        }
        if (Array.isArray(trip.notification_phones)) {
            trip.notification_phones.forEach(phone => {
                if (phone?.trim() && !allRecipients.some(r => r.phone === phone)) {
                    allRecipients.push({ name: trip.passenger_name ? `Acompanhante de ${trip.passenger_name}` : 'Contato Adicional', email: null, phone: phone, role: 'notification_contact' });
                }
            });
        }

        // Check if a template allows sending to a specific role
        const isRoleAllowed = (tpl, role) => {
            if (!tpl) return true;
            if (role === 'passenger') return tpl.send_to_passenger !== false;
            if (role === 'requester') return tpl.send_to_requester !== false;
            if (role === 'client_contact') return tpl.send_to_client_contact === true;
            if (role === 'notification_contact') return tpl.send_to_additional_phones === true;
            return true;
        };

        // Fallback role logic preserving original behaviour for passageiro_embarcou
        const isFallbackRoleAllowed = (role) => {
            if (newStatus === 'passageiro_embarcou' && role === 'passenger') return false;
            return true;
        };

        const results = [];

        for (const recipient of allRecipients) {
            const recipientVars = { ...templateVars, recipient_name: recipient.name };

            // ── EMAIL ──────────────────────────────────────────────────────────
            const emailTpl = templateMap['email'];
            const emailEnabled = hasConfiguredTemplates
                ? !!emailTpl && emailTpl.is_enabled !== false
                : true;
            const emailRoleOk = hasConfiguredTemplates
                ? !!emailTpl && isRoleAllowed(emailTpl, recipient.role)
                : isFallbackRoleAllowed(recipient.role);

            if (recipient.email && emailEnabled && emailRoleOk) {
                let subject, bodyHtml;
                if (emailTpl) {
                    subject = renderTemplate(emailTpl.subject_template || '', recipientVars);
                    bodyHtml = renderTemplate(emailTpl.body_template, recipientVars);
                } else if (fallback) {
                    subject = fallback.subject;
                    bodyHtml = fallback.emailBody(recipient.name);
                }
                if (subject !== undefined && bodyHtml !== undefined) {
                    try {
                        const emailResponse = await sendExternalEmail(base44, { to: recipient.email, subject, bodyHtml });
                        await logCommunication(base44, {
                            event_type: newStatus,
                            channel: 'email',
                            recipient_type: normalizeRecipientType(recipient.role),
                            recipient_name: recipient.name,
                            recipient_contact: recipient.email,
                            subject,
                            body: bodyHtml,
                            sent_at: new Date().toISOString(),
                            delivery_status: 'sent',
                            provider_message_id: emailResponse?.data?.id || emailResponse?.id || null,
                            template_id: emailTpl?.id || null,
                            language: lang,
                            related_driver_id: trip.driver_id || null,
                            metadata: {
                                trip_number: tripNumber,
                                timeline_url: timelineUrl || null,
                                provider: Deno.env.get('RESEND_API_KEY') ? 'resend' : 'core'
                            },
                            ...tripReferences
                        });
                        results.push({ recipient: recipient.email, type: 'email', status: 'sent' });
                    } catch (e) {
                        const detailedError = e?.message || 'Erro ao enviar e-mail';
                        console.error(`Erro email ${recipient.email}:`, detailedError);
                        await logCommunication(base44, {
                            event_type: newStatus,
                            channel: 'email',
                            recipient_type: normalizeRecipientType(recipient.role),
                            recipient_name: recipient.name,
                            recipient_contact: recipient.email,
                            subject: subject || '',
                            body: bodyHtml || '',
                            sent_at: new Date().toISOString(),
                            delivery_status: 'failed',
                            failure_reason: detailedError,
                            template_id: emailTpl?.id || null,
                            language: lang,
                            related_driver_id: trip.driver_id || null,
                            metadata: {
                                trip_number: tripNumber,
                                timeline_url: timelineUrl || null,
                                provider: Deno.env.get('RESEND_API_KEY') ? 'resend' : 'core'
                            },
                            ...tripReferences
                        });
                        results.push({ recipient: recipient.email, type: 'email', status: 'error', error: detailedError });
                    }
                }
            }

            // ── WHATSAPP ───────────────────────────────────────────────────────
            const waTpl = templateMap['whatsapp'];
            const waEnabled = hasConfiguredTemplates
                ? !!waTpl && waTpl.is_enabled !== false
                : true;
            const waRoleOk = hasConfiguredTemplates
                ? !!waTpl && isRoleAllowed(waTpl, recipient.role)
                : isFallbackRoleAllowed(recipient.role);

            if (recipient.phone && waEnabled && waRoleOk) {
                let message;
                if (waTpl) {
                    message = renderTemplate(waTpl.body_template, recipientVars);
                } else if (fallback) {
                    message = fallback.whatsappBody(recipient.name);
                }
                if (message) {
                    try {
                        const whatsappResponse = await base44.functions.invoke('sendWhatsAppMessage', { to: recipient.phone, message });
                        const whatsappData = whatsappResponse?.data || whatsappResponse || {};

                        if (whatsappData.success === false) {
                            const sendError = new Error(whatsappData.error || 'Falha ao enviar WhatsApp');
                            sendError.provider_response = whatsappData.provider_response || null;
                            sendError.provider_status = whatsappData.provider_status || null;
                            sendError.normalized_phone = whatsappData.normalized_phone || null;
                            sendError.original_phone = whatsappData.original_phone || recipient.phone;
                            sendError.e164_phone = whatsappData.e164_phone || null;
                            sendError.attempt_count = whatsappData.attempt_count || null;
                            throw sendError;
                        }

                        await logCommunication(base44, {
                            event_type: newStatus,
                            channel: 'whatsapp',
                            recipient_type: normalizeRecipientType(recipient.role),
                            recipient_name: recipient.name,
                            recipient_contact: recipient.phone,
                            body: message,
                            sent_at: new Date().toISOString(),
                            delivery_status: 'sent',
                            provider_message_id: whatsappData.message_id || null,
                            template_id: waTpl?.id || null,
                            language: lang,
                            related_driver_id: trip.driver_id || null,
                            metadata: {
                                trip_number: tripNumber,
                                timeline_url: timelineUrl || null,
                                original_phone: whatsappData.original_phone || recipient.phone,
                                normalized_phone: whatsappData.normalized_phone || null,
                                e164_phone: whatsappData.e164_phone || null,
                                attempt_count: whatsappData.attempt_count || null
                            },
                            ...tripReferences
                        });
                        results.push({ recipient: recipient.phone, type: 'whatsapp', status: 'sent' });
                    } catch (e) {
                        const providerPayload = e?.provider_response || e?.response?.data?.provider_response || null;
                        const providerStatus = e?.provider_status || e?.response?.data?.provider_status || null;
                        const normalizedPhoneForLog = e?.normalized_phone || e?.response?.data?.normalized_phone || null;
                        const originalPhoneForLog = e?.original_phone || e?.response?.data?.original_phone || recipient.phone;
                        const e164PhoneForLog = e?.e164_phone || e?.response?.data?.e164_phone || null;
                        const attemptCount = e?.attempt_count || e?.response?.data?.attempt_count || null;
                        const detailedError = e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Erro ao enviar WhatsApp';
                        console.error(`Erro WhatsApp ${recipient.phone}:`, detailedError);
                        await logCommunication(base44, {
                            event_type: newStatus,
                            channel: 'whatsapp',
                            recipient_type: normalizeRecipientType(recipient.role),
                            recipient_name: recipient.name,
                            recipient_contact: recipient.phone,
                            body: message,
                            sent_at: new Date().toISOString(),
                            delivery_status: 'failed',
                            failure_reason: detailedError,
                            template_id: waTpl?.id || null,
                            language: lang,
                            related_driver_id: trip.driver_id || null,
                            metadata: {
                                trip_number: tripNumber,
                                timeline_url: timelineUrl || null,
                                original_phone: originalPhoneForLog,
                                normalized_phone: normalizedPhoneForLog,
                                e164_phone: e164PhoneForLog,
                                provider_status: providerStatus,
                                provider_response: providerPayload,
                                attempt_count: attemptCount
                            },
                            ...tripReferences
                        });
                        results.push({ recipient: recipient.phone, type: 'whatsapp', status: 'error', error: detailedError });
                    }
                }
            }
        }

        return Response.json({ success: true, results });

    } catch (error) {
        console.error('[sendTripStatusNotification] Erro geral:', error);
        return Response.json({ success: false, error: error.message || 'Erro ao enviar notificações.' }, { status: 500 });
    }
});