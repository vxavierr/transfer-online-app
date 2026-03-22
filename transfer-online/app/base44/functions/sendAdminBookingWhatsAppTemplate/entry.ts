import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function renderTemplate(template, vars) {
  if (!template) return '';
  let result = template.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_match, key, content) => {
    return vars[key] !== undefined && vars[key] !== null && vars[key] !== ''
      ? renderTemplate(content, vars)
      : '';
  });

  result = result.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : '';
  });

  return result;
}

function formatPrice(value) {
  const numericValue = Number(value || 0);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numericValue);
}

const DEFAULT_TEMPLATES = {
  pt: {
    description: 'WhatsApp PT - Nova reserva para gestor',
    body_template: '🆕 *NOVA RESERVA RECEBIDA*\n\n📋 Reserva: *{{trip_number}}*\n👤 Cliente: {{customer_name}}\n📞 Telefone: {{customer_phone}}\n📧 E-mail: {{customer_email}}\n👥 Passageiros: {{passengers}}\n\n📍 *ROTA*\nOrigem: {{origin}}\nDestino: {{destination}}\n📅 Data: {{date}}\n⏰ Horário: {{time}}\n🚘 Veículo: {{vehicle_type_name}}\n💰 Valor: {{total_price}}\n\n{{#notes}}📝 Observações: {{notes}}\n\n{{/notes}}⚠️ Ação necessária: alocar motorista e veículo.'
  },
  en: {
    description: 'WhatsApp EN - New booking for manager',
    body_template: '🆕 *NEW BOOKING RECEIVED*\n\n📋 Booking: *{{trip_number}}*\n👤 Customer: {{customer_name}}\n📞 Phone: {{customer_phone}}\n📧 Email: {{customer_email}}\n👥 Passengers: {{passengers}}\n\n📍 *ROUTE*\nOrigin: {{origin}}\nDestination: {{destination}}\n📅 Date: {{date}}\n⏰ Time: {{time}}\n🚘 Vehicle: {{vehicle_type_name}}\n💰 Amount: {{total_price}}\n\n{{#notes}}📝 Notes: {{notes}}\n\n{{/notes}}⚠️ Action required: assign driver and vehicle.'
  },
  es: {
    description: 'WhatsApp ES - Nueva reserva para gestor',
    body_template: '🆕 *NUEVA RESERVA RECIBIDA*\n\n📋 Reserva: *{{trip_number}}*\n👤 Cliente: {{customer_name}}\n📞 Teléfono: {{customer_phone}}\n📧 Correo: {{customer_email}}\n👥 Pasajeros: {{passengers}}\n\n📍 *RUTA*\nOrigen: {{origin}}\nDestino: {{destination}}\n📅 Fecha: {{date}}\n⏰ Hora: {{time}}\n🚘 Vehículo: {{vehicle_type_name}}\n💰 Valor: {{total_price}}\n\n{{#notes}}📝 Observaciones: {{notes}}\n\n{{/notes}}⚠️ Acción necesaria: asignar conductor y vehículo.'
  }
};

async function getOrCreateTemplate(base44, language) {
  const normalizedLanguage = ['pt', 'en', 'es'].includes(language) ? language : 'pt';
  const templates = await base44.asServiceRole.entities.NotificationTemplate.filter({
    event_type: 'nova_reserva',
    channel: 'whatsapp',
    language: normalizedLanguage
  });

  if (templates.length > 0) {
    return templates[0];
  }

  const fallbackTemplate = DEFAULT_TEMPLATES[normalizedLanguage] || DEFAULT_TEMPLATES.pt;
  return await base44.asServiceRole.entities.NotificationTemplate.create({
    event_type: 'nova_reserva',
    channel: 'whatsapp',
    language: normalizedLanguage,
    subject_template: '',
    body_template: fallbackTemplate.body_template,
    is_enabled: true,
    send_to_driver: false,
    send_to_passenger: false,
    send_to_requester: false,
    send_to_client_contact: false,
    send_to_additional_phones: false,
    description: fallbackTemplate.description
  });
}

