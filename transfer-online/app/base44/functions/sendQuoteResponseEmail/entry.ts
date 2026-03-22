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

    if (!quoteRequest.admin_quote_price || !quoteRequest.payment_link_url) {
      return Response.json(
        { error: 'Cotação não possui preço ou link de pagamento' },
        { status: 400 }
      );
    }

    // Formatar preço
    const formatPrice = (price) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(price);
    };

    // Preparar detalhes da viagem
    const tripType = quoteRequest.service_type === 'one_way' ? 'Só Ida' : 
                     quoteRequest.service_type === 'round_trip' ? 'Ida e Volta' : 'Por Hora';
    
    const tripDate = new Date(quoteRequest.date).toLocaleDateString('pt-BR');
    const returnInfo = quoteRequest.return_date ? 
      `<br>Retorno: ${new Date(quoteRequest.return_date).toLocaleDateString('pt-BR')} às ${quoteRequest.return_time}` : '';
    
    const hoursInfo = quoteRequest.hours ? `<br>Duração: ${quoteRequest.hours} horas` : '';

    // E-mail para o cliente
    const customerEmailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
              ✅ Sua Cotação Está Pronta!
            </h2>
            
            <p>Olá, <strong>${quoteRequest.customer_name}</strong>!</p>

            <p style="font-size: 16px; color: #666;">
              Temos o prazer de informar que sua cotação foi processada. Confira os detalhes abaixo:
            </p>

            <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e40af;">Número da Cotação:</h3>
              <p style="font-size: 24px; font-weight: bold; color: #2563eb; margin: 5px 0;">
                ${quoteRequest.quote_number}
              </p>
            </div>

            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0; color: #047857;">Valor da Cotação:</h3>
              <p style="font-size: 32px; font-weight: bold; color: #10b981; margin: 10px 0;">
                ${formatPrice(quoteRequest.admin_quote_price)}
              </p>
            </div>

            <h3 style="color: #1f2937; margin-top: 25px;">Detalhes da Viagem:</h3>
            <ul style="list-style: none; padding-left: 0; background-color: #f9fafb; padding: 15px; border-radius: 8px;">
              <li><strong>Tipo:</strong> ${tripType}</li>
              <li><strong>Veículo:</strong> ${quoteRequest.vehicle_type_name}</li>
              <li><strong>Origem:</strong> ${quoteRequest.origin}</li>
              <li><strong>Destino:</strong> ${quoteRequest.destination}</li>
              <li><strong>Data:</strong> ${tripDate} às ${quoteRequest.time}</li>
              ${returnInfo}
              ${hoursInfo}
              <li><strong>Passageiros:</strong> ${quoteRequest.passengers}</li>
              ${quoteRequest.distance_km > 0 ? `<li><strong>Distância Total:</strong> ${quoteRequest.distance_km} km</li>` : ''}
            </ul>

            ${quoteRequest.admin_notes ? `
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h3 style="margin-top: 0; color: #92400e;">Observações:</h3>
                <p style="color: #78350f; margin: 0;">
                  ${quoteRequest.admin_notes}
                </p>
              </div>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${quoteRequest.payment_link_url}" 
                 style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
                        color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; 
                        font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                💳 Confirmar e Pagar
              </a>
            </div>

            <p style="font-size: 14px; color: #666; text-align: center;">
              Ao clicar no botão acima, você será redirecionado para uma página segura de pagamento.
            </p>

            <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
              <p style="margin: 0; font-size: 14px; color: #0c4a6e;">
                <strong>ℹ️ Importante:</strong> Este link de pagamento é exclusivo para esta cotação e pode ser usado a qualquer momento.
              </p>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 25px;">
              Caso tenha alguma dúvida, não hesite em entrar em contato conosco.
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
            subject: `✅ Cotação Pronta - ${quoteRequest.quote_number} - ${formatPrice(quoteRequest.admin_quote_price)}`,
            html: customerEmailBody
        });
    } else {
        await base44.asServiceRole.integrations.Core.SendEmail({
            to: quoteRequest.customer_email,
            subject: `✅ Cotação Pronta - ${quoteRequest.quote_number} - ${formatPrice(quoteRequest.admin_quote_price)}`,
            body: customerEmailBody
        });
    }

    // NOVO: Enviar WhatsApp após e-mail
    try {
      console.log("Tentando enviar WhatsApp para cliente...");
      await base44.asServiceRole.functions.invoke('sendWhatsAppQuoteNotification', {
        quoteRequestId: quoteRequestId,
        recipientType: 'customer',
        notificationType: 'quote_ready'
      });
      console.log("WhatsApp enviado para cliente com sucesso!");
    } catch (whatsappError) {
      console.error('Erro ao enviar WhatsApp para cliente (não crítico):', whatsappError);
    }

    return Response.json({
      success: true,
      message: 'E-mail e WhatsApp enviados com sucesso'
    });

  } catch (error) {
    console.error('Erro ao enviar notificações:', error);
    return Response.json(
      { error: error.message || 'Erro ao enviar notificações' },
      { status: 500 }
    );
  }
});