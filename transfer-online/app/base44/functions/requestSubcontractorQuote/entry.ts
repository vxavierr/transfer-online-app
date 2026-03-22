import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || !user.supplier_id) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { tripId, tripType, subcontractorId } = await req.json();

        if (!tripId || !tripType || !subcontractorId) {
            return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Buscar detalhes da viagem (Trip) PRIMEIRO para usar na lógica de resend
        let trip;
        if (tripType === 'own') {
            trip = await base44.entities.SupplierOwnBooking.get(tripId);
        } else {
            trip = await base44.entities.ServiceRequest.get(tripId);
        }

        if (!trip) {
             console.error(`[requestSubcontractorQuote] Viagem não encontrada: ID ${tripId}, Tipo ${tripType}`);
             return Response.json({ success: false, error: 'Viagem não encontrada' }, { status: 404 });
        }

        // 2. Verificar se o fornecedor pode subcontratar
        const supplier = await base44.entities.Supplier.get(user.supplier_id);
        if (!supplier.features?.can_subcontract) {
             return Response.json({ success: false, error: 'Funcionalidade de subcontratação não habilitada.' }, { status: 403 });
        }

        // 3. Gerar ou reutilizar token
        let token;
        const now = new Date().toISOString();
        let isResend = false;

        if (trip.subcontractor_id === subcontractorId && trip.subcontractor_response_token) {
            token = trip.subcontractor_response_token;
            isResend = true;
            console.log(`[requestSubcontractorQuote] Reenviando solicitação para viagem ${tripId} (Token reutilizado)`);
            
            // Apenas atualiza o timestamp de envio
            const updateData = {
                subcontractor_request_sent_at: now
            };
            if (tripType === 'own') {
                await base44.entities.SupplierOwnBooking.update(tripId, updateData);
            } else {
                await base44.entities.ServiceRequest.update(tripId, updateData);
            }
        } else {
            console.log(`[requestSubcontractorQuote] Nova solicitação para viagem ${tripId}`);
            token = crypto.randomUUID();
            const updateData = {
                subcontractor_id: subcontractorId,
                subcontractor_response_token: token,
                subcontractor_request_sent_at: now,
                subcontractor_payment_status: 'pendente'
            };
            if (tripType === 'own') {
                await base44.entities.SupplierOwnBooking.update(tripId, updateData);
            } else {
                await base44.entities.ServiceRequest.update(tripId, updateData);
            }
        }

        // 4. Buscar dados do subcontratado
        const subcontractor = await base44.entities.Subcontractor.get(subcontractorId);
        if (!subcontractor) {
             console.error(`[requestSubcontractorQuote] Parceiro não encontrado: ID ${subcontractorId}`);
             return Response.json({ success: false, error: 'Parceiro não encontrado' }, { status: 404 });
        }
        
        // 5. Gerar URL pública
        const origin = req.headers.get('origin') || 'https://app.transferonline.com';
        const quoteUrl = `${origin}/SubcontractorQuoteResponse?token=${token}`;

        let notificationStatus = { email: false, whatsapp: false };

        // 6. Enviar E-mail
        if (subcontractor.email) {
            try {
                // Formatar data para exibição
                const formattedDate = trip.date ? trip.date.split('-').reverse().join('/') : trip.date;

                const emailBody = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff; }
  .header { margin-bottom: 25px; text-align: center; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px; }
  .logo { max-height: 60px; margin-bottom: 10px; }
  .badge { background-color: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.9em; display: inline-block; margin-bottom: 10px; }
  .content { margin-bottom: 25px; }
  .details-box { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #2563eb; }
  .details-item { margin-bottom: 10px; font-size: 15px; }
  .details-label { font-weight: 600; color: #555; width: 80px; display: inline-block; }
  .btn-container { text-align: center; margin: 30px 0; }
  .btn { display: inline-block; padding: 14px 28px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2); transition: background-color 0.2s; }
  .btn:hover { background-color: #1d4ed8; }
  .footer { margin-top: 30px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 20px; text-align: center; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${supplier.logo_url ? `<img src="${supplier.logo_url}" alt="${supplier.name}" class="logo"><br>` : ''}
      <h2 style="color: #1a202c; margin: 0;">Solicitação de Cotação</h2>
      <p style="color: #718096; margin: 5px 0 0;">${supplier.name}</p>
    </div>

    <div class="content">
      <p>Olá <strong>${subcontractor.contact_name || subcontractor.name}</strong>,</p>
      
      ${isResend ? '<div style="text-align: center;"><span class="badge">⚠️ LEMBRETE DE SOLICITAÇÃO</span></div>' : ''}
      
      <p>Você recebeu uma nova oportunidade de viagem. Por favor, verifique os detalhes abaixo e informe sua disponibilidade e preço.</p>

      <div class="details-box">
        <div class="details-item"><span class="details-label">📅 Data:</span> <strong>${formattedDate}</strong> às <strong>${trip.time}</strong></div>
        <div class="details-item"><span class="details-label">📍 Origem:</span> ${trip.origin}</div>
        <div class="details-item"><span class="details-label">🏁 Destino:</span> ${trip.destination}</div>
        <div class="details-item"><span class="details-label">🚗 Veículo:</span> ${trip.vehicle_type_name || 'Padrão'}</div>
      </div>

      <div class="btn-container">
        <a href="${quoteUrl}" class="btn">RESPONDER COTAÇÃO</a>
      </div>
      
      <p style="font-size: 13px; text-align: center; color: #666;">
        Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br>
        <a href="${quoteUrl}" style="color: #2563eb;">${quoteUrl}</a>
      </p>
    </div>

    <div class="footer">
      <p>Este é um e-mail automático enviado pela plataforma <strong>TransferOnline</strong> em nome de ${supplier.name}.</p>
      <p>&copy; ${new Date().getFullYear()} TransferOnline. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
                `;

                console.log(`[requestSubcontractorQuote] Enviando Email para ${subcontractor.email}`);
                await base44.integrations.Core.SendEmail({
                    to: subcontractor.email,
                    subject: `${isResend ? 'LEMBRETE: ' : ''}Cotação de Viagem - ${supplier.name}`,
                    body: emailBody
                });
                notificationStatus.email = true;
            } catch (emailErr) {
                console.error('[requestSubcontractorQuote] Erro ao enviar email:', emailErr);
            }
        } else {
            console.log('[requestSubcontractorQuote] Parceiro sem email cadastrado.');
        }

        // 7. Enviar WhatsApp (se disponível)
        if (subcontractor.phone_number) {
            try {
                const whatsappMessage = `🚗 *${isResend ? 'LEMBRETE: ' : ''}Cotação de Viagem*\n\nOlá ${subcontractor.contact_name || subcontractor.name},\n\n${supplier.name} solicitou uma cotação:\n\n📅 Data: ${trip.date} às ${trip.time}\n📍 Rota: ${trip.origin} -> ${trip.destination}\n\nResponda aqui: ${quoteUrl}`;
                
                console.log(`[requestSubcontractorQuote] Enviando WhatsApp para ${subcontractor.phone_number}`);
                const waRes = await base44.functions.invoke('sendWhatsAppMessage', {
                    to: subcontractor.phone_number,
                    message: whatsappMessage
                });
                
                if (waRes && waRes.data && waRes.data.success) {
                    notificationStatus.whatsapp = true;
                } else {
                    console.error('[requestSubcontractorQuote] Falha no envio do WhatsApp (Response):', waRes?.data);
                }
            } catch (waErr) {
                console.error('[requestSubcontractorQuote] Erro ao enviar WhatsApp:', waErr);
            }
        } else {
            console.log('[requestSubcontractorQuote] Parceiro sem telefone cadastrado.');
        }
        
        return Response.json({ 
            success: true, 
            quoteUrl,
            message: isResend ? `Solicitação reenviada para ${subcontractor.name}` : `Solicitação gerada para ${subcontractor.name}`,
            notifications: notificationStatus,
            isResend
        });

    } catch (error) {
        console.error('[requestSubcontractorQuote] Erro Geral:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});