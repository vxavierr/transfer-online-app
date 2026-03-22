import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const data = await req.json();
    
    // Validate required fields
    const requiredFields = ['full_name', 'email', 'phone_number', 'company_name', 'target_audience'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return Response.json({ error: `O campo ${field} é obrigatório.` }, { status: 400 });
      }
    }

    const leadData = {
      ...data,
      source: 'landing_page_demo',
      status: 'new'
    };

    // Create the lead using service role
    const lead = await base44.asServiceRole.entities.LeadRequest.create(leadData);

    // Send welcome email to the lead
    try {
      await base44.integrations.Core.SendEmail({
        to: data.email,
        subject: "Recebemos sua solicitação - TransferOnline",
        body: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .content { text-align: justify; }
  .footer { margin-top: 40px; font-size: 0.9em; color: #555555; border-top: 1px solid #eeeeee; padding-top: 20px; }
</style>
</head>
<body>
<div class="container">
  <p>Olá <strong>${data.full_name}</strong>,</p>
  
  <div class="content">
    <p>Recebemos seu interesse na <strong>TransferOnline</strong>.</p>
    
    <p>Obrigado por querer conhecer nossa plataforma de gestão de transporte corporativo.</p>
    
    <p>Nossa equipe comercial já foi notificada e entrará em contato em breve para entender suas necessidades e agendar sua demonstração personalizada.</p>
    
    <p>Se tiver alguma dúvida urgente, pode responder a este e-mail.</p>
  </div>

  <div class="footer">
    <p>Atenciosamente,<br>
    <strong>Equipe TransferOnline</strong></p>
  </div>
</div>
</body>
</html>`
      });
    } catch (emailError) {
      console.error("Erro ao enviar email de boas-vindas:", emailError);
      // Não falhar a requisição se o email falhar, apenas logar
    }
    
    return Response.json({ success: true, lead_id: lead.id });

  } catch (error) {
    console.error('Error submitting lead:', error);
    return Response.json({ error: error.message || 'Erro interno ao processar solicitação' }, { status: 500 });
  }
});