import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function hasSentCommunication(base44, bookingId, channel, recipientType) {
  const logs = await base44.asServiceRole.entities.CommunicationLog.filter({
    related_booking_id: bookingId,
    channel,
    recipient_type: recipientType,
    delivery_status: 'sent',
  }, '-sent_at', 1);

  return logs.length > 0;
}

async function createCommunication(base44, payload) {
  try {
    await base44.asServiceRole.entities.CommunicationLog.create(payload);
  } catch (error) {
    console.error('[processNovaReservaPaidBooking] Falha ao registrar comunicação:', error.message);
  }
}

async function sendAndLogEmail(base44, booking, recipientType, emailType, recipientContact, metadata = {}) {
  const recipientTypeMap = {
    customer: 'passenger',
    admin: 'admin',
    supplier: 'supplier',
  };

  const communicationRecipientType = recipientTypeMap[recipientType] || 'other';
  const alreadySent = await hasSentCommunication(base44, booking.id, 'email', communicationRecipientType);
  if (alreadySent) {
    return { skipped: true, reason: 'already_sent' };
  }

  try {
    const response = await base44.asServiceRole.functions.invoke('sendBookingEmail', {
      bookingId: booking.id,
      recipientType,
      emailType,
    });
    const result = response?.data || response || {};

    if (result?.message?.toLowerCase?.().includes('pulado')) {
      return { skipped: true, reason: 'not_configured' };
    }

    await createCommunication(base44, {
      event_type: 'nova_reserva',
      channel: 'email',
      recipient_type: communicationRecipientType,
      recipient_name: recipientType === 'customer' ? booking.customer_name : recipientType === 'supplier' ? (metadata.supplier_name || 'Fornecedor') : 'Gestor',
      recipient_contact: recipientContact,
      subject: `${emailType}:${booking.booking_number || booking.id}`,
      body: `Envio automático ${emailType} realizado com sucesso.`,
      sent_at: new Date().toISOString(),
      delivery_status: 'sent',
      related_booking_id: booking.id,
      metadata: {
        booking_number: booking.booking_number || null,
        source: 'NovaReserva',
        email_type: emailType,
        ...metadata,
      },
    });

    return { success: true };
  } catch (error) {
    await createCommunication(base44, {
      event_type: 'nova_reserva',
      channel: 'email',
      recipient_type: communicationRecipientType,
      recipient_name: recipientType === 'customer' ? booking.customer_name : recipientType === 'supplier' ? (metadata.supplier_name || 'Fornecedor') : 'Gestor',
      recipient_contact: recipientContact,
      subject: `${emailType}:${booking.booking_number || booking.id}`,
      body: 'Falha no envio automático.',
      sent_at: new Date().toISOString(),
      delivery_status: 'failed',
      failure_reason: error?.response?.data?.error || error.message || 'Erro ao enviar e-mail',
      related_booking_id: booking.id,
      metadata: {
        booking_number: booking.booking_number || null,
        source: 'NovaReserva',
        email_type: emailType,
        ...metadata,
      },
    });

    return { success: false, error: error?.response?.data?.error || error.message || 'Erro ao enviar e-mail' };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { bookingId, paymentIntentId = null, stripeCheckoutSessionId = null } = await req.json();

    if (!bookingId) {
      return Response.json({ success: false, error: 'bookingId é obrigatório' }, { status: 400 });
    }

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
    if (!booking) {
      return Response.json({ success: false, error: 'Reserva não encontrada' }, { status: 404 });
    }

    let updatedBooking = booking;
    if (
      booking.payment_status !== 'pago' ||
      booking.status !== 'pendente' ||
      (paymentIntentId && booking.payment_intent_id !== paymentIntentId) ||
      (stripeCheckoutSessionId && booking.stripe_checkout_session_id !== stripeCheckoutSessionId)
    ) {
      updatedBooking = await base44.asServiceRole.entities.Booking.update(booking.id, {
        status: 'pendente',
        payment_status: 'pago',
        ...(paymentIntentId ? { payment_intent_id: paymentIntentId } : {}),
        ...(stripeCheckoutSessionId ? { stripe_checkout_session_id: stripeCheckoutSessionId } : {}),
      });
    }

    const notifications = {
      customer_email: null,
      admin_email: null,
      supplier_email: null,
    };

    if (updatedBooking.customer_email) {
      notifications.customer_email = await sendAndLogEmail(
        base44,
        updatedBooking,
        'customer',
        'confirmation',
        updatedBooking.customer_email,
      );
    }

    notifications.admin_email = await sendAndLogEmail(
      base44,
      updatedBooking,
      'admin',
      'new_booking_notification',
      'admin_notification_email',
    );

    if (updatedBooking.supplier_id) {
      try {
        const supplier = await base44.asServiceRole.entities.Supplier.get(updatedBooking.supplier_id);
        if (supplier?.email) {
          notifications.supplier_email = await sendAndLogEmail(
            base44,
            updatedBooking,
            'supplier',
            'new_booking_notification',
            supplier.email,
            { supplier_id: supplier.id, supplier_name: supplier.name || supplier.company_name || 'Fornecedor' },
          );
        }
      } catch (supplierError) {
        console.error('[processNovaReservaPaidBooking] Erro ao notificar fornecedor:', supplierError);
        notifications.supplier_email = { success: false, error: supplierError.message };
      }
    }

    return Response.json({
      success: true,
      booking: {
        id: updatedBooking.id,
        booking_number: updatedBooking.booking_number,
        status: updatedBooking.status,
        payment_status: updatedBooking.payment_status,
      },
      notifications,
    });
  } catch (error) {
    console.error('[processNovaReservaPaidBooking] Error:', error);
    return Response.json({ success: false, error: error.message || 'Erro ao processar notificações da reserva' }, { status: 500 });
  }
});