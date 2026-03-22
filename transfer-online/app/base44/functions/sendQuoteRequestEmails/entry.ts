import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { Resend } from 'npm:resend';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const { quoteRequestId } = body;

    if (!quoteRequestId) {
      return Response.json(
        { error: 'ID da cotação é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar dados da cotação
    const quoteRequests = await base44.asServiceRole.entities.QuoteRequest.list();
    const quoteRequest = quoteRequests.find(q => q.id === quoteRequestId);

    if (!quoteRequest) {
      return Response.json(
        { error: 'Cotação não encontrada' },
        { status: 404 }
      );
    }

    // Buscar e-mail do admin
    const configs = await base44.asServiceRole.entities.AppConfig.filter({ config_key: 'admin_notification_email' });
    const adminEmail = configs.length > 0 ? configs[0].config_value : null;

    // Preparar detalhes da viagem
    const tripType = quoteRequest.service_type === 'one_way' ? 'Só Ida' : 
                     quoteRequest.service_type === 'round_trip' ? 'Ida e Volta' : 'Por Hora';
    
    const tripDate = new Date(quoteRequest.date).toLocaleDateString('pt-BR');
    const returnInfo = quoteRequest.return_date ? 
      `<br>Retorno: ${new Date(quoteRequest.return_date).toLocaleDateString('pt-BR')} às ${quoteRequest.return_time}` : '';
    
    const hoursInfo = quoteRequest.hours ? `<br>Duração: ${quoteRequest.hours} horas` : '';

    // E-mail para o administrador (se configurado)
    if (adminEmail) {
      const adminEmailBody = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
              <h2 style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 10px;">
                🔔 Nova Solicitação de Cotação
              </h2>
              
              <p style="font-size: 16px; color: #666;">
                Uma nova solicitação de cotação foi recebida e aguarda sua análise.
              </p>

              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1f2937;">Número da Cotação:</h3>
                <p style="font-size: 24px; font-weight: bold; color: #f97316; margin: 5px 0;">
                  ${quoteRequest.quote_number}
                </p>
              </div>

              <h3 style="color: #1f2937; margin-top: 25px;">Detalhes da Viagem:</h3>
              <ul style="list-style: none; padding-left: 0;">
                <li><strong>Tipo:</strong> ${tripType}</li>
                <li><strong>Veículo:</strong> ${quoteRequest.vehicle_type_name}</li>
                <li><strong>Idioma Motorista:</strong> ${quoteRequest.driver_language === 'pt' ? 'Português' : quoteRequest.driver_language === 'en' ? 'English' : 'Español'}</li>
                <li><strong>Origem:</strong> ${quoteRequest.origin}</li>
                <li><strong>Destino:</strong> ${quoteRequest.destination}</li>
                <li><strong>Data:</strong> ${tripDate} às ${quoteRequest.time}</li>
                ${returnInfo}
                ${hoursInfo}
                <li><strong>Passageiros:</strong> ${quoteRequest.passengers}</li>
                ${quoteRequest.distance_km > 0 ? `<li><strong>Distância Total:</strong> ${quoteRequest.distance_km} km</li>` : ''}
              </ul>

              <h3 style="color: #1f2937; margin-top: 25px;">Dados do Cliente:</h3>
              <ul style="list-style: none; padding-left: 0;">
                <li><strong>Nome:</strong> ${quoteRequest.customer_name}</li>
                <li><strong>E-mail:</strong> ${quoteRequest.customer_email}</li>
                ${quoteRequest.customer_phone ? `<li><strong>Telefone:</strong> ${quoteRequest.customer_phone}</li>` : ''}
              </ul>

              ${quoteRequest.notes ? `
                <h3 style="color: #1f2937; margin-top: 25px;">Observações:</h3>
                <p style="background-color: #fef3c7; padding: 10px; border-radius: 5px; border-left: 4px solid #f59e0b;">
                  ${quoteRequest.notes}
                </p>
              ` : ''}

              <div style="margin-top: 30px; text-align: center;">
                <p style="font-size: 14px; color: #666;">
                  Acesse o painel administrativo para responder a esta cotação.
                </p>
              </div>

              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #999;">
                <p>TransferOnline - Sistema de Reservas</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          const fromAddress = Deno.env.get('RESEND_FROM') || 'TransferOnline <nao-responda@enviotransferonline.com.br>';
          
          await resend.emails.send({
              from: fromAddress,
              to: [adminEmail],
              subject: `🔔 Nova Solicitação de Cotação - ${quoteRequest.quote_number}`,
              html: adminEmailBody
          });
      } else {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: adminEmail,
            subject: `🔔 Nova Solicitação de Cotação - ${quoteRequest.quote_number}`,
            body: adminEmailBody
          });
      }
    }

    // E-mail para o cliente
    const customerEmailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
              ✅ Solicitação de Cotação Recebida
            </h2>
            
            <p>Olá, <strong>${quoteRequest.customer_name}</strong>!</p>

            <p style="font-size: 16px; color: #666;">
              Recebemos sua solicitação de cotação e nossa equipe já está analisando os detalhes da sua viagem.
            </p>

            <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e40af;">Número da Cotação:</h3>
              <p style="font-size: 24px; font-weight: bold; color: #2563eb; margin: 5px 0;">
                ${quoteRequest.quote_number}
              </p>
              <p style="font-size: 14px; color: #64748b; margin: 5px 0;">
                Guarde este número para acompanhar sua cotação
              </p>
            </div>

            <h3 style="color: #1f2937; margin-top: 25px;">Resumo da Viagem:</h3>
            <ul style="list-style: none; padding-left: 0; background-color: #f9fafb; padding: 15px; border-radius: 8px;">
              <li><strong>Tipo:</strong> ${tripType}</li>
              <li><strong>Veículo:</strong> ${quoteRequest.vehicle_type_name}</li>
              <li><strong>Origem:</strong> ${quoteRequest.origin}</li>
              <li><strong>Destino:</strong> ${quoteRequest.destination}</li>
              <li><strong>Data:</strong> ${tripDate} às ${quoteRequest.time}</li>
              ${returnInfo}
              ${hoursInfo}
            </ul>

            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 25px 0;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>⏱️ Em breve:</strong> Você receberá um e-mail com a cotação detalhada e o link para pagamento, caso deseje confirmar a reserva.
              </p>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 25px;">
              Se tiver alguma dúvida, não hesite em entrar em contato conosco.
            </p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #999;">
              <p>TransferOnline - Sistema de Reservas</p>
              <p>Obrigado por escolher nossos serviços!</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        const fromAddress = Deno.env.get('RESEND_FROM') || 'TransferOnline <nao-responda@enviotransferonline.com.br>';
        
        await resend.emails.send({
            from: fromAddress,
            to: [quoteRequest.customer_email],
            subject: `✅ Solicitação Recebida - ${quoteRequest.quote_number}`,
            html: customerEmailBody
        });
    } else {
        await base44.asServiceRole.integrations.Core.SendEmail({
            to: quoteRequest.customer_email,
            subject: `✅ Solicitação Recebida - ${quoteRequest.quote_number}`,
            body: customerEmailBody
        });
    }

    // Enviar WhatsApp para cliente
    try {
      console.log("Tentando enviar WhatsApp para cliente...");
      await base44.asServiceRole.functions.invoke('sendWhatsAppQuoteNotification', {
        quoteRequestId: quoteRequestId,
        recipientType: 'customer',
        notificationType: 'new_request'
      });
      console.log("WhatsApp enviado para cliente com sucesso!");
    } catch (whatsappError) {
      console.error('Erro ao enviar WhatsApp para cliente (não crítico):', whatsappError);
    }

    // Enviar WhatsApp para admin (INDEPENDENTE do email estar configurado)
    try {
      console.log("Tentando enviar WhatsApp para admin...");
      await base44.asServiceRole.functions.invoke('sendWhatsAppQuoteNotification', {
        quoteRequestId: quoteRequestId,
        recipientType: 'admin',
        notificationType: 'new_request'
      });
      console.log("WhatsApp enviado para admin com sucesso!");
    } catch (whatsappError) {
      console.error('Erro ao enviar WhatsApp para admin (não crítico):', whatsappError);
    }

    return Response.json({
      success: true,
      message: 'E-mails e WhatsApp enviados com sucesso'
    });

  } catch (error) {
    console.error('Erro ao enviar notificações:', error);
    return Response.json(
      { error: error.message || 'Erro ao enviar notificações' },
      { status: 500 }
    );
  }
});