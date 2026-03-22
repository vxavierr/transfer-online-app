import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticação Admin
    const user = await base44.auth.me();
    const isAdmin = user?.role === 'admin' || user?.email === 'fernandotransferonline@gmail.com';
    if (!isAdmin) {
       return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const checkedAt = new Date().toISOString();
    const zApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const zApiToken = Deno.env.get("EVOLUTION_API_KEY");
    const zApiInstance = Deno.env.get("EVOLUTION_INSTANCE_NAME");
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const resendFrom = Deno.env.get("RESEND_FROM");
    const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    const [cronResult] = await Promise.all([
      (async () => {
        try {
          const configs = await base44.asServiceRole.entities.AppConfig.filter(
            { config_key: 'last_reminder_check' },
            undefined,
            1
          );

          if (!configs || configs.length === 0) {
            return {
              service: 'Cron (Lembretes Motorista)',
              status: 'warning',
              details: 'Nenhum registro de execução encontrado ainda',
              last_check: checkedAt
            };
          }

          const lastCheck = new Date(configs[0].config_value);
          const diffMinutes = (Date.now() - lastCheck.getTime()) / (1000 * 60);
          const delayed = diffMinutes > 20;

          return {
            service: 'Cron (Lembretes Motorista)',
            status: delayed ? 'warning' : 'online',
            details: delayed
              ? `Última execução: ${lastCheck.toLocaleString('pt-BR')} (Atrasado há ${Math.round(diffMinutes)} min)`
              : `Última execução: ${lastCheck.toLocaleString('pt-BR')}`,
            last_check: checkedAt
          };
        } catch (e) {
          return {
            service: 'Cron (Lembretes Motorista)',
            status: 'error',
            details: `Erro ao verificar config: ${e.message}`,
            last_check: checkedAt
          };
        }
      })()
    ]);

    const services = [
      {
        service: 'WhatsApp (Z-API)',
        status: zApiUrl && zApiToken && zApiInstance ? 'online' : 'error',
        details: zApiUrl && zApiToken && zApiInstance
          ? 'Credenciais principais configuradas'
          : 'Configurações de ambiente ausentes (URL, Key ou Instance)',
        last_check: checkedAt
      },
      {
        service: 'Twilio (Voz/SMS)',
        status: twilioSid && twilioToken ? 'online' : 'warning',
        details: twilioSid && twilioToken
          ? 'Credenciais configuradas'
          : 'Credenciais não configuradas',
        last_check: checkedAt
      },
      {
        service: 'Email (Resend)',
        status: resendKey && resendFrom ? 'online' : 'warning',
        details: resendKey && resendFrom
          ? 'Credenciais configuradas'
          : 'API Key ou remetente não configurado',
        last_check: checkedAt
      },
      cronResult,
      {
        service: 'Google Maps API',
        status: mapsKey ? 'online' : 'error',
        details: mapsKey ? 'Chave configurada' : 'Chave não configurada (Geocoding/Places podem falhar)',
        last_check: checkedAt
      }
    ];

    return Response.json({
      success: true,
      services,
      checked_at: checkedAt
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});