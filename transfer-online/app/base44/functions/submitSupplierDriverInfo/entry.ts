import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const requestBody = await req.json();
    const { bookingId, token, driverName, driverPhone, vehicleModel, vehiclePlate, vehicleColor } = requestBody;

    console.log("submitSupplierDriverInfo chamado com:", { bookingId, token });

    if (!bookingId || !token || !driverName || !driverPhone || !vehicleModel || !vehiclePlate || !vehicleColor) {
      return Response.json(
        { success: false, error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar reserva com service role
    const bookings = await base44.asServiceRole.entities.Booking.list();
    const booking = bookings.find(b => b.id === bookingId && b.supplier_driver_info_token === token);

    if (!booking) {
      return Response.json(
        { success: false, error: 'Reserva não encontrada ou token inválido' },
        { status: 404 }
      );
    }

    // Atualizar reserva com dados do motorista
    await base44.asServiceRole.entities.Booking.update(bookingId, {
      driver_name: driverName,
      driver_phone: driverPhone,
      vehicle_model: vehicleModel,
      vehicle_plate: vehiclePlate.toUpperCase(),
      vehicle_color: vehicleColor,
      driver_reminder_1h_sent_at: null // Resetar lembrete ao atualizar dados do motorista
    });

    // Notificar admin
    try {
      const configs = await base44.asServiceRole.entities.AppConfig.list();
      const adminWhatsAppConfig = configs.find(c => c.config_key === 'admin_whatsapp_number');
      
      if (adminWhatsAppConfig?.config_value) {
        const suppliers = await base44.asServiceRole.entities.Supplier.list();
        const supplierData = suppliers.find(p => p.id === booking.supplier_id);

        const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
        const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
        const evolutionInstanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');

        if (evolutionApiUrl && evolutionApiKey && evolutionInstanceName) {
          const adminPhone = adminWhatsAppConfig.config_value.replace(/\D/g, '');

          const message = `🚗 *FORNECEDOR ENVIOU DADOS DO MOTORISTA*\n\n` +
            `Reserva: *${booking.booking_number}*\n` +
            `Fornecedor: *${supplierData?.name || 'N/A'}*\n\n` +
            `👨‍✈️ *Motorista:* ${driverName}\n` +
            `📱 *Telefone:* ${driverPhone}\n` +
            `🚙 *Veículo:* ${vehicleModel} (${vehicleColor})\n` +
            `🔢 *Placa:* ${vehiclePlate}\n\n` +
            `Você pode revisar e compartilhar com o cliente no painel.`;

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
      message: 'Informações do motorista registradas com sucesso'
    });

  } catch (error) {
    console.error('Erro ao processar dados do motorista:', error);
    return Response.json(
      { success: false, error: error.message || 'Erro ao processar informações' },
      { status: 500 }
    );
  }
});