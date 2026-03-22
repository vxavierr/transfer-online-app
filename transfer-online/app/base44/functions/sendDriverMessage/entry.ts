import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authentication can be skipped if this is an internal call (service role)
    // But good practice to check if it's being called from valid context if public
    // For now, we assume this function is called by other backend functions using service role or admin user
    
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { 
        driverId, 
        driverPhone, 
        title, 
        message, 
        type = 'info', 
        relatedEntityId, 
        relatedEntityType,
        sendWhatsApp = true 
    } = body;

    console.log(`[sendDriverMessage] Request received for DriverID: ${driverId}, Phone: ${driverPhone}, WhatsApp: ${sendWhatsApp}`);

    if (!driverId || !title || !message) {
      console.error('[sendDriverMessage] Missing required fields');
      return Response.json({ error: 'Missing required fields: driverId, title, message' }, { status: 400 });
    }

    // 1. Save In-App Message
    let messageRecord;
    try {
      messageRecord = await base44.asServiceRole.entities.DriverMessage.create({
          driver_id: driverId,
          title,
          message,
          type,
          related_entity_id: relatedEntityId,
          related_entity_type: relatedEntityType,
          is_read: false,
          sent_via_whatsapp: false,
          whatsapp_status: 'pending'
      });
      console.log(`[sendDriverMessage] In-App message created with ID: ${messageRecord.id}`);
    } catch (dbError) {
      console.error('[sendDriverMessage] Database Error:', dbError);
      return Response.json({ error: 'Failed to create message in database: ' + dbError.message }, { status: 500 });
    }

    let whatsappResult = { success: false, status: 'skipped' };

    // 2. Send Push Notification (Always attempt if user has subscription)
    try {
      // Logic to find user_id from driver_id
      // We need to fetch the User who is this driver.
      // User entity has driver_id field.
      // So we filter Users by driver_id.
      
      const users = await base44.asServiceRole.entities.User.filter({ driver_id: driverId });
      if (users.length > 0) {
         const targetUserId = users[0].id;
         const pushResult = await base44.functions.invoke('sendPushNotification', {
            userId: targetUserId,
            title: title || 'Nova Mensagem',
            message: message || 'Você recebeu uma nova mensagem',
            data: { 
                url: '/DashboardMotorista?tab=messages',
                messageId: messageRecord.id
            }
         });
         console.log('[sendDriverMessage] Push notification result:', pushResult);
      } else {
         console.warn(`[sendDriverMessage] No user found for driver_id ${driverId} to send push.`);
      }
    } catch (pushError) {
      console.error('[sendDriverMessage] Failed to send push:', pushError);
    }

    // 3. Send WhatsApp if requested and phone provided
    if (sendWhatsApp) {
    if (!driverPhone) {
        console.warn('[sendDriverMessage] WhatsApp requested but no phone number provided.');
        whatsappResult = { success: false, status: 'skipped_no_phone' };
    } else {
        console.log('[sendDriverMessage] Attempting to send WhatsApp...');
        const instanceId = Deno.env.get("EVOLUTION_INSTANCE_NAME");
        const token = Deno.env.get("EVOLUTION_API_KEY");
        const apiUrl = Deno.env.get("EVOLUTION_API_URL");
        const clientToken = Deno.env.get("EVOLUTION_CLIENT_TOKEN");

        if (instanceId && token && apiUrl) {
            console.log(`[sendDriverMessage] WhatsApp config found. URL: ${apiUrl}, Instance: ${instanceId}`);

            // Robust URL construction
            let baseUrl = apiUrl.trim();
            while(baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
            try {
                const urlObj = new URL(baseUrl);
                baseUrl = `${urlObj.protocol}//${urlObj.host}`;
            } catch (e) {
                console.warn("Invalid API URL format", e);
            }

            let cleanPhone = driverPhone.replace(/\D/g, '');
            // Ensure Brazil country code if missing
            if (cleanPhone.length === 10 || cleanPhone.length === 11) {
                cleanPhone = '55' + cleanPhone;
            }

            console.log('[sendDriverMessage] Sending to phone:', cleanPhone);

            const fullMessage = `*${title}*\n\n${message}`;

            try {
                const zApiUrl = `${baseUrl}/instances/${instanceId}/token/${token}/send-text`;
                const headers = { 'Content-Type': 'application/json' };
                if (clientToken) headers['Client-Token'] = clientToken;

                const response = await fetch(zApiUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        phone: cleanPhone,
                        message: fullMessage
                    })
                });

                    if (response.ok) {
                        const responseData = await response.clone().json().catch(() => ({}));
                        console.log('[sendDriverMessage] WhatsApp Sent OK. Provider response:', JSON.stringify(responseData));
                        
                        whatsappResult = { success: true, status: 'sent', details: responseData };
                        
                        // Update message record
                        await base44.asServiceRole.entities.DriverMessage.update(messageRecord.id, {
                            sent_via_whatsapp: true,
                            whatsapp_status: 'sent'
                        });
                    } else {
                        const errText = await response.text();
                        console.error("WhatsApp Error Response:", errText);
                        whatsappResult = { success: false, status: 'failed', error: errText };
                        await base44.asServiceRole.entities.DriverMessage.update(messageRecord.id, {
                            whatsapp_status: 'failed'
                        });
                    }
                } catch (err) {
                    console.error("WhatsApp Exception:", err);
                    whatsappResult = { success: false, status: 'error', error: err.message };
                    await base44.asServiceRole.entities.DriverMessage.update(messageRecord.id, {
                        whatsapp_status: 'error'
                    });
                }
            } else {
                console.error('[sendDriverMessage] WhatsApp config MISSING in environment variables');
                whatsappResult = { success: false, status: 'config_missing' };
            }
      }
    }

    return Response.json({ 
        success: true, 
        messageId: messageRecord.id,
        whatsapp: whatsappResult
    });

  } catch (error) {
    console.error('sendDriverMessage Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});