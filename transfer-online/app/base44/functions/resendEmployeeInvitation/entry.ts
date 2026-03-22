import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { Resend } from 'npm:resend';

Deno.serve(async (req) => {
  try {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { invitationId, origin: bodyOrigin } = body;
    
    if (!invitationId) {
      return Response.json({ error: 'Invitation ID required' }, { status: 400 });
    }

    const invitation = await base44.asServiceRole.entities.EmployeeInvitation.get(invitationId);
    
    if (!invitation) {
      return Response.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Security check
    if (user.role !== 'admin') {
      if (invitation.requester_type === 'supplier' && invitation.supplier_id !== user.supplier_id) {
         return Response.json({ error: 'Forbidden: Not your invitation' }, { status: 403 });
      }
      if (invitation.requester_type === 'client' && invitation.client_id !== user.client_id) {
         return Response.json({ error: 'Forbidden: Not your invitation' }, { status: 403 });
      }
    }

    const origin = bodyOrigin || 'https://app.base44.com';
    const inviteLink = `${origin}/AceitarConvite?id=${invitation.id}`;

    let emailSent = false;
    let whatsappSent = false;
    let warning = null;
    let errorDetails = null;

    // 1. Tentar enviar por WhatsApp (Prioridade conforme Opção 3)
    if (invitation.phone_number) {
        try {
            const whatsappMessage = `Olá ${invitation.full_name}, você foi convidado para o TransferOnline como *${invitation.desired_role === 'driver' ? 'Motorista' : invitation.desired_role}*.\n\nClique para aceitar e criar sua senha:\n${inviteLink}`;
            
            // Chamando a nova função de WhatsApp
            // Nota: Como estamos dentro de uma função, podemos chamar outra via HTTP ou usar a lógica aqui. 
            // Para manter limpo, vou invocar a função que acabei de criar via SDK, mas para garantir performance e evitar loops,
            // vou replicar a chamada da Evolution API aqui ou chamar a função via fetch localhost se fosse possível,
            // mas o jeito correto no Base44 SDK é base44.functions.invoke se quisermos usar a abstração.
            // PORÉM, para garantir que funcione sem depender de outra função deployada/ativa no mesmo instante, 
            // vou fazer a chamada da Evolution API diretamente aqui para máxima robustez neste fix.
            
            const instanceName = Deno.env.get("EVOLUTION_INSTANCE_NAME");
            const apiKey = Deno.env.get("EVOLUTION_API_KEY");
            let apiUrl = Deno.env.get("EVOLUTION_API_URL");

            if (instanceName && apiKey && apiUrl) {
                // Ensure protocol
                if (!apiUrl.startsWith('http')) {
                    apiUrl = 'https://' + apiUrl;
                }
                // Remove trailing slash from API URL if present
                if (apiUrl.endsWith('/')) {
                    apiUrl = apiUrl.slice(0, -1);
                }

                let cleanPhone = invitation.phone_number.replace(/\D/g, '');
                // Se não tiver código do país (assumindo BR se tiver 10 ou 11 dígitos)
                if (cleanPhone.length === 10 || cleanPhone.length === 11) {
                    cleanPhone = '55' + cleanPhone;
                }

                const evolutionUrl = `${apiUrl}/message/sendText/${instanceName}`;
                
                console.log(`Sending WhatsApp to ${cleanPhone} via ${evolutionUrl}`);

                try {
                    const response = await fetch(evolutionUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                        body: JSON.stringify({
                            number: cleanPhone,
                            options: { delay: 1200, linkPreview: true },
                            textMessage: { text: whatsappMessage }
                        })
                    });

                    if (response.ok) {
                        whatsappSent = true;
                    } else {
                        const errorText = await response.text();
                        console.error("WhatsApp send failed:", errorText);
                        let errorDetail = errorText;
                        try {
                             const jsonError = JSON.parse(errorText);
                             errorDetail = jsonError.message || jsonError.error || errorText;
                        } catch (e) {}
                        warning = `Erro API: ${response.status} - ${errorDetail.substring(0, 100)}`;
                    }
                } catch (fetchError) {
                    console.error("Fetch Error:", fetchError);
                    warning = `Erro Conexão: ${fetchError.message}`;
                }
            } else {
                warning = "Secrets incompletos (EVOLUTION_...)";
            }
        } catch (waError) {
            console.error("WhatsApp Error:", waError);
            warning = (warning || "") + "Erro no envio do WhatsApp. ";
        }
    } else {
        warning = "Telefone não cadastrado para envio de WhatsApp. ";
    }

    // 2. Tentar enviar por E-mail (Fallback/Complemento)
    try {
      const emailSubject = 'Convite para TransferOnline';
      const emailBody = `Olá ${invitation.full_name},\n\nVocê foi convidado para participar da plataforma TransferOnline.\n\nLink de acesso: ${inviteLink}\n\nAtenciosamente,\nEquipe TransferOnline`;
      
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          const fromAddress = Deno.env.get('RESEND_FROM') || 'TransferOnline <nao-responda@enviotransferonline.com.br>';
          
          await resend.emails.send({
              from: fromAddress,
              to: [invitation.email],
              subject: emailSubject,
              text: emailBody
          });
      } else {
          await base44.integrations.Core.SendEmail({
            to: invitation.email,
            subject: emailSubject,
            body: emailBody
          });
      }
      emailSent = true;
    } catch (emailError) {
      console.error("SendEmail Error:", emailError.message);
      if (emailError.message.includes("Cannot send emails")) {
         if (!whatsappSent) warning = (warning || "") + "E-mail bloqueado em dev. ";
      }
    }

    // Se nenhum dos dois foi enviado, retornamos erro
    if (!whatsappSent && !emailSent) {
        return Response.json({ 
            error: `Falha no envio. WhatsApp: ${warning || 'N/A'}. Email: Bloqueado/Erro. Link gerado: ${inviteLink}`,
            inviteLink // Retornamos o link mesmo no erro para permitir cópia manual se o frontend tratar
        }, { status: 500 });
    }

    // Atualizar status se aprovado
    if (invitation.status === 'aprovado') {
        try {
            await base44.asServiceRole.entities.EmployeeInvitation.update(invitation.id, {
                status: 'convite_enviado'
            });
        } catch (updateError) {
            console.error("Status Update Error:", updateError);
        }
    }

    return Response.json({ 
        success: true, 
        whatsappSent, 
        emailSent, 
        warning, 
        inviteLink,
        message: whatsappSent ? "Convite enviado via WhatsApp!" : "Convite enviado via E-mail."
    });

  } catch (error) {
    console.error('Function Error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});