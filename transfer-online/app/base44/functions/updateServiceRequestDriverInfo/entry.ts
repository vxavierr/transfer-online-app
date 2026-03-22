import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const isAdmin = user?.role === 'admin' || user?.email === 'fernandotransferonline@gmail.com';
    const isSupplierUser = !!user?.supplier_id;

    if (!user || (!isAdmin && !isSupplierUser)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      serviceRequestId, 
      driver_id,
      driver_name, 
      driver_phone, 
      driver_email,
      driver_photo_url,
      vehicle_model, 
      vehicle_plate,
      vehicle_color,
      driver_payout_amount,
      driver_notes,
      receptive_performed_by,
      receptive_sign_url,
      receptive_notes,
      is_receptive_needed
    } = body;

    if (!serviceRequestId) {
      return Response.json({ error: 'serviceRequestId is required' }, { status: 400 });
    }

    let request = null;

    if (isAdmin) {
      request = await base44.asServiceRole.entities.ServiceRequest.get(serviceRequestId);
    } else {
      const requests = await base44.asServiceRole.entities.ServiceRequest.filter({
        id: serviceRequestId,
        chosen_supplier_id: user.supplier_id
      });
      request = requests[0] || null;
    }

    if (!request) {
      return Response.json({ error: 'Service request not found or not assigned to your supplier' }, { status: 404 });
    }

    const updateData = {
      driver_name,
      driver_phone,
      driver_email,
      driver_photo_url,
      vehicle_model,
      vehicle_plate,
      vehicle_color,
      driver_info_last_updated_at: new Date().toISOString(),
      driver_reminder_1h_sent_at: null // Resetar lembrete ao atualizar motorista
    };

    // Atualizar driver_id se fornecido
    if (driver_id !== undefined) {
      if (driver_id === 'new' || driver_id === '') {
        updateData.driver_id = null;
      } else {
        updateData.driver_id = driver_id;
      }
    }



    if (!request.driver_access_token) {
      updateData.driver_access_token = crypto.randomUUID();
    }

    if (driver_payout_amount !== undefined && driver_payout_amount !== null && driver_payout_amount !== '') {
      updateData.driver_payout_amount = parseFloat(driver_payout_amount);
    }


    if (is_receptive_needed !== undefined) {
      updateData.is_receptive_needed = is_receptive_needed;
    }

    if (receptive_performed_by) {
      updateData.receptive_performed_by = receptive_performed_by;
    }
    if (receptive_sign_url) {
      updateData.receptive_sign_url = receptive_sign_url;
    }
    if (receptive_notes !== undefined) {
      updateData.receptive_notes = receptive_notes;
    }

    await base44.asServiceRole.entities.ServiceRequest.update(serviceRequestId, updateData);

    // LOG DE HISTÓRICO
    try {
      await base44.asServiceRole.entities.TripHistory.create({
        trip_id: serviceRequestId,
        trip_type: 'ServiceRequest',
        event_type: 'Motorista Atribuído/Alterado',
        user_id: user.id,
        user_name: user.full_name || user.email,
        details: {
          driver_name: driver_name,
          driver_phone: driver_phone,
          vehicle_model: vehicle_model,
          vehicle_plate: vehicle_plate
        },
        comment: `Motorista ${driver_name} atribuído`
      });
    } catch (historyError) {
      console.error('[updateServiceRequestDriverInfo] Erro ao salvar histórico:', historyError);
    }

    return Response.json({ 
      success: true,
      driver_access_token: updateData.driver_access_token || request.driver_access_token
    });
  } catch (error) {
    console.error('[updateServiceRequestDriverInfo] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});