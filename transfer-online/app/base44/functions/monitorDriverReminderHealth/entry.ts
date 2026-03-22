import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  let base44;

  try {
    base44 = createClientFromRequest(req);
    const now = new Date();
    const maxStalenessMinutes = 12;

    const configs = await base44.asServiceRole.entities.AppConfig.filter(
      { config_key: 'last_reminder_check' },
      undefined,
      1
    );

    const config = configs?.[0] || null;
    const lastCheckValue = config?.config_value || null;
    const lastCheckDate = lastCheckValue ? new Date(lastCheckValue) : null;
    const ageMinutes = lastCheckDate ? (now.getTime() - lastCheckDate.getTime()) / 60000 : null;

    if (lastCheckDate && ageMinutes <= maxStalenessMinutes) {
      return Response.json({
        success: true,
        healthy: true,
        last_check: lastCheckDate.toISOString(),
        age_minutes: ageMinutes
      });
    }

    await base44.asServiceRole.entities.IntegrationLog.create({
      service_name: 'Auto - Driver Reminders Watchdog',
      action: 'health_check',
      status: 'warning',
      message: 'A rotina principal de lembretes está defasada.',
      metadata: {
        previous_last_check: lastCheckValue,
        previous_age_minutes: ageMinutes
      },
      executed_at: now.toISOString()
    });

    return Response.json({
      success: true,
      healthy: false,
      previous_last_check: lastCheckValue,
      previous_age_minutes: ageMinutes
    });
  } catch (error) {
    if (base44) {
      try {
        await base44.asServiceRole.entities.IntegrationLog.create({
          service_name: 'Auto - Driver Reminders Watchdog',
          action: 'health_check',
          status: 'error',
          message: error.message,
          metadata: {
            stack: error.stack || null
          },
          executed_at: new Date().toISOString()
        });
      } catch (_) {}
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
});