async function logCommunication(base44, payload) {
  try {
    await base44.asServiceRole.entities.CommunicationLog.create(payload);
  } catch (error) {
    console.error('[sendAdminBookingWhatsAppTemplate] Falha ao registrar CommunicationLog:', error.message);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { bookingId } = await req.json();

    if (!bookingId) {
      return Response.json({ success: false, error: 'bookingId é obrigatório' }, { status: 400 });
    }

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
    if (!booking) {
      return Response.json({ success: false, error: 'Reserva não encontrada' }, { status: 404 });
    }

    const language = ['pt', 'en', 'es'].includes(booking.driver_language) ? booking.driver_language : 'pt';
    const template = await getOrCreateTemplate(base44, language);

    if (template.is_enabled === false) {
      return Response.json({ success: true, skipped: true, reason: 'template_disabled' });
    }

    const adminConfig = await base44.asServiceRole.entities.AppConfig.filter({ config_key: 'admin_whatsapp_number' }, undefined, 1);
    const adminPhone = adminConfig[0]?.config_value || Deno.env.get('WHATSAPP_ADMIN_NUMBER') || '';

    if (!adminPhone) {
      return Response.json({ success: false, error: 'WhatsApp do gestor não configurado' }, { status: 400 });
    }

    const templateVars = {
      trip_number: booking.booking_number || booking.id,
      customer_name: booking.customer_name || 'Cliente',
      customer_phone: booking.customer_phone || '',
      customer_email: booking.customer_email || '',
      passengers: booking.passengers || 1,
      origin: booking.origin || '',
      destination: booking.destination || '',
      date: booking.date || '',
      time: booking.time || '',
      vehicle_type_name: booking.vehicle_type_name || 'Não informado',
      total_price: formatPrice(booking.total_price),
      notes: booking.notes || ''
    };

    const message = renderTemplate(template.body_template, templateVars);
    if (!message) {
      return Response.json({ success: false, error: 'Template sem conteúdo para envio' }, { status: 400 });
    }

    try {
      const whatsappResponse = await base44.asServiceRole.functions.invoke('sendWhatsAppMessage', {
        to: adminPhone,
        message
      });
      const whatsappData = whatsappResponse?.data || whatsappResponse || {};

      if (whatsappData.success === false) {
        const sendError = new Error(whatsappData.error || 'Falha ao enviar WhatsApp');
        sendError.provider_response = whatsappData.provider_response || null;
        sendError.provider_status = whatsappData.provider_status || null;
        sendError.normalized_phone = whatsappData.normalized_phone || null;
        sendError.original_phone = whatsappData.original_phone || adminPhone;
        sendError.e164_phone = whatsappData.e164_phone || null;
        sendError.attempt_count = whatsappData.attempt_count || null;
        throw sendError;
      }

      await logCommunication(base44, {
        event_type: 'nova_reserva',
        channel: 'whatsapp',
        recipient_type: 'admin',
        recipient_name: 'Gestor',
        recipient_contact: adminPhone,
        body: message,
        sent_at: new Date().toISOString(),
        delivery_status: 'sent',
        template_id: template.id || null,
        language,
        related_booking_id: booking.id,
        metadata: {
          booking_number: booking.booking_number || null,
          source: 'NovaReserva',
          original_phone: whatsappData.original_phone || adminPhone,
          normalized_phone: whatsappData.normalized_phone || null,
          e164_phone: whatsappData.e164_phone || null,
          attempt_count: whatsappData.attempt_count || null
        }
      });
    } catch (error) {
      await logCommunication(base44, {
        event_type: 'nova_reserva',
        channel: 'whatsapp',
        recipient_type: 'admin',
        recipient_name: 'Gestor',
        recipient_contact: adminPhone,
        body: message,
        sent_at: new Date().toISOString(),
        delivery_status: 'failed',
        failure_reason: error.message,
        template_id: template.id || null,
        language,
        related_booking_id: booking.id,
        metadata: {
          booking_number: booking.booking_number || null,
          source: 'NovaReserva',
          original_phone: error?.original_phone || error?.response?.data?.original_phone || adminPhone,
          normalized_phone: error?.normalized_phone || error?.response?.data?.normalized_phone || null,
          e164_phone: error?.e164_phone || error?.response?.data?.e164_phone || null,
          provider_status: error?.provider_status || error?.response?.data?.provider_status || null,
          provider_response: error?.provider_response || error?.response?.data?.provider_response || null,
          attempt_count: error?.attempt_count || error?.response?.data?.attempt_count || null
        }
      });

      throw error;
    }

    return Response.json({ success: true, template_id: template.id || null });
  } catch (error) {
    console.error('[sendAdminBookingWhatsAppTemplate] Erro:', error);
    return Response.json({ success: false, error: error.message || 'Erro ao enviar WhatsApp do gestor' }, { status: 500 });
  }
});